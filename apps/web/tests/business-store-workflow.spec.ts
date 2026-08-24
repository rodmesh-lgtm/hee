import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

type Fixture = { userId: string; businessId: string; token: string };

async function seed(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const free = await db.businessPlan.upsert({
    where: { code: "FREE" },
    update: { isActive: true },
    create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
  });
  const user = await db.user.create({
    data: {
      name: "Business Store Workflow",
      email: `business-store-${suffix}@hee.test`,
      passwordHash: "rc-only",
      emailVerifiedAt: new Date(),
    },
  });
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      planId: free.id,
      name: "منشأة متجر الأعمال",
      slug: `business-store-${suffix}`,
      businessType: "خدمات أعمال",
      onboardingCompleted: true,
      logoUrl: "/images/logo.png",
    },
  });
  const token = crypto.randomUUID();
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return { userId: user.id, businessId: business.id, token };
}

async function cleanup(fixture: Fixture) {
  const orders = await db.businessStoreOrder.findMany({ where: { businessId: fixture.businessId }, select: { id: true } });
  if (orders.length) await db.businessStoreOrderItem.deleteMany({ where: { orderId: { in: orders.map((order) => order.id) } } });
  await db.businessStoreOrder.deleteMany({ where: { businessId: fixture.businessId } });
  await db.business.delete({ where: { id: fixture.businessId } });
  await db.session.deleteMany({ where: { userId: fixture.userId } });
  await db.authIdentity.deleteMany({ where: { userId: fixture.userId } });
  await db.user.delete({ where: { id: fixture.userId } });
}

test.describe.serial("Business Store real draft workflow", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for Business Store workflow");
    pool = new Pool({ connectionString, max: 3 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("customer creates a server-authoritative draft and updates quantity without payment", async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await seed();
    await page.context().addCookies([{ name: "hee_session", value: fixture.token, url: baseUrl }]);

    try {
      const response = await page.goto(`${baseUrl}/dashboard/business-store`, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBe(true);
      await expect(page.getByText(/منتج متاح$/)).toBeVisible();

      const card = page.locator('[data-store-sku="desk-nameplate"]');
      await expect(card.getByText("لوحة اسم مكتبية للمدير", { exact: true })).toBeVisible();
      await card.getByRole("button", { name: "أضف لمسودة الطلب" }).click();
      await expect(page.locator("[data-store-draft-summary]")).toBeVisible();
      await expect(page.getByText("تمت إضافة المنتج إلى مسودة الطلب.", { exact: true })).toBeVisible();

      let orders = await db.businessStoreOrder.findMany({
        where: { businessId: fixture.businessId },
        include: { items: true },
      });
      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe("draft");
      expect(orders[0].paymentStatus).toBe("unpaid");
      expect(orders[0].providerPaymentId).toBeNull();
      expect(orders[0].items).toHaveLength(1);
      expect(orders[0].items[0].sku).toBe("desk-nameplate");
      expect(orders[0].items[0].unitPrice).toBe(12900);
      expect(orders[0].items[0].quantity).toBe(1);
      expect(orders[0].subtotal).toBe(12900);
      expect(orders[0].total).toBe(12900);

      await card.getByRole("button", { name: "زيادة لوحة اسم مكتبية للمدير" }).click();
      await expect(page.getByText("تم تحديث الكمية في مسودة الطلب.", { exact: true })).toBeVisible();

      orders = await db.businessStoreOrder.findMany({
        where: { businessId: fixture.businessId },
        include: { items: true },
      });
      expect(orders).toHaveLength(1);
      expect(orders[0].items).toHaveLength(1);
      expect(orders[0].items[0].quantity).toBe(2);
      expect(orders[0].items[0].lineTotal).toBe(25800);
      expect(orders[0].subtotal).toBe(25800);
      expect(orders[0].total).toBe(25800);
      expect(await db.billingPayment.count({ where: { businessId: fixture.businessId } })).toBe(0);

      const formattedSubtotal = new Intl.NumberFormat("ar-SA", {
        style: "currency",
        currency: "SAR",
        maximumFractionDigits: 0,
      }).format(258);
      await expect(page.locator("[data-store-subtotal]")).toContainText(formattedSubtotal);
    } finally {
      await cleanup(fixture);
    }
  });
});
