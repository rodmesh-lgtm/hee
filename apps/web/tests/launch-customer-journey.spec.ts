import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

async function cleanupByEmail(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return;
  const businesses = await db.business.findMany({ where: { ownerId: user.id }, select: { id: true } });
  const businessIds = businesses.map((business) => business.id);
  if (businessIds.length) {
    await db.analyticsEvent.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.contactPerson.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.department.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.branch.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.socialLink.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.workingHours.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.galleryItem.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.offer.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.booking.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.orderItem.deleteMany({ where: { order: { businessId: { in: businessIds } } } });
    await db.order.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.customer.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.product.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.category.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.service.deleteMany({ where: { businessId: { in: businessIds } } });
    await db.subscription.deleteMany({ where: { businessId: { in: businessIds } } });
    for (const businessId of businessIds) await db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "businessId" = ${businessId}`;
    await db.business.deleteMany({ where: { id: { in: businessIds } } });
  }
  await db.session.deleteMany({ where: { userId: user.id } });
  await db.authIdentity.deleteMany({ where: { userId: user.id } });
  await db.$executeRaw`DELETE FROM "LegalConsent" WHERE "userId" = ${user.id}`;
  await db.user.delete({ where: { id: user.id } });
}

function horizontalOverflow(page: import("@playwright/test").Page) { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }

test.describe.serial("launch customer journey", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for launch customer journey");
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });
  test.afterAll(async () => { await db?.$disconnect(); });

  test("registers, onboards, uses mobile dashboard, publishes, shares, and signs back in", async ({ browser }) => {
    test.setTimeout(180_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `launch-${suffix}@hee.test`;
    const password = "Launch#2026a";
    const slug = `launch-${suffix}`;
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const consoleErrors: string[] = [];
    page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
    page.on("pageerror", (error) => consoleErrors.push(error.message));

    try {
      await test.step("real registration creates account and legal consent", async () => {
        await page.goto(`${baseUrl}/register`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "إنشاء حساب" })).toBeVisible();
        await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2);
        await page.getByLabel("الاسم الكامل").fill("عميل إطلاق HEE");
        await page.getByLabel("البريد الإلكتروني").fill(email);
        await page.locator('input[name="password"]').fill(password);
        await page.locator('input[name="confirmPassword"]').fill(password);
        await page.getByRole("checkbox").check();
        await page.getByRole("button", { name: "إنشاء الحساب والمتابعة" }).click();
        await page.waitForURL("**/onboarding", { timeout: 20_000 });
        const user = await db.user.findUnique({ where: { email }, select: { id: true } });
        expect(user?.id).toBeTruthy();
        const consentRows = user ? await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "LegalConsent" WHERE "userId" = ${user.id}` : [];
        expect(Number(consentRows[0]?.count ?? 0)).toBe(1);
      });

      await test.step("onboarding creates a private Free business", async () => {
        await expect(page.getByRole("heading", { name: "صفحتك تبدأ من هنا" })).toBeVisible();
        await page.getByLabel("اسم المنشأة").fill("منشأة رحلة الإطلاق");
        await page.getByLabel("نبذة قصيرة").fill("منشأة تجريبية للتحقق من رحلة العميل الكاملة قبل الإطلاق.");
        await page.getByRole("button", { name: "متابعة" }).click();
        await expect(page.getByRole("heading", { name: "الرابط والتواصل" })).toBeVisible();
        await page.getByLabel("الرابط بالإنجليزية").fill(slug);
        await page.getByLabel("واتساب").fill("966555000077");
        await page.getByLabel("المدينة").fill("الرياض");
        await page.getByRole("button", { name: /إنشاء الصفحة/ }).click();
        await page.waitForURL("**/dashboard?welcome=1", { timeout: 20_000 });
        const user = await db.user.findUnique({ where: { email }, select: { id: true } });
        const business = user ? await db.business.findFirst({ where: { ownerId: user.id }, include: { plan: true } }) : null;
        expect(business?.slug).toBe(slug);
        expect(business?.plan?.code).toBe("FREE");
        expect(business?.isPublished).toBe(false);
        expect(business?.onboardingCompleted).toBe(true);
      });

      await test.step("mobile dashboard drawer and thumb navigation are accessible", async () => {
        await expect(page.getByRole("heading", { name: "منشأة رحلة الإطلاق" })).toBeVisible();
        await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2);
        const quickNav = page.getByRole("navigation", { name: "التنقل السريع" });
        await expect(quickNav).toBeVisible();
        await expect(quickNav.getByRole("link", { name: "الرئيسية" })).toHaveAttribute("aria-current", "page");
        await expect(quickNav.getByRole("link", { name: "صفحتي" })).toBeVisible();
        await expect(quickNav.getByRole("link", { name: "الطلبات" })).toBeVisible();
        const menuButton = page.locator("#hee-dashboard-mobile-menu-button");
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await menuButton.click();
        await expect(menuButton).toHaveAttribute("aria-expanded", "true");
        const drawer = page.getByRole("dialog", { name: "قائمة لوحة التحكم" });
        await expect(drawer).toBeVisible();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
        await page.keyboard.press("Escape");
        await expect(menuButton).toHaveAttribute("aria-expanded", "false");
        await expect(drawer).toBeHidden();
        await expect(menuButton).toBeFocused();
        expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
      });

      await test.step("last mobile edit survives immediate navigation", async () => {
        const quickNav = page.getByRole("navigation", { name: "التنقل السريع" });
        await quickNav.getByRole("link", { name: "صفحتي" }).click();
        await page.waitForURL("**/dashboard/my-page");
        await page.getByLabel("المدينة").fill("جدة");
        await quickNav.getByRole("link", { name: "الرئيسية" }).click();
        await page.waitForURL(/\/dashboard(?:\?.*)?$/);
        const user = await db.user.findUnique({ where: { email }, select: { id: true } });
        expect(user?.id).toBeTruthy();
        await expect.poll(async () => (user ? await db.business.findFirst({ where: { ownerId: user.id }, select: { city: true } }) : null)?.city, { timeout: 20_000 }).toBe("جدة");
      });

      await test.step("branding uploads are clearly labeled on mobile", async () => {
        await page.goto(`${baseUrl}/dashboard/branding`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "المظهر" })).toBeVisible();
        const logoInput = page.getByLabel("شعار المنشأة");
        const coverInput = page.getByLabel("صورة الغلاف");
        await expect(logoInput).toBeVisible();
        await expect(coverInput).toBeVisible();
        await expect(logoInput).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif");
        await expect(coverInput).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif");
        await expect(page.getByText(/الأنواع المقبولة: JPG/)).toBeVisible();
        await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2);
      });

      await test.step("customer adds first service and publishes the page", async () => {
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
        await page.getByRole("button", { name: "نشر الصفحة" }).click();
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
        const shareButton = page.getByRole("button", { name: "مشاركة الصفحة" });
        const box = await shareButton.boundingBox();
        expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
        await shareButton.click();
        await expect(page.getByText("تم نسخ رابط الصفحة")).toBeVisible();
      });

      await test.step("owner can share published page and safely cancel unpublish", async () => {
        await page.goto(`${baseUrl}/dashboard/share`, { waitUntil: "domcontentloaded" });
        await page.waitForURL("**/dashboard/my-page#share", { timeout: 20_000 });
        await page.evaluate(() => {
          Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
          Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } });
        });
        const ownerShare = page.getByRole("button", { name: "مشاركة الرابط" });
        const ownerShareBox = await ownerShare.boundingBox();
        expect(ownerShareBox?.height ?? 0).toBeGreaterThanOrEqual(44);
        await ownerShare.click();
        await expect(page.getByText("تم نسخ رابط صفحتك.")).toBeVisible();

        const cancelUnpublish = page.getByRole("button", { name: "إلغاء النشر" });
        const cancelBox = await cancelUnpublish.boundingBox();
        expect(cancelBox?.height ?? 0).toBeGreaterThanOrEqual(44);
        page.once("dialog", async (dialog) => dialog.dismiss());
        await cancelUnpublish.click();
        const user = await db.user.findUnique({ where: { email }, select: { id: true } });
        const published = user ? await db.business.findFirst({ where: { ownerId: user.id }, select: { isPublished: true } }) : null;
        expect(published?.isPublished).toBe(true);
      });

      await test.step("logout protects dashboard and password login restores access", async () => {
        await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
        const moreButton = page.locator("#hee-dashboard-mobile-more-button");
        await moreButton.click();
        const drawer = page.getByRole("dialog", { name: "قائمة لوحة التحكم" });
        await drawer.getByRole("button", { name: "تسجيل الخروج" }).click();
        await page.waitForURL(`${baseUrl}/`, { timeout: 20_000 });
        await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
        await page.waitForURL("**/login", { timeout: 20_000 });
        await page.getByLabel("البريد الإلكتروني").fill(email);
        await page.locator('input[name="password"]').fill(password);
        await page.getByRole("button", { name: "تسجيل الدخول" }).click();
        await page.waitForURL("**/dashboard", { timeout: 20_000 });
        await expect(page.getByRole("heading", { name: "منشأة رحلة الإطلاق" })).toBeVisible();
      });
      expect(consoleErrors).toEqual([]);
    } finally {
      await page.close();
      await cleanupByEmail(email);
    }
  });
});
