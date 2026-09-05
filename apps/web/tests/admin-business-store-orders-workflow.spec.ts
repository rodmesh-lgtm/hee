import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";
let pool: Pool;
let db: PrismaClient;

type Fixture = { adminId: string; adminToken: string; ownerId: string; businessId: string; orderId: string };

async function seed(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const admin = await db.user.upsert({ where: { email: adminEmail }, update: { name: "RC Platform Admin", deletedAt: null }, create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
  const adminToken = crypto.randomUUID();
  await db.session.create({ data: { token: adminToken, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const free = await db.businessPlan.upsert({ where: { code: "FREE" }, update: { isActive: true }, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true } });
  const owner = await db.user.create({ data: { name: "RC Store Order Owner", email: `rc-store-order-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: free.id, name: `منشأة طلب مركزي ${suffix}`, slug: `rc-admin-order-${suffix}`, businessType: "خدمات أعمال", onboardingCompleted: true, logoUrl: "/images/logo.png" } });
  const order = await db.businessStoreOrder.create({ data: { businessId: business.id, idempotencyKey: `admin-order-${suffix}`, businessNameSnapshot: business.name, businessSlugSnapshot: business.slug, publicUrlSnapshot: `/${business.slug}`, logoUrlSnapshot: business.logoUrl, primaryColorSnapshot: business.primaryColor, identitySnapshot: { businessId: business.id, name: business.name }, customizationSnapshot: {}, shippingName: "مستلم اختبار", shippingPhone: "0500000000", shippingAddressLine1: "عنوان اختبار", shippingCity: "جدة" } });
  await db.businessStoreOrderItem.create({ data: { orderId: order.id, sku: "rc-admin-order-item", nameSnapshot: "منتج اختبار الطلبات", unitPrice: 12345, quantity: 2, lineTotal: 24690, customizationSnapshot: { engraving: "RC" } } });
  await db.businessStoreOrder.update({ where: { id: order.id }, data: { subtotal: 24690, total: 24690 } });
  await db.businessStoreOrder.update({ where: { id: order.id }, data: { status: "submitted", submittedAt: new Date() } });
  await db.businessStoreOrder.update({ where: { id: order.id }, data: { paymentStatus: "paid", paidAt: new Date(), paymentProvider: "rc-provider", providerPaymentId: `rc-payment-${suffix}` } });
  return { adminId: admin.id, adminToken, ownerId: owner.id, businessId: business.id, orderId: order.id };
}

test.describe.serial("central admin Business Store orders", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    if (!String(process.env.HEE_ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).includes(adminEmail)) throw new Error(`HEE_ADMIN_EMAILS must include ${adminEmail}`);
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });
  test.afterAll(async () => { await db?.$disconnect(); await pool?.end(); });

  test("admin can perform only a paid guarded transition and it is audited", async ({ page }) => {
    test.setTimeout(120_000);
    const f = await seed();
    try {
      await page.context().addCookies([{ name: "hee_session", value: f.adminToken, url: baseUrl }]);
      await page.goto(`${baseUrl}/admin/store-orders?q=${encodeURIComponent(f.orderId)}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "مركز تشغيل طلبات المتجر" })).toBeVisible();
      await expect(page.getByText(f.orderId, { exact: true })).toBeVisible();
      await page.getByRole("link", { name: "فتح" }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/store-orders/${f.orderId}`));
      const transition = page.locator("form").filter({ hasText: "submitted → processing" });
      await transition.getByPlaceholder("ملاحظة تشغيلية اختيارية").fill("بدء التنفيذ بعد إثبات الدفع");
      await transition.getByRole("button", { name: "تنفيذ الانتقال" }).click();
      await page.waitForURL(`**/admin/store-orders/${f.orderId}?result=updated`);
      await expect(page.getByRole("status")).toContainText("تم تحديث حالة الطلب");

      const changed = await db.businessStoreOrder.findUniqueOrThrow({ where: { id: f.orderId }, select: { status: true, paymentStatus: true } });
      expect(changed).toEqual({ status: "processing", paymentStatus: "paid" });
      expect(await db.billingPayment.count({ where: { businessId: f.businessId } })).toBe(0);
      const audits = await db.$queryRaw<Array<{ fromStatus: string; toStatus: string; paymentStatus: string; note: string | null }>>`SELECT "fromStatus","toStatus","paymentStatus","note" FROM "BusinessStoreOrderAudit" WHERE "orderId"=${f.orderId}`;
      expect(audits).toContainEqual({ fromStatus: "submitted", toStatus: "processing", paymentStatus: "paid", note: "بدء التنفيذ بعد إثبات الدفع" });

      await db.businessStoreOrder.update({ where: { id: f.orderId }, data: { paymentStatus: "refunded" } });
      await expect(db.businessStoreOrder.update({ where: { id: f.orderId }, data: { status: "shipped" } })).rejects.toThrow(/before payment is paid/);
    } finally {
      // Submitted/processing order lines are deliberately immutable, so this RC-only
      // fixture is left in the ephemeral CI database and only its admin session is removed.
      await db.session.deleteMany({ where: { token: f.adminToken } });
    }
  });
});
