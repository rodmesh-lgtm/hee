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
  const plan = await db.businessPlan.upsert({
    where: { code: "FREE" },
    update: { isActive: true },
    create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
  });
  const user = await db.user.create({
    data: {
      name: "Dashboard Functional Audit",
      email: `dashboard-audit-${suffix}@hee.test`,
      passwordHash: "rc-only",
      emailVerifiedAt: new Date(),
    },
  });
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      planId: plan.id,
      name: "منشأة تدقيق اللوحة",
      slug: `dashboard-audit-${suffix}`,
      businessType: "خدمات أعمال",
      shortDescription: "منشأة لاختبار وظائف لوحة التحكم",
      phone: "0555000022",
      whatsapp: "966555000022",
      city: "الرياض",
      onboardingCompleted: true,
    },
  });
  const token = crypto.randomUUID();
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return { userId: user.id, businessId: business.id, token };
}

async function cleanup(fixture: Fixture) {
  await db.analyticsEvent.deleteMany({ where: { businessId: fixture.businessId } });
  await db.contactPerson.deleteMany({ where: { businessId: fixture.businessId } });
  await db.department.deleteMany({ where: { businessId: fixture.businessId } });
  await db.branch.deleteMany({ where: { businessId: fixture.businessId } });
  await db.socialLink.deleteMany({ where: { businessId: fixture.businessId } });
  await db.workingHours.deleteMany({ where: { businessId: fixture.businessId } });
  await db.galleryItem.deleteMany({ where: { businessId: fixture.businessId } });
  await db.offer.deleteMany({ where: { businessId: fixture.businessId } });
  await db.booking.deleteMany({ where: { businessId: fixture.businessId } });
  await db.orderItem.deleteMany({ where: { order: { businessId: fixture.businessId } } });
  await db.order.deleteMany({ where: { businessId: fixture.businessId } });
  await db.customer.deleteMany({ where: { businessId: fixture.businessId } });
  await db.product.deleteMany({ where: { businessId: fixture.businessId } });
  await db.category.deleteMany({ where: { businessId: fixture.businessId } });
  await db.service.deleteMany({ where: { businessId: fixture.businessId } });
  await db.subscription.deleteMany({ where: { businessId: fixture.businessId } });
  await db.business.delete({ where: { id: fixture.businessId } });
  await db.session.deleteMany({ where: { userId: fixture.userId } });
  await db.authIdentity.deleteMany({ where: { userId: fixture.userId } });
  await db.user.delete({ where: { id: fixture.userId } });
}

test.describe.serial("customer dashboard functional surface", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for dashboard functional workflow");
    pool = new Pool({ connectionString, max: 3 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("every primary customer dashboard destination renders its real controls", async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await seed();
    await page.context().addCookies([{ name: "hee_session", value: fixture.token, url: baseUrl }]);

    try {
      const routes = [
        { path: "/dashboard", text: "منشأة تدقيق اللوحة", control: 'a[href="/dashboard/my-page"]' },
        { path: "/dashboard/my-page", text: "صفحتي", control: 'input[aria-label="اسم المنشأة"]' },
        { path: "/dashboard/digital-identity", text: "الهوية الرقمية", control: 'input[name="profileFile"]' },
        { path: "/dashboard/inbox", text: "الطلبات والحجوزات", control: 'a[href^="tel:"]', optionalControl: true },
        { path: "/dashboard/branding", text: "المظهر", control: 'input[name="logoFile"]' },
        { path: "/dashboard/directory", text: "الفروع والفريق", control: 'button:has-text("إضافة فرع")' },
        { path: "/dashboard/analytics", text: "الأداء", control: 'a[href*="period="]' },
        { path: "/dashboard/support", text: "الدعم والمساعدة", control: 'button:has-text("إرسال الطلب")' },
        { path: "/dashboard/settings", text: "الحساب والباقات", control: 'a[href="/dashboard/billing/manage"]' },
      ];

      for (const route of routes) {
        const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "domcontentloaded" });
        expect(response?.ok(), `${route.path} should return a successful response`).toBe(true);
        await expect(page.locator(`[data-dashboard-path="${route.path}"]`)).toBeVisible();
        await expect(page.getByText(route.text, { exact: true }).first()).toBeVisible();
        await expect(page.locator("body")).not.toContainText("Application error");
        if (!route.optionalControl) await expect(page.locator(route.control).first()).toBeVisible();
      }

      await page.goto(`${baseUrl}/dashboard/digital-identity`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("الهوية الرقمية", { exact: true }).first()).toBeVisible();
      await expect(page.getByText("بطاقة الأعمال الرقمية", { exact: true })).toBeVisible();
      await expect(page.getByText("توقيع البريد", { exact: true })).toBeVisible();

      await page.goto(`${baseUrl}/dashboard/directory`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("button", { name: "إضافة فرع" })).toBeVisible();
      await expect(page.getByRole("button", { name: "إضافة عضو" })).toBeVisible();

      await page.goto(`${baseUrl}/dashboard/support`, { waitUntil: "domcontentloaded" });
      await expect(page.locator('input[name="subject"]')).toBeVisible();
      await expect(page.locator('textarea[name="message"]')).toBeVisible();

      await page.goto(`${baseUrl}/dashboard/settings`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: "إدارة الاشتراك والفوترة" })).toBeVisible();
      await expect(page.getByRole("link", { name: "تنزيل نسخة من البيانات" })).toBeVisible();
    } finally {
      await cleanup(fixture);
    }
  });
});
