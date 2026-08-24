import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
async function cleanupByEmail(email: string) {
  const user = await db.user.findUnique({ where: { email }, select: { id: true } }); if (!user) return;
  const businesses = await db.business.findMany({ where: { ownerId: user.id }, select: { id: true } }); const businessIds = businesses.map((b) => b.id);
  if (businessIds.length) {
    await db.analyticsEvent.deleteMany({ where: { businessId: { in: businessIds } } }); await db.contactPerson.deleteMany({ where: { businessId: { in: businessIds } } }); await db.department.deleteMany({ where: { businessId: { in: businessIds } } }); await db.branch.deleteMany({ where: { businessId: { in: businessIds } } }); await db.socialLink.deleteMany({ where: { businessId: { in: businessIds } } }); await db.workingHours.deleteMany({ where: { businessId: { in: businessIds } } }); await db.galleryItem.deleteMany({ where: { businessId: { in: businessIds } } }); await db.offer.deleteMany({ where: { businessId: { in: businessIds } } }); await db.booking.deleteMany({ where: { businessId: { in: businessIds } } }); await db.orderItem.deleteMany({ where: { order: { businessId: { in: businessIds } } } }); await db.order.deleteMany({ where: { businessId: { in: businessIds } } }); await db.customer.deleteMany({ where: { businessId: { in: businessIds } } }); await db.product.deleteMany({ where: { businessId: { in: businessIds } } }); await db.category.deleteMany({ where: { businessId: { in: businessIds } } }); await db.service.deleteMany({ where: { businessId: { in: businessIds } } }); await db.subscription.deleteMany({ where: { businessId: { in: businessIds } } });
    for (const businessId of businessIds) await db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "businessId" = ${businessId}`; await db.business.deleteMany({ where: { id: { in: businessIds } } });
  }
  await db.oAuthState.deleteMany({ where: { provider: "email-verification", nonce: user.id } }); await db.session.deleteMany({ where: { userId: user.id } }); await db.authIdentity.deleteMany({ where: { userId: user.id } }); await db.$executeRaw`DELETE FROM "LegalConsent" WHERE "userId" = ${user.id}`; await db.user.delete({ where: { id: user.id } });
}
function horizontalOverflow(page: import("@playwright/test").Page) { return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
async function waitForMainFrameQuiescence(page: import("@playwright/test").Page) {
  // A Next.js server action may deliver its POST response before the client applies
  // the final same-route navigation. Require a quiet main-frame window before
  // starting an unrelated navigation so tests never race a still-pending redirect.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const navigation = await page.waitForEvent("framenavigated", {
      predicate: (frame) => frame === page.mainFrame(),
      timeout: 1_500,
    }).catch(() => null);
    if (!navigation) return;
    await page.waitForLoadState("domcontentloaded");
  }
  throw new Error("main frame did not become navigation-quiescent");
}

test.describe.serial("launch customer journey", () => {
  test.beforeAll(async () => { const connectionString = String(process.env.DATABASE_URL ?? "").trim(); if (!connectionString) throw new Error("DATABASE_URL is required for launch customer journey"); pool = new Pool({ connectionString, max: 4 }); db = new PrismaClient({ adapter: new PrismaPg(pool) }); });
  test.afterAll(async () => { await db?.$disconnect(); await pool?.end(); });
  test("registers, verifies email, onboards, uses mobile dashboard, publishes, shares, and signs back in", async ({ browser }) => {
    test.setTimeout(210_000); const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const email = `launch-${suffix}@hee.test`; const password = "Launch#2026a"; const slug = `launch-${suffix}`; const page = await browser.newPage({ viewport: { width: 390, height: 844 } }); const consoleErrors: string[] = []; page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); }); page.on("pageerror", (e) => consoleErrors.push(e.message));
    try {
      await test.step("real registration creates an unverified account and legal consent", async () => { await page.goto(`${baseUrl}/register`, { waitUntil: "domcontentloaded" }); await expect(page.getByRole("heading", { name: "إنشاء حساب" })).toBeVisible(); await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2); await page.getByLabel("الاسم الكامل").fill("عميل إطلاق HEE"); await page.getByLabel("البريد الإلكتروني").fill(email); await page.locator('input[name="password"]').fill(password); await page.locator('input[name="confirmPassword"]').fill(password); await page.getByRole("checkbox").check(); await page.getByRole("button", { name: "إنشاء الحساب والمتابعة" }).click(); await page.waitForURL(/\/onboarding(?:\?email=verification-(?:sent|unavailable))?$/, { timeout: 20_000 }); const user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerifiedAt: true } }); expect(user?.id).toBeTruthy(); expect(user?.emailVerifiedAt).toBeNull(); const rows = user ? await db.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::bigint AS count FROM "LegalConsent" WHERE "userId" = ${user.id}` : []; expect(Number(rows[0]?.count ?? 0)).toBe(1); });
      await test.step("onboarding creates a private Free business", async () => { await expect(page.getByRole("heading", { name: "صفحتك تبدأ من هنا" })).toBeVisible(); await page.getByLabel("اسم المنشأة").fill("منشأة رحلة الإطلاق"); await page.getByLabel("نبذة قصيرة").fill("منشأة تجريبية للتحقق من رحلة العميل الكاملة قبل الإطلاق."); await page.getByRole("button", { name: "متابعة" }).click(); await expect(page.getByRole("heading", { name: "الرابط والتواصل" })).toBeVisible(); await page.getByLabel("الرابط بالإنجليزية").fill(slug); await page.getByLabel("واتساب").fill("966555000077"); await page.getByLabel("المدينة").fill("الرياض"); await page.getByRole("button", { name: /إنشاء الصفحة/ }).click(); await page.waitForURL("**/dashboard?welcome=1", { timeout: 20_000 }); const user = await db.user.findUnique({ where: { email }, select: { id: true } }); const business = user ? await db.business.findFirst({ where: { ownerId: user.id }, include: { plan: true } }) : null; expect(business?.slug).toBe(slug); expect(business?.plan?.code).toBe("FREE"); expect(business?.isPublished).toBe(false); expect(business?.onboardingCompleted).toBe(true); });
      await test.step("mobile dashboard drawer and thumb navigation are accessible", async () => { await expect(page.getByRole("heading", { name: "منشأة رحلة الإطلاق" })).toBeVisible(); await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2); const quickNav = page.getByRole("navigation", { name: "التنقل السريع" }); await expect(quickNav).toBeVisible(); await expect(quickNav.getByRole("link", { name: "الرئيسية" })).toHaveAttribute("aria-current", "page"); await expect(quickNav.getByRole("link", { name: "صفحتي" })).toBeVisible(); await expect(quickNav.getByRole("link", { name: "الطلبات" })).toBeVisible(); const menuButton = page.locator("#hee-dashboard-mobile-menu-button"); await menuButton.click(); const drawer = page.getByRole("dialog", { name: "قائمة لوحة التحكم" }); await expect(drawer).toBeVisible(); await page.keyboard.press("Escape"); await expect(drawer).toBeHidden(); });
      await test.step("last mobile edit survives immediate navigation", async () => { const quickNav = page.getByRole("navigation", { name: "التنقل السريع" }); await quickNav.getByRole("link", { name: "صفحتي" }).click(); await page.waitForURL("**/dashboard/my-page"); await page.getByLabel("المدينة").fill("جدة"); await quickNav.getByRole("link", { name: "الرئيسية" }).click(); await page.waitForURL(/\/dashboard(?:\?.*)?$/); const user = await db.user.findUnique({ where: { email }, select: { id: true } }); await expect.poll(async () => (user ? await db.business.findFirst({ where: { ownerId: user.id }, select: { city: true } }) : null)?.city, { timeout: 20_000 }).toBe("جدة"); });
      await test.step("branding uploads are clearly labeled on mobile", async () => { await page.goto(`${baseUrl}/dashboard/branding`, { waitUntil: "domcontentloaded" }); await expect(page.getByRole("heading", { name: "المظهر" })).toBeVisible(); const logoInput = page.getByLabel("شعار المنشأة"); const coverInput = page.getByLabel("صورة الغلاف"); await expect(logoInput).toBeVisible(); await expect(coverInput).toBeVisible(); await expect(logoInput).toHaveAttribute("accept", "image/jpeg,image/png,image/webp,image/gif"); await expect.poll(() => horizontalOverflow(page)).toBeLessThanOrEqual(2); });
      await test.step("publication is blocked until the mailbox proof is confirmed", async () => { await page.goto(`${baseUrl}/dashboard/my-page`, { waitUntil: "domcontentloaded" }); await page.getByRole("button", { name: "نشر الصفحة" }).click(); await expect(page.getByText("أكد ملكية بريد حسابك من «الحساب والباقات» قبل نشر الصفحة")).toBeVisible(); });
      await test.step("customer confirms the delivered email proof explicitly", async () => { const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } }); const rawToken = randomBytes(32).toString("hex"); await db.oAuthState.create({ data: { state: hashToken(rawToken), provider: "email-verification", nonce: user.id, redirectTo: email, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }); const response = await page.goto(`${baseUrl}/verify-email?token=${rawToken}`, { waitUntil: "domcontentloaded" }); expect(response?.headers()["cache-control"]).toContain("no-store"); await page.getByRole("button", { name: "تأكيد ملكية البريد" }).click(); await page.waitForURL("**/dashboard/settings?email=verified", { timeout: 20_000 }); await expect(page.getByText("البريد مؤكد")).toBeVisible(); });
      await test.step("customer adds first service and publishes the verified page", async () => {
        await page.goto(`${baseUrl}/dashboard/services`, { waitUntil: "domcontentloaded" });
        const addForm = page.getByRole("form", { name: "إضافة خدمة" });
        await addForm.getByLabel("اسم الخدمة").fill("خدمة رحلة الإطلاق");
        await addForm.getByRole("button", { name: "إضافة" }).click();
        await expect.poll(async () => { const user = await db.user.findUnique({ where: { email }, select: { id: true } }); if (!user) return 0; const business = await db.business.findFirst({ where: { ownerId: user.id }, select: { id: true } }); return business ? db.service.count({ where: { businessId: business.id, name: "خدمة رحلة الإطلاق", deletedAt: null } }) : 0; }, { timeout: 20_000 }).toBe(1);

        await page.goto(`${baseUrl}/dashboard/my-page`, { waitUntil: "domcontentloaded" });
        const publishResponse = page.waitForResponse((response) => {
          try {
            const url = new URL(response.url());
            return response.request().method() === "POST" && url.origin === new URL(baseUrl).origin && url.pathname === "/dashboard/my-page";
          } catch {
            return false;
          }
        }, { timeout: 20_000 });
        await page.getByRole("button", { name: "نشر الصفحة" }).click();
        const response = await publishResponse;
        expect(response.ok()).toBe(true);
        await expect(page.getByText("منشورة", { exact: true })).toBeVisible({ timeout: 20_000 });

        const user = await db.user.findUniqueOrThrow({ where: { email }, select: { id: true } });
        await expect.poll(async () => (await db.business.findFirst({ where: { ownerId: user.id }, select: { isPublished: true } }))?.isPublished, { timeout: 20_000 }).toBe(true);
        await waitForMainFrameQuiescence(page);

        await page.goto(`${baseUrl}/${slug}`, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { name: "منشأة رحلة الإطلاق" })).toBeVisible();
        await page.getByRole("button", { name: /خدماتنا/ }).click();
        await expect(page.getByText("خدمة رحلة الإطلاق")).toBeVisible();
      });
      await test.step("public share fallback gives clear mobile feedback", async () => { await page.evaluate(() => { Object.defineProperty(navigator, "share", { configurable: true, value: undefined }); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } }); }); const shareButton = page.getByRole("button", { name: "مشاركة الصفحة" }); await shareButton.click(); await expect(page.getByText("تم نسخ رابط الصفحة")).toBeVisible(); });
      await test.step("owner can share published page and safely cancel unpublish", async () => { await page.goto(`${baseUrl}/dashboard/share`, { waitUntil: "domcontentloaded" }); await page.waitForURL("**/dashboard/my-page#share", { timeout: 20_000 }); await page.evaluate(() => { Object.defineProperty(navigator, "share", { configurable: true, value: undefined }); Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } }); }); await page.getByRole("button", { name: "مشاركة الرابط" }).click(); await expect(page.getByText("تم نسخ رابط صفحتك.")).toBeVisible(); const cancel = page.getByRole("button", { name: "إلغاء النشر" }); page.once("dialog", async (d) => d.dismiss()); await cancel.click(); });
      await test.step("logout protects dashboard and password login restores access", async () => {
        await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
        await page.locator("#hee-dashboard-mobile-more-button").click();
        const logoutButton = page.getByRole("dialog", { name: "قائمة لوحة التحكم" }).getByRole("button", { name: "تسجيل الخروج" });
        const loggedOut = page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === "/", { timeout: 20_000 });
        await logoutButton.click({ noWaitAfter: true });
        await loggedOut;

        await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
        await page.waitForURL("**/login", { timeout: 20_000 });
        await page.getByLabel("البريد الإلكتروني").fill(email);
        await page.locator('input[name="password"]').fill(password);
        const signedIn = page.waitForURL((url) => url.origin === new URL(baseUrl).origin && url.pathname === "/dashboard", { timeout: 20_000 });
        await page.getByRole("button", { name: "تسجيل الدخول" }).click({ noWaitAfter: true });
        await signedIn;
      });
      expect(consoleErrors).toEqual([]);
    } finally { await page.close(); await cleanupByEmail(email); }
  });
});
