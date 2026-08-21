import { createHash, randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

test.describe.serial("email ownership verification", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("blocks publication, rejects stale email links, and consumes the current proof once", async ({ browser }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const originalEmail = `verify-${suffix}@example.invalid`;
    const currentEmail = `verify-current-${suffix}@example.invalid`;
    const slug = `verify-${suffix}`;
    const plan = await db.businessPlan.upsert({
      where: { code: "FREE" },
      update: { isActive: true },
      create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
    });
    const user = await db.user.create({
      data: { name: "Email Verification Owner", email: originalEmail, passwordHash: "test-only", emailVerifiedAt: null },
    });
    const business = await db.business.create({
      data: {
        ownerId: user.id,
        planId: plan.id,
        name: "منشأة تحقق البريد",
        slug,
        businessType: "خدمات",
        shortDescription: "اختبار ملكية بريد الحساب قبل النشر",
        whatsapp: "966555000099",
        city: "الرياض",
        onboardingCompleted: true,
        isPublished: false,
      },
    });
    const sessionToken = crypto.randomUUID();
    await db.session.create({ data: { token: sessionToken, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

    try {
      await page.context().addCookies([{ name: "hee_session", value: sessionToken, url: baseUrl }]);
      await page.goto(`${baseUrl}/dashboard/my-page`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "نشر الصفحة" }).click();
      await expect(page.getByText("أكد ملكية بريد حسابك من «الحساب والباقات» قبل نشر الصفحة")).toBeVisible();
      expect((await db.business.findUnique({ where: { id: business.id }, select: { isPublished: true } }))?.isPublished).toBe(false);

      const staleRawToken = randomBytes(32).toString("hex");
      const staleTokenHash = hashToken(staleRawToken);
      await db.oAuthState.create({
        data: { state: staleTokenHash, provider: "email-verification", nonce: user.id, redirectTo: originalEmail, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });
      await db.user.update({ where: { id: user.id }, data: { email: currentEmail } });
      await page.goto(`${baseUrl}/verify-email?token=${staleRawToken}`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "تأكيد ملكية البريد" }).click();
      await page.waitForURL("**/verify-email?status=invalid", { timeout: 20_000 });
      expect((await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt).toBeNull();
      expect(await db.oAuthState.count({ where: { state: staleTokenHash } })).toBe(0);

      const rawToken = randomBytes(32).toString("hex");
      const tokenHash = hashToken(rawToken);
      await db.oAuthState.create({
        data: { state: tokenHash, provider: "email-verification", nonce: user.id, redirectTo: currentEmail, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
      });

      const response = await page.goto(`${baseUrl}/verify-email?token=${rawToken}`, { waitUntil: "domcontentloaded" });
      expect(response?.headers()["x-robots-tag"]).toContain("noindex");
      expect(response?.headers()["cache-control"]).toContain("no-store");
      expect((await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt).toBeNull();
      expect(await db.oAuthState.count({ where: { state: tokenHash, provider: "email-verification" } })).toBe(1);

      await page.getByRole("button", { name: "تأكيد ملكية البريد" }).click();
      await page.waitForURL("**/dashboard/settings?email=verified", { timeout: 20_000 });
      const verifiedAt = (await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt;
      expect(verifiedAt).toBeTruthy();
      expect(await db.oAuthState.count({ where: { provider: "email-verification", nonce: user.id } })).toBe(0);
      await expect(page.getByText("البريد مؤكد")).toBeVisible();

      await page.goto(`${baseUrl}/dashboard/my-page`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "نشر الصفحة" }).click();
      await expect(page.getByText("منشورة", { exact: true })).toBeVisible({ timeout: 20_000 });
      expect((await db.business.findUnique({ where: { id: business.id }, select: { isPublished: true } }))?.isPublished).toBe(true);

      await page.goto(`${baseUrl}/verify-email?token=${rawToken}`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "تأكيد ملكية البريد" }).click();
      await page.waitForURL("**/verify-email?status=invalid", { timeout: 20_000 });
      await expect(page.getByText(/غير صالح أو انتهت صلاحيته/)).toBeVisible();
      expect((await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt?.getTime()).toBe(verifiedAt?.getTime());
    } finally {
      await page.close();
      await db.oAuthState.deleteMany({ where: { nonce: user.id } });
      await db.analyticsEvent.deleteMany({ where: { businessId: business.id } });
      await db.business.delete({ where: { id: business.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.authIdentity.deleteMany({ where: { userId: user.id } });
      await db.$executeRaw`DELETE FROM "LegalConsent" WHERE "userId" = ${user.id}`;
      await db.user.delete({ where: { id: user.id } });
    }
  });
});
