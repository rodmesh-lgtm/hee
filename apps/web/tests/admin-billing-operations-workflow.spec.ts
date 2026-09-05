import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";
let pool: Pool;
let db: PrismaClient;

async function seed() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const admin = await db.user.upsert({ where: { email: adminEmail }, update: { name: "RC Platform Admin", deletedAt: null }, create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
  const token = crypto.randomUUID();
  await db.session.create({ data: { token, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  const plan = await db.businessPlan.upsert({ where: { code: "RC_ADMIN_BILLING" }, update: { name: "RC Admin Billing", monthlyPrice: 19900, isActive: true }, create: { code: "RC_ADMIN_BILLING", name: "RC Admin Billing", monthlyPrice: 19900, productLimit: 20, isActive: true } });
  const owner = await db.user.create({ data: { name: "RC Billing Owner", email: `rc-admin-billing-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });

  const paidBusiness = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: `منشأة فوترة ${suffix}`, slug: `rc-billing-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
  const paidSubscription = await db.subscription.create({ data: { businessId: paidBusiness.id, planId: plan.id, status: "active", provider: "moyasar", autoRenew: true } });
  const payment = await db.billingPayment.create({ data: { businessId: paidBusiness.id, planId: plan.id, subscriptionId: paidSubscription.id, provider: "moyasar", providerGivenId: `rc-given-${suffix}`, providerPaymentId: `rc-provider-${suffix}`, kind: "initial", amount: 19900, status: "paid", paidAt: new Date(), receiptSellerLegalName: "HEE RC", receiptSellerAddress: "RC evidence address", receiptTaxStatus: "not_registered", receiptNetAmount: 19900, receiptVatAmount: 0, receiptIssuedAt: new Date() } });
  await db.billingWebhookEvent.create({ data: { provider: "moyasar", providerEventId: `rc-event-${suffix}`, eventType: "payment_paid", billingPaymentId: payment.id, processedAt: new Date() } });

  const accessBusiness = await db.business.create({ data: { ownerId: owner.id, planId: plan.id, name: `منشأة منحة ${suffix}`, slug: `rc-grant-${suffix}`, businessType: "خدمات", onboardingCompleted: true } });
  const accessSubscription = await db.subscription.create({ data: { businessId: accessBusiness.id, planId: plan.id, status: "active", provider: "access_code", autoRenew: false } });
  const code = await db.subscriptionAccessCode.create({ data: { codeHash: `rc-hash-${suffix}`, label: `RC Grant ${suffix}`, planId: plan.id, createdByUserId: admin.id } });
  const grant = await db.subscriptionAccessGrant.create({ data: { codeId: code.id, businessId: accessBusiness.id, planId: plan.id, subscriptionId: accessSubscription.id, redeemedByUserId: owner.id } });
  return {
    token,
    ownerId: owner.id,
    ownerEmail: owner.email,
    paidBusinessId: paidBusiness.id,
    paidSubscriptionId: paidSubscription.id,
    accessBusinessId: accessBusiness.id,
    accessSubscriptionId: accessSubscription.id,
    paymentId: payment.id,
    codeId: code.id,
    grantId: grant.id,
  };
}

test.describe.serial("central admin billing operations", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    if (!String(process.env.HEE_ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase()).includes(adminEmail)) throw new Error(`HEE_ADMIN_EMAILS must include ${adminEmail}`);
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });
  test.afterAll(async () => { await db?.$disconnect(); await pool?.end(); });

  test("shows paid evidence and access-code entitlement without fabricating a payment", async ({ page }) => {
    test.setTimeout(120_000);
    const f = await seed();
    try {
      await page.context().addCookies([{ name: "hee_session", value: f.token, url: baseUrl }]);
      await page.goto(`${baseUrl}/admin/billing?q=${encodeURIComponent(f.ownerEmail)}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "الاشتراكات والفوترة" })).toBeVisible();
      await expect(page.getByRole("cell", { name: "access_code", exact: true })).toBeVisible();
      await expect(page.getByText("moyasar", { exact: true }).first()).toBeVisible();
      await expect(page.getByText(/لا ينشئ دفعة وهمية/)).toBeVisible();
      expect(await db.billingPayment.count({ where: { businessId: f.accessBusinessId } })).toBe(0);
      expect(await db.billingPayment.count({ where: { businessId: f.paidBusinessId } })).toBe(1);

      await page.getByRole("link", { name: "فتح" }).click();
      await expect(page).toHaveURL(new RegExp(`/admin/billing/payments/${f.paymentId}`));
      await expect(page.getByRole("heading", { name: "تفاصيل الدفعة" })).toBeVisible();
      await expect(page.getByText("not_registered", { exact: true })).toBeVisible();
      await expect(page.getByText("payment_paid", { exact: true })).toBeVisible();
      await expect(page.getByText(/هذه الصفحة للقراءة والتحقق فقط/)).toBeVisible();
      await expect(page.locator("main form")).toHaveCount(0);
    } finally {
      await db.session.deleteMany({ where: { token: f.token } });
      await db.subscriptionAccessGrant.deleteMany({ where: { id: f.grantId } });
      await db.subscriptionAccessCode.deleteMany({ where: { id: f.codeId } });
      await db.billingWebhookEvent.deleteMany({ where: { billingPaymentId: f.paymentId } });
      await db.billingPayment.deleteMany({ where: { id: f.paymentId } });
      await db.subscription.deleteMany({ where: { id: { in: [f.paidSubscriptionId, f.accessSubscriptionId] } } });
      await db.business.deleteMany({ where: { id: { in: [f.paidBusinessId, f.accessBusinessId] } } });
      await db.user.deleteMany({ where: { id: f.ownerId } });
    }
  });
});
