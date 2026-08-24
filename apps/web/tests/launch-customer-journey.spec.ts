import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createHash } from "node:crypto";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

function unique(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function horizontalOverflow(page: import("@playwright/test").Page) {
  return page.evaluate(() => Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth));
}

test.describe.serial("launch customer journey", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for launch journey");
    pool = new Pool({ connectionString, max: 3 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("registers, verifies email, onboards, uses mobile dashboard, publishes, shares, and signs back in", async ({ page }) => {
    test.setTimeout(180_000);
    const suffix = unique("launch");
    const email = `${suffix}@hee.test`;
    const password = "LaunchPass123!";
    const slug = suffix;
    let userId: string | null = null;
    let businessId: string | null = null;

    try {
      await test.step("customer registers with legal consent", async () => {
        await page.goto(`${baseUrl}/register`, { waitUntil: "domcontentloaded" });
        await page.locator('input[name="name"]').fill("عميل رحلة الإطلاق");
        await page.locator('input[name="email"]').fill(email);
        await page.locator('input[name="password"]').fill(password);
        await page.locator('input[name="confirmPassword"]').fill(password);
        await page.locator('input[name="acceptTerms"]').check();
        await page.locator('input[name="acceptPrivacy"]').check();
        await page.getByRole("button", { name: "إنشاء الحساب" }).click();
        await page.waitForURL("**/onboarding", { timeout: 20_000 });
        const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } });
        expect(user).toBeTruthy();
        userId = user!.id;
        expect(user!.emailVerifiedAt).toBeNull();
      });

      await test.step("customer creates the business profile", async () => {
        await page.locator('input[name="name"]').fill("منشأة رحلة الإطلاق");
        await page.locator('input[name="slug"]').fill(slug);
        await page.locator('input[name="businessType"]').fill("خدمات أعمال");
        await page.locator('input[name="phone"]').fill("0555000044");
        await page.locator('input[name="whatsapp"]').fill("966555000044");
        await page.locator('input[name="city"]').fill("الرياض");
        await page.locator('textarea[name="shortDescription"]').fill("هوية رقمية لاختبار رحلة العميل الكاملة");
        await page.getByRole("button", { name: "إنشاء الصفحة" }).click();
        await page.waitForURL("**/dashboard/my-page", { timeout: 20_000 });
        const business = await db.business.findFirst({ where: { ownerId: userId! }, select: { id: true } });
        expect(business).toBeTruthy();
        businessId = business!.id;
      });

      await test.step("mobile dashboard navigation works without horizontal overflow", async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
        await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2);
        await page.getByRole("button", { name: "القائمة" }).click();
        await expect(page.getByRole("dialog", { name: "قائمة لوحة التحكم" })).toBeVisible();
        await page.getByRole("dialog", { name: "قائمة لوحة التحكم" }).getByRole("link", { name: "الحساب والباقات" }).click();
        await page.waitForURL("**/dashboard/settings", { timeout: 20_000 });
        await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2);
      });

      await test.step("customer verifies mailbox ownership", async () => {
        const state = await db.oAuthState.findFirst({
          where: { userId: userId!, provider: "email-verification" },
          orderBy: { createdAt: "desc" },
          select: { stateHash: true },
        });
        expect(state?.stateHash).toBeTruthy();
        const token = `launch-verify-${crypto.randomUUID()}`;
        await db.oAuthState.updateMany({ where: { userId: userId!, provider: "email-verification" }, data: { stateHash: hashToken(token), expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
        await page.goto(`${baseUrl}/verify-email?token=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("button", { name: "تأكيد ملكية البريد" })).toBeVisible();
        expect((await db.user.findUnique({ where: { id: userId! }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt).toBeNull();
        await page.getByRole("button", { name: "تأكيد ملكية البريد" }).click();
        await page.waitForURL("**/dashboard/settings?email=verified", { timeout: 20_000 });
        await expect(page.getByText("البريد مؤكد")).toBeVisible();
        expect((await db.user.findUnique({ where: { id: userId! }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt).toBeTruthy();
      });

      await test.step("customer adds first service and publishes the verified page", async () => {
        await page.goto(`${baseUrl}/dashboard/services`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "الخدمات" })).toBeVisible();
        const addForm = page.getByRole("form", { name: "إضافة خدمة" });
        await expect(addForm.getByLabel("اسم الخدمة")).toBeVisible();
        await addForm.getByLabel("اسم الخدمة").fill("خدمة رحلة الإطلاق");
        await addForm.getByRole("button", { name: "إضافة" }).click();
        await expect.poll(async () => {
          const user = await db.user.findUnique({ where: { email }, select: { id: true } });
          if (!user) return 0;
          const business = await db.business.findFirst({ where: { ownerId: user.id }, select: { id: true } });
          return business ? db.service.count({ where: { businessId: business.id, name: "خدمة رحلة الإطلاق", deletedAt: null } }) : 0;
        }, { timeout: 20_000 }).toBe(1);

        await page.goto(`${baseUrl}/dashboard/my-page`, { waitUntil: "domcontentloaded" });
        const publishReload = page.waitForEvent("framenavigated", {
          predicate: (frame) => frame === page.mainFrame() && new URL(frame.url()).pathname === "/dashboard/my-page",
          timeout: 20_000,
        });
        await page.getByRole("button", { name: "نشر الصفحة" }).click();
        await publishReload;
        await page.waitForLoadState("domcontentloaded");
        await expect(page.getByText("منشورة", { exact: true })).toBeVisible({ timeout: 20_000 });
        await page.goto(`${baseUrl}/${slug}`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "منشأة رحلة الإطلاق" })).toBeVisible();
        await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2);
        await page.getByRole("button", { name: /خدماتنا/ }).click();
        await expect(page.getByText("خدمة رحلة الإطلاق")).toBeVisible();
      });

      await test.step("public share fallback gives clear mobile feedback", async () => {
        await page.evaluate(() => {
          Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
          Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } });
        });
        await page.goto(`${baseUrl}/dashboard/my-page`, { waitUntil: "domcontentloaded" });
        await page.getByRole("button", { name: "مشاركة" }).click();
        await expect(page.getByText("تم نسخ الرابط")).toBeVisible();
      });

      await test.step("customer logs out and signs back in", async () => {
        await page.getByRole("button", { name: "القائمة" }).click();
        await page.getByRole("dialog", { name: "قائمة لوحة التحكم" }).getByRole("button", { name: "تسجيل الخروج" }).click();
        await page.waitForURL("**/login", { timeout: 20_000 });
        await page.locator('input[name="email"]').fill(email);
        await page.locator('input[name="password"]').fill(password);
        await page.getByRole("button", { name: "تسجيل الدخول" }).click();
        await page.waitForURL("**/dashboard", { timeout: 20_000 });
        await expect(page.getByText("منشأة رحلة الإطلاق", { exact: true }).first()).toBeVisible();
      });
    } finally {
      if (businessId) {
        await db.analyticsEvent.deleteMany({ where: { businessId } });
        await db.contactPerson.deleteMany({ where: { businessId } });
        await db.department.deleteMany({ where: { businessId } });
        await db.branch.deleteMany({ where: { businessId } });
        await db.socialLink.deleteMany({ where: { businessId } });
        await db.workingHours.deleteMany({ where: { businessId } });
        await db.galleryItem.deleteMany({ where: { businessId } });
        await db.offer.deleteMany({ where: { businessId } });
        await db.booking.deleteMany({ where: { businessId } });
        await db.orderItem.deleteMany({ where: { order: { businessId } } });
        await db.order.deleteMany({ where: { businessId } });
        await db.customer.deleteMany({ where: { businessId } });
        await db.product.deleteMany({ where: { businessId } });
        await db.category.deleteMany({ where: { businessId } });
        await db.service.deleteMany({ where: { businessId } });
        await db.subscription.deleteMany({ where: { businessId } });
        await db.business.deleteMany({ where: { id: businessId } });
      }
      if (userId) {
        await db.session.deleteMany({ where: { userId } });
        await db.oAuthState.deleteMany({ where: { userId } });
        await db.authIdentity.deleteMany({ where: { userId } });
        await db.legalConsent.deleteMany({ where: { userId } });
        await db.user.deleteMany({ where: { id: userId } });
      }
    }
  });
});
