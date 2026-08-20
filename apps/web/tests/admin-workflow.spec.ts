import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";

let pool: Pool;
let db: PrismaClient;

type Seeded = {
  adminUserId: string;
  adminSessionToken: string;
  ownerUserId: string;
  ownerSessionToken: string;
  businessId: string;
  customerId: string;
  orderId: string;
  bookingId: string;
  slug: string;
};

async function seed(): Promise<Seeded> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: { name: "RC Platform Admin", deletedAt: null },
    create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only" },
  });
  await db.session.deleteMany({ where: { userId: admin.id } });
  const adminSessionToken = crypto.randomUUID();
  await db.session.create({ data: { token: adminSessionToken, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

  const plan = await db.businessPlan.upsert({
    where: { code: "FREE" },
    update: { isActive: true },
    create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
  });
  const owner = await db.user.create({ data: { name: "RC Customer Owner", email: `rc-customer-${suffix}@hee.test`, passwordHash: "rc-only" } });
  const ownerSessionToken = crypto.randomUUID();
  await db.session.create({ data: { token: ownerSessionToken, userId: owner.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

  const slug = `rc-admin-business-${suffix}`;
  const business = await db.business.create({
    data: {
      ownerId: owner.id,
      planId: plan.id,
      name: "منشأة عميل لوحة الإدارة",
      slug,
      businessType: "خدمات أعمال",
      businessCategory: "استشارات",
      city: "الرياض",
      district: "العليا",
      phone: "0555000042",
      email: `business-${suffix}@hee.test`,
      onboardingCompleted: true,
      isPublished: true,
      publishedAt: new Date(),
    },
  });
  const service = await db.service.create({ data: { businessId: business.id, name: "استشارة إدارية", price: 250, durationMinutes: 60 } });
  await db.product.create({ data: { businessId: business.id, name: "منتج إداري تجريبي", price: 75 } });
  const customer = await db.customer.create({ data: { businessId: business.id, name: "عميل نهائي تجريبي", phone: "0555000043" } });
  const order = await db.order.create({ data: { businessId: business.id, customerId: customer.id, orderType: "request", total: 75, status: "pending" } });
  await db.orderItem.create({ data: { orderId: order.id, name: "منتج إداري تجريبي", unitPrice: 75, quantity: 1, total: 75 } });
  const booking = await db.booking.create({ data: { businessId: business.id, customerId: customer.id, serviceId: service.id, bookingDate: "2026-08-25", bookingTime: "10:00", status: "confirmed" } });

  return { adminUserId: admin.id, adminSessionToken, ownerUserId: owner.id, ownerSessionToken, businessId: business.id, customerId: customer.id, orderId: order.id, bookingId: booking.id, slug };
}

async function cleanup(seeded: Seeded) {
  await db.$executeRaw`DELETE FROM "BookingDurationSnapshot" WHERE "bookingId" = ${seeded.bookingId}`;
  await db.analyticsEvent.deleteMany({ where: { businessId: seeded.businessId } });
  await db.orderItem.deleteMany({ where: { orderId: seeded.orderId } });
  await db.booking.deleteMany({ where: { businessId: seeded.businessId } });
  await db.order.deleteMany({ where: { businessId: seeded.businessId } });
  await db.customer.deleteMany({ where: { businessId: seeded.businessId } });
  await db.product.deleteMany({ where: { businessId: seeded.businessId } });
  await db.service.deleteMany({ where: { businessId: seeded.businessId } });
  await db.subscription.deleteMany({ where: { businessId: seeded.businessId } });
  await db.business.delete({ where: { id: seeded.businessId } });
  await db.session.deleteMany({ where: { userId: { in: [seeded.ownerUserId, seeded.adminUserId] } } });
  await db.authIdentity.deleteMany({ where: { userId: seeded.ownerUserId } });
  await db.user.delete({ where: { id: seeded.ownerUserId } });
  const adminBusinesses = await db.business.count({ where: { ownerId: seeded.adminUserId } });
  if (adminBusinesses === 0) await db.user.delete({ where: { id: seeded.adminUserId } }).catch(() => undefined);
}

async function setSession(page: import("@playwright/test").Page, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

test.describe.serial("platform admin workflow", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for admin workflow");
    if (!String(process.env.HEE_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(adminEmail)) {
      throw new Error(`HEE_ADMIN_EMAILS must include ${adminEmail}`);
    }
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("admin can inspect every customer business while a normal customer cannot access admin", async ({ page }) => {
    test.setTimeout(90_000);
    const seeded = await seed();
    try {
      await setSession(page, seeded.adminSessionToken);
      await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "إدارة المنصة" })).toBeVisible();
      const businessRow = page.getByRole("row").filter({ hasText: "منشأة عميل لوحة الإدارة" });
      await expect(businessRow).toBeVisible();
      await expect(businessRow.getByText(/1 منتج · 1 خدمة · 1 عميل/)).toBeVisible();
      await expect(businessRow.getByText(/1 طلب · 1 حجز/)).toBeVisible();

      await businessRow.getByRole("link", { name: "التفاصيل" }).click();
      await expect(page.getByRole("heading", { name: "منشأة عميل لوحة الإدارة" })).toBeVisible();
      await expect(page.getByText("RC Customer Owner", { exact: true })).toBeVisible();
      await expect(page.getByText("عميل نهائي تجريبي", { exact: true })).toBeVisible();
      await expect(page.getByText("استشارة إدارية", { exact: true })).toBeVisible();
      await expect(page.getByRole("link", { name: /فتح الصفحة العامة/ })).toHaveAttribute("href", `/${seeded.slug}`);

      await setSession(page, seeded.ownerSessionToken);
      const response = await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "إدارة المنصة" })).toHaveCount(0);

      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/dashboard/);
    } finally {
      await cleanup(seeded);
    }
  });
});
