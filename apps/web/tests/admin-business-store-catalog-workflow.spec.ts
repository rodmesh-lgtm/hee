import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";
let pool: Pool;
let db: PrismaClient;

type Fixture = { adminId: string; adminToken: string; ownerId: string; ownerToken: string; businessId: string; sku: string };

async function seed(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { name: "RC Platform Admin", deletedAt: null },
    create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: new Date() },
  });
  const adminToken = crypto.randomUUID();
  await db.session.create({ data: { token: adminToken, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const free = await db.businessPlan.upsert({ where: { code: "FREE" }, update: { isActive: true }, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true } });
  const owner = await db.user.create({ data: { name: "RC Store Owner", email: `rc-store-owner-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
  const ownerToken = crypto.randomUUID();
  await db.session.create({ data: { token: ownerToken, userId: owner.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: free.id, name: "منشأة اختبار الكتالوج", slug: `rc-store-${suffix}`, businessType: "خدمات أعمال", onboardingCompleted: true, logoUrl: "/images/logo.png" } });
  return { adminId: admin.id, adminToken, ownerId: owner.id, ownerToken, businessId: business.id, sku: `rc-central-product-${suffix}`.toLowerCase() };
}

async function setSession(page: import("@playwright/test").Page, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

async function cleanup(fixture: Fixture) {
  const orders = await db.businessStoreOrder.findMany({ where: { businessId: fixture.businessId }, select: { id: true } });
  if (orders.length) await db.businessStoreOrderItem.deleteMany({ where: { orderId: { in: orders.map((order) => order.id) } } });
  await db.businessStoreOrder.deleteMany({ where: { businessId: fixture.businessId } });
  await db.$executeRaw`DELETE FROM "BusinessStoreCatalogAudit" WHERE "productId" IN (SELECT "id" FROM "BusinessStoreCatalogProduct" WHERE "sku" = ${fixture.sku})`;
  await db.$executeRaw`DELETE FROM "BusinessStoreCatalogProduct" WHERE "sku" = ${fixture.sku}`;
  await db.business.delete({ where: { id: fixture.businessId } });
  await db.session.deleteMany({ where: { userId: { in: [fixture.adminId, fixture.ownerId] } } });
  await db.authIdentity.deleteMany({ where: { userId: fixture.ownerId } });
  await db.user.delete({ where: { id: fixture.ownerId } });
  const adminBusinesses = await db.business.count({ where: { ownerId: fixture.adminId } });
  const adminAudits = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "BusinessStoreCatalogAudit" WHERE "actorUserId"=${fixture.adminId}`;
  if (adminBusinesses === 0 && Number(adminAudits[0]?.count ?? 0) === 0) await db.user.delete({ where: { id: fixture.adminId } }).catch(() => undefined);
}

test.describe.serial("central admin Business Store catalog", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    if (!String(process.env.HEE_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(adminEmail)) throw new Error(`HEE_ADMIN_EMAILS must include ${adminEmail}`);
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });
  test.afterAll(async () => { await db?.$disconnect(); await pool?.end(); });

  test("admin-created product appears to customers with server price and disappears when deactivated", async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await seed();
    const productTitle = "منتج مركزي لاختبار RC";
    try {
      await setSession(page, fixture.adminToken);
      await page.goto(`${baseUrl}/admin/store-products`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "منتجات متجر الأعمال" })).toBeVisible();
      await page.getByLabel("SKU ثابت").fill(fixture.sku);
      await page.getByLabel("اسم المنتج", { exact: true }).first().fill(productTitle);
      await page.getByLabel("القسم", { exact: true }).first().fill("rc-products");
      await page.getByLabel("شارة مختصرة").fill("اختبار مركزي");
      await page.getByLabel("السعر (ر.س)", { exact: true }).first().fill("123.45");
      await page.getByLabel("أقصى كمية", { exact: true }).first().fill("7");
      await page.getByLabel("الترتيب", { exact: true }).first().fill("5");
      await page.getByLabel("الوصف", { exact: true }).first().fill("منتج اختبار يثبت أن إدارة HEE المركزية تتحكم في متجر جميع العملاء.");
      await page.getByRole("button", { name: "إنشاء ونشر المنتج" }).click();
      await page.waitForURL("**/admin/store-products?result=created", { timeout: 20_000 });
      await expect(page.getByRole("heading", { name: productTitle, exact: true })).toBeVisible();

      const rows = await db.$queryRaw<Array<{ id: string; unitPrice: number; maxQuantity: number; isActive: boolean }>>`SELECT "id","unitPrice","maxQuantity","isActive" FROM "BusinessStoreCatalogProduct" WHERE "sku"=${fixture.sku}`;
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ unitPrice: 12345, maxQuantity: 7, isActive: true });

      await setSession(page, fixture.ownerToken);
      await page.goto(`${baseUrl}/dashboard/business-store`, { waitUntil: "domcontentloaded" });
      const card = page.locator(`[data-store-sku="${fixture.sku}"]`);
      await expect(card.getByText(productTitle, { exact: true })).toBeVisible();
      await card.getByRole("button", { name: "أضف لمسودة الطلب" }).click();
      await expect(page.getByText("تمت إضافة المنتج إلى مسودة الطلب.", { exact: true })).toBeVisible();
      const order = await db.businessStoreOrder.findFirstOrThrow({ where: { businessId: fixture.businessId }, include: { items: true } });
      const line = order.items.find((item) => item.sku === fixture.sku);
      expect(line?.unitPrice).toBe(12345);
      expect(line?.lineTotal).toBe(12345);
      expect(await db.billingPayment.count({ where: { businessId: fixture.businessId } })).toBe(0);

      await setSession(page, fixture.adminToken);
      await page.goto(`${baseUrl}/admin/store-products`, { waitUntil: "domcontentloaded" });
      const productCard = page.locator("article").filter({ hasText: productTitle });
      await productCard.getByRole("button", { name: "إيقاف المنتج" }).click();
      await page.waitForURL("**/admin/store-products?result=deactivated", { timeout: 20_000 });
      const state = await db.$queryRaw<Array<{ isActive: boolean }>>`SELECT "isActive" FROM "BusinessStoreCatalogProduct" WHERE "sku"=${fixture.sku}`;
      expect(state[0]?.isActive).toBe(false);

      await setSession(page, fixture.ownerToken);
      await page.goto(`${baseUrl}/dashboard/business-store`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(productTitle, { exact: true })).toHaveCount(0);
      const audits = await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS "count" FROM "BusinessStoreCatalogAudit" WHERE "productId"=${rows[0].id}`;
      expect(Number(audits[0]?.count ?? 0)).toBeGreaterThanOrEqual(2);
    } finally {
      await cleanup(fixture);
    }
  });
});
