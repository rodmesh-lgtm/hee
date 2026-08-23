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

test.describe.serial("unverified email correction", () => {
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

  test("lets a password owner correct a mistyped unverified email and revokes old mailbox credentials", async ({ browser }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const wrongEmail = `wrong-${suffix}@example.invalid`;
    const correctedEmail = `corrected-${suffix}@example.invalid`;
    const occupiedEmail = `occupied-${suffix}@example.invalid`;
    const plan = await db.businessPlan.upsert({
      where: { code: "FREE" },
      update: { isActive: true },
      create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
    });
    const user = await db.user.create({
      data: { name: "Email Correction Owner", email: wrongEmail, passwordHash: "test-password-account", emailVerifiedAt: null },
    });
    const occupied = await db.user.create({
      data: { name: "Existing Email Owner", email: occupiedEmail, passwordHash: "test-password-account", emailVerifiedAt: new Date() },
    });
    const business = await db.business.create({
      data: {
        ownerId: user.id,
        planId: plan.id,
        name: "منشأة تصحيح البريد",
        slug: `email-correction-${suffix}`,
        businessType: "خدمات",
        whatsapp: "966555000077",
        onboardingCompleted: true,
      },
    });
    const sessionToken = crypto.randomUUID();
    await db.session.create({ data: { token: sessionToken, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

    const staleRaw = randomBytes(32).toString("hex");
    const staleHash = hashToken(staleRaw);
    const staleResetRaw = randomBytes(32).toString("hex");
    const staleResetHash = hashToken(staleResetRaw);
    await db.oAuthState.createMany({
      data: [
        {
          state: staleHash,
          provider: "email-verification",
          nonce: user.id,
          redirectTo: wrongEmail,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
        {
          state: staleResetHash,
          provider: "password-reset",
          nonce: user.id,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      ],
    });

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    try {
      await page.context().addCookies([{ name: "hee_session", value: sessionToken, url: baseUrl }]);
      await page.goto(`${baseUrl}/dashboard/settings`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText(wrongEmail)).toBeVisible();
      await expect(page.getByText("تعديل البريد قبل التأكيد")).toBeVisible();

      await page.locator('input[name="email"]').fill(occupiedEmail);
      await page.getByRole("button", { name: "تحديث البريد" }).click();
      await expect(page.getByRole("alert").filter({ hasText: "تعذر استخدام هذا البريد" })).toBeVisible({ timeout: 20_000 });
      expect((await db.user.findUnique({ where: { id: user.id }, select: { email: true } }))?.email).toBe(wrongEmail);
      expect(await db.oAuthState.count({ where: { state: { in: [staleHash, staleResetHash] } } })).toBe(2);

      await page.locator('input[name="email"]').fill(correctedEmail);
      await page.getByRole("button", { name: "تحديث البريد" }).click();
      await expect(page.getByRole("status").filter({ hasText: "تم تحديث البريد" })).toBeVisible({ timeout: 20_000 });

      const changed = await db.user.findUnique({ where: { id: user.id }, select: { email: true, emailVerifiedAt: true } });
      expect(changed?.email).toBe(correctedEmail);
      expect(changed?.emailVerifiedAt).toBeNull();
      expect(await db.oAuthState.count({ where: { state: { in: [staleHash, staleResetHash] } } })).toBe(0);

      // The old email-verification link must remain unusable after the account email changes.
      const stalePage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await stalePage.goto(`${baseUrl}/verify-email?token=${staleRaw}`, { waitUntil: "domcontentloaded" });
        await stalePage.getByRole("button", { name: "تأكيد ملكية البريد" }).click();
        await stalePage.waitForURL("**/verify-email?status=invalid", { timeout: 20_000 });
      } finally {
        await stalePage.close();
      }

      // The password-reset credential delivered to the mistyped mailbox is revoked too.
      const resetPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await resetPage.goto(`${baseUrl}/reset-password?token=${staleResetRaw}`, { waitUntil: "domcontentloaded" });
        await resetPage.locator('input[name="password"]').fill("Valid#Pass123");
        await resetPage.locator('input[name="confirmPassword"]').fill("Valid#Pass123");
        await resetPage.getByRole("button", { name: /تعيين|حفظ|تحديث/ }).click();
        await expect(resetPage.getByText(/انتهت صلاحية رابط الاستعادة|غير صالح/)).toBeVisible({ timeout: 20_000 });
      } finally {
        await resetPage.close();
      }
      expect((await db.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } }))?.emailVerifiedAt).toBeNull();
    } finally {
      await page.close();
      await db.oAuthState.deleteMany({ where: { nonce: user.id } });
      await db.business.delete({ where: { id: business.id } });
      await db.session.deleteMany({ where: { userId: user.id } });
      await db.authIdentity.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      await db.authIdentity.deleteMany({ where: { userId: occupied.id } });
      await db.user.delete({ where: { id: occupied.id } });
    }
  });
});
