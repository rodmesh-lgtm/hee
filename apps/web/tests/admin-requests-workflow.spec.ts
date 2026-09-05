import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const adminEmail = "rc-platform-admin@hee.test";
let pool: Pool;
let db: PrismaClient;

test.describe.serial("platform admin request queue", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for admin request workflow");
    pool = new Pool({ connectionString, max: 4 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("all pending requests remain reachable and correctly counted beyond 100 events", async ({ page }) => {
    test.setTimeout(120_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const admin = await db.user.upsert({
      where: { email: adminEmail },
      update: { name: "RC Platform Admin", deletedAt: null, emailVerifiedAt: new Date() },
      create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: new Date() },
    });
    const adminSessionToken = crypto.randomUUID();
    await db.session.create({ data: { token: adminSessionToken, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const owner = await db.user.create({ data: { name: "RC Requests Owner", email: `rc-requests-${suffix}@hee.test`, passwordHash: "rc-only" } });
    const plan = await db.businessPlan.upsert({
      where: { code: "FREE" },
      update: { isActive: true },
      create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
    });

    const prefix = `rc-request-${suffix}`;
    try {
      await db.business.createMany({
        data: Array.from({ length: 101 }, (_, index) => ({
          ownerId: owner.id,
          planId: plan.id,
          name: `منشأة طلب إداري ${String(index + 1).padStart(3, "0")}`,
          slug: `${prefix}-${index + 1}`,
          businessType: "خدمات أعمال",
          onboardingCompleted: true,
        })),
      });
      const businesses = await db.business.findMany({ where: { slug: { startsWith: prefix } }, select: { id: true } });
      expect(businesses).toHaveLength(101);
      await db.analyticsEvent.createMany({
        data: businesses.map((business) => ({
          businessId: business.id,
          eventType: "verification_requested",
          metadata: { source: "rc_admin_requests", status: "pending" },
        })),
      });

      await page.context().addCookies([{ name: "hee_session", value: adminSessionToken, url: baseUrl }]);

      await page.goto(`${baseUrl}/admin`, { waitUntil: "domcontentloaded" });
      const pendingMetric = page.getByRole("heading", { name: "ما يحتاج قرار الإدارة" }).locator("../..");
      await expect(pendingMetric).toContainText("101");

      await page.goto(`${baseUrl}/admin/requests?type=verification`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "قرارات الإدارة في مسار واضح." })).toBeVisible();
      await expect(page.getByText(/101 طلب معلق · صفحة 1 من 3/)).toBeVisible();
      await expect(page.getByRole("button", { name: "اعتماد التوثيق" })).toHaveCount(50);
      await page.getByRole("link", { name: "التالي" }).click();
      await expect(page.getByText(/101 طلب معلق · صفحة 2 من 3/)).toBeVisible();
      await expect(page.getByRole("button", { name: "اعتماد التوثيق" })).toHaveCount(50);
      await page.getByRole("link", { name: "التالي" }).click();
      await expect(page.getByText(/101 طلب معلق · صفحة 3 من 3/)).toBeVisible();
      await expect(page.getByRole("button", { name: "اعتماد التوثيق" })).toHaveCount(1);
    } finally {
      const businesses = await db.business.findMany({ where: { slug: { startsWith: prefix } }, select: { id: true } });
      const businessIds = businesses.map((business) => business.id);
      if (businessIds.length) {
        await db.analyticsEvent.deleteMany({ where: { businessId: { in: businessIds } } });
        await db.business.deleteMany({ where: { id: { in: businessIds } } });
      }
      await db.session.deleteMany({ where: { token: adminSessionToken } });
      await db.user.delete({ where: { id: owner.id } }).catch(() => undefined);
      const adminBusinesses = await db.business.count({ where: { ownerId: admin.id } });
      if (adminBusinesses === 0) await db.user.delete({ where: { id: admin.id } }).catch(() => undefined);
    }
  });

  test("verification approval rejects a request whose paid entitlement expired while queued", async ({ page }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const admin = await db.user.upsert({
      where: { email: adminEmail },
      update: { name: "RC Platform Admin", deletedAt: null, emailVerifiedAt: new Date() },
      create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only", emailVerifiedAt: new Date() },
    });
    const adminSessionToken = crypto.randomUUID();
    await db.session.create({ data: { token: adminSessionToken, userId: admin.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    const owner = await db.user.create({ data: { name: "RC Verification Expiry Owner", email: `rc-verification-expiry-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
    const plan = await db.businessPlan.upsert({
      where: { code: "BUSINESS" },
      update: { name: "Business", isActive: true },
      create: { code: "BUSINESS", name: "Business", monthlyPrice: 9900, productLimit: 10, isActive: true },
    });
    const business = await db.business.create({
      data: { ownerId: owner.id, planId: plan.id, name: `منشأة انتهاء التوثيق ${suffix}`, slug: `rc-verification-expiry-${suffix}`, businessType: "خدمات أعمال", onboardingCompleted: true },
    });
    const subscription = await db.subscription.create({
      data: { businessId: business.id, planId: plan.id, status: "active", provider: "moyasar", startsAt: new Date(Date.now() - 60_000), endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000), autoRenew: false },
    });
    const event = await db.analyticsEvent.create({
      data: { businessId: business.id, eventType: "verification_requested", metadata: { source: "rc_expiry_regression", status: "pending" } },
    });

    try {
      // Model the legitimate request-time entitlement disappearing before an operator
      // reviews the queue. Business.planId intentionally remains BUSINESS to prove it
      // cannot act as authorization after the paid period itself is no longer current.
      await db.subscription.update({ where: { id: subscription.id }, data: { endsAt: new Date(Date.now() - 60_000) } });
      await page.context().addCookies([{ name: "hee_session", value: adminSessionToken, url: baseUrl }]);
      await page.goto(`${baseUrl}/admin/requests?type=verification`, { waitUntil: "domcontentloaded" });
      const requestCard = page.locator("article").filter({ hasText: business.name });
      await expect(requestCard).toBeVisible();
      await requestCard.getByRole("button", { name: "اعتماد التوثيق" }).click();
      await expect(page).toHaveURL(/error=verification-ineligible/);

      const [currentBusiness, currentEvent] = await Promise.all([
        db.business.findUniqueOrThrow({ where: { id: business.id }, select: { isVerified: true, planId: true } }),
        db.analyticsEvent.findUniqueOrThrow({ where: { id: event.id }, select: { metadata: true } }),
      ]);
      expect(currentBusiness.isVerified).toBe(false);
      expect(currentBusiness.planId).toBe(plan.id);
      expect(currentEvent.metadata).toMatchObject({ status: "obsolete", reason: "entitlement_expired_or_revoked" });
    } finally {
      await db.analyticsEvent.deleteMany({ where: { businessId: business.id } });
      await db.subscription.deleteMany({ where: { businessId: business.id } });
      await db.business.delete({ where: { id: business.id } });
      await db.session.deleteMany({ where: { token: adminSessionToken } });
      await db.authIdentity.deleteMany({ where: { userId: owner.id } });
      await db.user.delete({ where: { id: owner.id } });
      const adminBusinesses = await db.business.count({ where: { ownerId: admin.id } });
      if (adminBusinesses === 0) await db.user.delete({ where: { id: admin.id } }).catch(() => undefined);
    }
  });
});
