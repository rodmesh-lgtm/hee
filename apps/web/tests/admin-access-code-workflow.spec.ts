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
  paidPlanCode: string;
  label: string;
};

async function seed(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const free = await db.businessPlan.upsert({
    where: { code: "FREE" },
    update: { isActive: true },
    create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
  });
  const paidPlanCode = "BUSINESS";
  const paid = await db.businessPlan.upsert({
    where: { code: paidPlanCode }, update: { isActive: true },
    create: { code: paidPlanCode, name: "Business", monthlyPrice: 199, productLimit: 10, isActive: true },
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
    paidPlanCode,
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
  await db.branch.deleteMany({ where: { businessId: fixture.businessId } });
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

  test("admin creates a supported plan grant, customer activates features without payment, admin revokes entitlement", async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await seed();

    try {
      await setSession(page, fixture.adminToken);
      await page.goto(`${baseUrl}/admin/access-codes`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "أكواد تفعيل الاشتراكات" })).toBeVisible();
      await page.locator('select[name="plan"]').selectOption(fixture.paidPlanCode);
      await page.locator('input[name="label"]').fill(fixture.label);
      await page.locator('input[name="maxRedemptions"]').fill("1");
      await page.getByRole("button", { name: "إنشاء كود آمن" }).click();

      const secret = (await page.locator("code").first().textContent())?.trim() ?? "";
      expect(secret).toMatch(/^INFRO-[A-F0-9]{24}$/);
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
      await expect(page.getByRole("heading", { name: "كود وصول إداري" })).toBeVisible();
      await page.locator('input[name="accessCode"]').fill(secret);
      await page.getByRole("button", { name: "تفعيل الكود" }).click();
      await page.waitForURL(/code=activated/);
      await expect(page.getByText("تم تفعيل الباقة بواسطة كود الوصول", { exact: false })).toBeVisible();
      await expect(page.getByText("وصول إداري بلا خصم مالي", { exact: true })).toBeVisible();
      await expect(page.getByText("حتى إلغاء المنحة", { exact: true })).toBeVisible();

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

      await db.branch.create({ data: { businessId: fixture.businessId, name: "الفرع الأول", isActive: true } });
      await page.goto(`${baseUrl}/dashboard/directory`);
      await page.getByPlaceholder("اسم الفرع").fill("الفرع الثاني");
      await page.getByRole("button", { name: "إضافة فرع", exact: true }).click();
      await expect(page.getByText("تمت إضافة الفرع.", { exact: true })).toBeVisible();
      expect(await db.branch.count({ where: { businessId: fixture.businessId } })).toBe(2);

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
      await setSession(page, fixture.customerToken);
      await page.goto(`${baseUrl}/dashboard/directory`);
      await expect(page.getByRole("button", { name: "إضافة فرع", exact: true })).toHaveCount(0);
    } finally {
      await cleanup(fixture);
    }
  });

  test("legacy undefined plan can be repaired atomically without billing or affecting another code", async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await seed();
    const legacy = await db.businessPlan.create({ data: { code: `legacy-${fixture.businessId}`, name: "Legacy Undefined", monthlyPrice: 0, productLimit: 100 } });
    try {
      const code = await db.subscriptionAccessCode.create({ data: { codeHash: crypto.randomUUID(), label: fixture.label, planId: legacy.id, createdByUserId: fixture.adminId, redemptionCount: 1, whatsappMarketingEnabled: true } });
      const subscription = await db.subscription.create({ data: { businessId: fixture.businessId, planId: legacy.id, provider: "access_code", providerReference: code.id, status: "active", endsAt: null, autoRenew: false } });
      const grant = await db.subscriptionAccessGrant.create({ data: { codeId: code.id, businessId: fixture.businessId, planId: legacy.id, subscriptionId: subscription.id, redeemedByUserId: fixture.customerId } });
      await db.business.update({ where: { id: fixture.businessId }, data: { planId: legacy.id } });
      const otherCode = await db.subscriptionAccessCode.create({ data: { codeHash: crypto.randomUUID(), label: "Other untouched code", planId: legacy.id, createdByUserId: fixture.adminId } });
      await db.branch.create({ data: { businessId: fixture.businessId, name: "الفرع الحالي", isActive: true } });
      await setSession(page, fixture.customerToken);
      await page.goto(`${baseUrl}/dashboard/directory`);
      await expect(page.getByRole("button", { name: "إضافة فرع", exact: true })).toHaveCount(0);
      await setSession(page, fixture.adminToken);
      await page.goto(`${baseUrl}/admin/access-codes`);
      await expect(page.locator('select[name="plan"]').first().locator(`option[value="${legacy.code}"]`)).toHaveCount(0);
      const form = page.getByRole("form", { name: `تصحيح ${fixture.label}`, exact: true });
      await form.getByRole("combobox", { name: "الباقة البديلة" }).selectOption("BUSINESS");
      await form.getByRole("button", { name: "تصحيح الكود والمنح النشطة" }).click();
      await expect(page).toHaveURL(/access=repair-saved/);
      const [fixedCode, fixedGrant, fixedSubscription, fixedBusiness, untouched] = await Promise.all([
        db.subscriptionAccessCode.findUniqueOrThrow({ where: { id: code.id } }),
        db.subscriptionAccessGrant.findUniqueOrThrow({ where: { id: grant.id } }),
        db.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
        db.business.findUniqueOrThrow({ where: { id: fixture.businessId } }),
        db.subscriptionAccessCode.findUniqueOrThrow({ where: { id: otherCode.id } }),
      ]);
      for (const record of [fixedCode, fixedGrant, fixedSubscription, fixedBusiness]) expect(record.planId).toBe(fixture.paidPlanId);
      expect(untouched.planId).toBe(legacy.id);
      expect(fixedSubscription.endsAt).toBeNull();
      expect(fixedSubscription.autoRenew).toBe(false);
      expect(fixedCode.whatsappMarketingEnabled).toBe(true);
      expect(await db.billingPayment.count({ where: { businessId: fixture.businessId } })).toBe(0);
      expect(await db.analyticsEvent.count({ where: { businessId: fixture.businessId, eventType: "subscription_access_plan_repaired" } })).toBe(1);
      await setSession(page, fixture.customerToken);
      await page.goto(`${baseUrl}/dashboard/directory`);
      await page.getByPlaceholder("اسم الفرع").fill("الفرع بعد التصحيح");
      await page.getByRole("button", { name: "إضافة فرع", exact: true }).click();
      await expect(page.getByText("تمت إضافة الفرع.", { exact: true })).toBeVisible();
      await setSession(page, fixture.adminToken);
      await page.goto(`${baseUrl}/admin/access-codes`);
      await page.locator("tr", { hasText: fixture.label }).getByRole("button", { name: "إلغاء الكود والمنح" }).click();
      await expect(page).toHaveURL(/access=revoked/);
      expect((await db.business.findUniqueOrThrow({ where: { id: fixture.businessId } })).planId).toBe(fixture.freePlanId);
    } finally {
      await page.goto("about:blank");
      await cleanup(fixture);
      await db.businessPlan.delete({ where: { id: legacy.id } });
    }
  });
});
