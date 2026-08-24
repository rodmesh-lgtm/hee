import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";
let pool: Pool;
let db: PrismaClient;

type Fixture = {
  adminId: string;
  adminToken: string;
  customerId: string;
  customerToken: string;
  businessId: string;
  freePlanId: string;
  paidPlanId: string;
  label: string;
};

async function seed(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const free = await db.businessPlan.upsert({
    where: { code: "FREE" },
    update: { isActive: true },
    create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
  });
  const paid = await db.businessPlan.upsert({
    where: { code: "BUSINESS" },
    update: { isActive: true, monthlyPrice: 99 },
    create: { code: "BUSINESS", name: "Business", monthlyPrice: 99, productLimit: 100, isActive: true },
  });

  const admin = await db.user.create({
    data: {
      name: "RC Platform Admin",
      email: adminEmail,
      passwordHash: "rc-only",
      emailVerifiedAt: new Date(),
    },
  });
  const customer = await db.user.create({
    data: {
      name: "Access Code Customer",
      email: `access-code-${suffix}@hee.test`,
      passwordHash: "rc-only",
      emailVerifiedAt: new Date(),
    },
  });
  const business = await db.business.create({
    data: {
      ownerId: customer.id,
      planId: free.id,
      name: "منشأة اختبار كود الوصول",
      slug: `access-code-${suffix}`,
      businessType: "خدمات أعمال",
      onboardingCompleted: true,
    },
  });

  const adminToken = crypto.randomUUID();
  const customerToken = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.session.createMany({
    data: [
      { token: adminToken, userId: admin.id, expiresAt },
      { token: customerToken, userId: customer.id, expiresAt },
    ],
  });

  return {
    adminId: admin.id,
    adminToken,
    customerId: customer.id,
    customerToken,
    businessId: business.id,
    freePlanId: free.id,
    paidPlanId: paid.id,
    label: `RC access ${suffix}`,
  };
}

async function cleanup(fixture: Fixture) {
  const codes = await db.subscriptionAccessCode.findMany({
    where: { createdByUserId: fixture.adminId },
    select: { id: true },
  });
  const codeIds = codes.map((code) => code.id);

  await db.analyticsEvent.deleteMany({ where: { businessId: fixture.businessId } });
  if (codeIds.length) await db.subscriptionAccessGrant.deleteMany({ where: { codeId: { in: codeIds } } });
  await db.subscription.deleteMany({ where: { businessId: fixture.businessId } });
  if (codeIds.length) await db.subscriptionAccessCode.deleteMany({ where: { id: { in: codeIds } } });
  await db.business.delete({ where: { id: fixture.businessId } });
  await db.session.deleteMany({ where: { userId: { in: [fixture.adminId, fixture.customerId] } } });
  await db.authIdentity.deleteMany({ where: { userId: { in: [fixture.adminId, fixture.customerId] } } });
  await db.user.deleteMany({ where: { id: { in: [fixture.adminId, fixture.customerId] } } });
}

async function setSession(page: Page, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

test.describe.serial("subscription access-code lifecycle", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for access-code workflow");
    pool = new Pool({ connectionString, max: 3 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("admin creates a one-time secret, customer activates without payment, admin revokes entitlement", async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await seed();

    try {
      await setSession(page, fixture.adminToken);
      await page.goto(`${baseUrl}/admin/access-codes`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "أكواد تفعيل الاشتراكات" })).toBeVisible();
      await page.locator('select[name="plan"]').selectOption("BUSINESS");
      await page.locator('input[name="label"]').fill(fixture.label);
      await page.locator('input[name="maxRedemptions"]').fill("1");
      await page.getByRole("button", { name: "إنشاء كود آمن" }).click();

      const secret = (await page.locator("code").first().textContent())?.trim() ?? "";
      expect(secret).toMatch(/^HEE-[A-F0-9]{24}$/);
      await expect(page.getByText("لن يمكن استعادته لاحقًا", { exact: false })).toBeVisible();

      const storedCode = await db.subscriptionAccessCode.findFirst({
        where: { createdByUserId: fixture.adminId, label: fixture.label },
        select: { id: true, codeHash: true, redemptionCount: true, planId: true },
      });
      expect(storedCode).not.toBeNull();
      expect(storedCode?.codeHash).not.toContain(secret);
      expect(storedCode?.redemptionCount).toBe(0);
      expect(storedCode?.planId).toBe(fixture.paidPlanId);

      await setSession(page, fixture.customerToken);
      await page.goto(`${baseUrl}/dashboard/billing/manage`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "لديك كود تفعيل؟" })).toBeVisible();
      await page.locator('input[name="accessCode"]').fill(secret);
      await page.getByRole("button", { name: "تفعيل الكود" }).click();
      await page.waitForURL(/code=activated/);
      await expect(page.getByText("تم تفعيل الباقة بواسطة كود الوصول", { exact: false })).toBeVisible();
      await expect(page.getByText("مفعلة بكود وصول إداري حتى إلغاء المنحة", { exact: true })).toBeVisible();

      const activatedBusiness = await db.business.findUnique({ where: { id: fixture.businessId }, select: { planId: true } });
      expect(activatedBusiness?.planId).toBe(fixture.paidPlanId);
      const grant = await db.subscriptionAccessGrant.findFirst({
        where: { businessId: fixture.businessId, codeId: storedCode!.id },
        include: { subscription: true },
      });
      expect(grant?.revokedAt).toBeNull();
      expect(grant?.subscription.status).toBe("active");
      expect(grant?.subscription.provider).toBe("access_code");
      expect(grant?.subscription.autoRenew).toBe(false);
      expect(grant?.subscription.paymentMethodId).toBeNull();
      expect(grant?.subscription.endsAt).toBeNull();
      expect(await db.billingPayment.count({ where: { businessId: fixture.businessId } })).toBe(0);

      await setSession(page, fixture.adminToken);
      await page.goto(`${baseUrl}/admin/access-codes`, { waitUntil: "domcontentloaded" });
      const row = page.locator("tr", { hasText: fixture.label });
      await expect(row).toBeVisible();
      await row.getByRole("button", { name: "إلغاء الكود والمنح" }).click();
      await page.waitForURL(/access=revoked/);
      await expect(page.getByText("تم إلغاء الكود وسحب المنح النشطة المرتبطة به.", { exact: true })).toBeVisible();

      const [revokedCode, revokedGrant, revokedSubscription, revertedBusiness] = await Promise.all([
        db.subscriptionAccessCode.findUnique({ where: { id: storedCode!.id } }),
        db.subscriptionAccessGrant.findUnique({ where: { codeId_businessId: { codeId: storedCode!.id, businessId: fixture.businessId } } }),
        db.subscription.findUnique({ where: { id: grant!.subscriptionId } }),
        db.business.findUnique({ where: { id: fixture.businessId }, select: { planId: true } }),
      ]);
      expect(revokedCode?.isActive).toBe(false);
      expect(revokedCode?.revokedAt).not.toBeNull();
      expect(revokedGrant?.revokedAt).not.toBeNull();
      expect(revokedSubscription?.status).toBe("canceled");
      expect(revokedSubscription?.autoRenew).toBe(false);
      expect(revertedBusiness?.planId).toBe(fixture.freePlanId);
    } finally {
      await cleanup(fixture);
    }
  });
});
