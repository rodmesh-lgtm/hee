import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";
let pool: Pool;
let db: PrismaClient;

async function setSession(page: Parameters<typeof test>[0] extends never ? never : any, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

async function seed() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const admin = await db.user.upsert({ where: { email: adminEmail }, update: { deletedAt: null }, create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
  const adminToken = crypto.randomUUID();
  await db.session.create({ data: { token: adminToken, userId: admin.id, expiresAt: new Date(Date.now() + 3_600_000) } });

  const plan = await db.businessPlan.upsert({ where: { code: "RC_ACCOUNT_OPS" }, update: { isActive: true, name: "RC Account Ops", monthlyPrice: 0 }, create: { code: "RC_ACCOUNT_OPS", name: "RC Account Ops", monthlyPrice: 0, productLimit: 10, isActive: true } });
  const owner = await db.user.create({ data: { name: "RC Account Owner", email: `rc-account-${suffix}@hee.test`, passwordHash: "rc-owner-only", emailVerifiedAt: new Date() } });
  const ownerToken = crypto.randomUUID();
  await db.session.create({ data: { token: ownerToken, userId: owner.id, expiresAt: new Date(Date.now() + 3_600_000) } });
  const identity = await db.authIdentity.create({ data: { userId: owner.id, provider: "google", providerSubject: `rc-google-${suffix}`, providerEmail: owner.email } });
  const business = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: `منشأة حساب ${suffix}`, slug: `rc-account-${suffix}`, businessType: "خدمات", onboardingCompleted: true, isPublished: true } });
  const subscription = await db.subscription.create({ data: { businessId: business.id, planId: plan.id, status: "active", provider: "internal", autoRenew: false } });
  return { adminToken, ownerToken, ownerId: owner.id, ownerEmail: owner.email, identityId: identity.id, businessId: business.id, subscriptionId: subscription.id };
}

async function cleanup(f: Awaited<ReturnType<typeof seed>>) {
  await db.session.deleteMany({ where: { token: { in: [f.adminToken, f.ownerToken] } } });
  await db.authIdentity.deleteMany({ where: { id: f.identityId } });
  await db.subscription.deleteMany({ where: { id: f.subscriptionId } });
  await db.business.deleteMany({ where: { id: f.businessId } });
  await db.user.deleteMany({ where: { id: f.ownerId } });
}

test.describe.serial("central admin customer accounts", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    if (!String(process.env.HEE_ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).includes(adminEmail)) throw new Error(`HEE_ADMIN_EMAILS must include ${adminEmail}`);
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });
  test.afterAll(async () => { await db?.$disconnect(); await pool?.end(); });

  test("admin can inspect account ownership while a normal owner cannot access the account center", async ({ page }) => {
    test.setTimeout(90_000);
    const f = await seed();
    try {
      await page.context().clearCookies();
      await page.context().addCookies([{ name: "hee_session", value: f.adminToken, url: baseUrl }]);
      await page.goto(`${baseUrl}/admin/customers?q=${encodeURIComponent(f.ownerEmail)}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "العملاء والحسابات" })).toBeVisible();
      const row = page.getByRole("row").filter({ hasText: f.ownerEmail });
      await expect(row).toBeVisible();
      await expect(row.getByText("موثق", { exact: true })).toBeVisible();
      await expect(row.getByText(/google/)).toBeVisible();
      await row.getByRole("link", { name: "فتح الحساب" }).click();

      await expect(page.getByRole("heading", { name: "RC Account Owner" })).toBeVisible();
      await expect(page.getByText("google", { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/لا يتم استعلام password hashes/)).toBeVisible();
      await expect(page.getByText("internal", { exact: true })).toBeVisible();
      await expect(page.locator("main form")).toHaveCount(0);

      await page.context().clearCookies();
      await page.context().addCookies([{ name: "hee_session", value: f.ownerToken, url: baseUrl }]);
      const response = await page.goto(`${baseUrl}/admin/customers/${f.ownerId}`, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: "RC Account Owner" })).toHaveCount(0);
    } finally {
      await cleanup(f);
    }
  });
});
