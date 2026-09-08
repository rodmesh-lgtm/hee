import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let db: PrismaClient;

async function setSession(page: import("@playwright/test").Page, token: string) {
  await page.context().clearCookies();
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

test.describe.serial("verified account deletion lifecycle", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required");
    db = new PrismaClient({ datasourceUrl: connectionString });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
  });

  test("deletion revokes the owner without touching another tenant", async ({ page }) => {
    test.setTimeout(90_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const plan = await db.businessPlan.upsert({
      where: { code: "FREE" },
      update: { isActive: true },
      create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true },
    });
    const paidPlan = await db.businessPlan.upsert({
      where: { code: `DELETE_RC_${suffix}` },
      update: {},
      create: { code: `DELETE_RC_${suffix}`, name: "Deletion RC", monthlyPrice: 1000, productLimit: 10, isActive: true },
    });

    const owner = await db.user.create({ data: { name: "Deletion RC Owner", email: `delete-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
    const otherOwner = await db.user.create({ data: { name: "Other Tenant Owner", email: `other-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
    const business = await db.business.create({ data: { ownerId: owner.id, planId: paidPlan.id, name: "Deletion Target Business", slug: `delete-target-${suffix}`, businessType: "خدمات", onboardingCompleted: true, isPublished: true, publishedAt: new Date(), email: owner.email, phone: "0500000000" } });
    const otherBusiness = await db.business.create({ data: { ownerId: otherOwner.id, planId: plan.id, name: "Untouched Tenant Business", slug: `untouched-${suffix}`, businessType: "خدمات", onboardingCompleted: true, isPublished: true, publishedAt: new Date() } });
    const paymentMethod = await db.billingPaymentMethod.create({ data: { businessId: business.id, encryptedToken: "rc-encrypted-token", status: "active", brand: "visa", last4: "4242" } });
    const subscription = await db.subscription.create({ data: { businessId: business.id, planId: paidPlan.id, status: "active", provider: "moyasar", autoRenew: true, paymentMethodId: paymentMethod.id, endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } });
    const sessionToken = crypto.randomUUID();
    await db.session.create({ data: { token: sessionToken, userId: owner.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });

    try {
      await setSession(page, sessionToken);
      await page.goto(`${baseUrl}/${business.slug}`, { waitUntil: "domcontentloaded" });
      await expect(page.getByText("Deletion Target Business").first()).toBeVisible();

      await page.goto(`${baseUrl}/dashboard/account-deletion`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "حذف الحساب والبيانات" })).toBeVisible();
      await page.getByRole("textbox", { name: "بريد الحساب" }).fill(owner.email);
      await page.getByRole("textbox", { name: "عبارة التأكيد" }).fill("DELETE MY INFRO ACCOUNT");
      await page.getByRole("button", { name: "حذف الحساب نهائيًا" }).click();
      await expect(page).toHaveURL(/\/login\?account=deleted/);

      const [deletedUser, deletedBusiness, revokedMethod, stoppedSubscription, ownerSessions, otherAfter, audit] = await Promise.all([
        db.user.findUniqueOrThrow({ where: { id: owner.id } }),
        db.business.findUniqueOrThrow({ where: { id: business.id } }),
        db.billingPaymentMethod.findUniqueOrThrow({ where: { id: paymentMethod.id } }),
        db.subscription.findUniqueOrThrow({ where: { id: subscription.id } }),
        db.session.count({ where: { userId: owner.id } }),
        db.business.findUniqueOrThrow({ where: { id: otherBusiness.id } }),
        db.analyticsEvent.findFirst({ where: { businessId: business.id, eventType: "account_deletion_completed" }, orderBy: { createdAt: "desc" } }),
      ]);

      expect(deletedUser.deletedAt).not.toBeNull();
      expect(deletedUser.passwordHash).toBeNull();
      expect(deletedUser.email).toContain("@deleted.hee.invalid");
      expect(deletedBusiness.deletedAt).not.toBeNull();
      expect(deletedBusiness.isPublished).toBe(false);
      expect(deletedBusiness.email).toBeNull();
      expect(revokedMethod.status).toBe("revoked");
      expect(stoppedSubscription.autoRenew).toBe(false);
      expect(ownerSessions).toBe(0);
      expect(audit).not.toBeNull();
      expect(otherAfter.deletedAt).toBeNull();
      expect(otherAfter.isPublished).toBe(true);
      expect(otherAfter.name).toBe("Untouched Tenant Business");

      await page.goto(`${baseUrl}/${business.slug}`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(new RegExp(`/${business.slug}$`));
      await expect(page.getByText("Deletion Target Business")).toHaveCount(0);

      await setSession(page, sessionToken);
      await page.goto(`${baseUrl}/dashboard`, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/login/);
    } finally {
      await db.analyticsEvent.deleteMany({ where: { businessId: business.id } });
      await db.subscription.deleteMany({ where: { businessId: business.id } });
      await db.billingPaymentMethod.deleteMany({ where: { businessId: business.id } });
      await db.business.deleteMany({ where: { id: { in: [business.id, otherBusiness.id] } } });
      await db.session.deleteMany({ where: { userId: { in: [owner.id, otherOwner.id] } } });
      await db.authIdentity.deleteMany({ where: { userId: { in: [owner.id, otherOwner.id] } } });
      await db.user.deleteMany({ where: { id: { in: [owner.id, otherOwner.id] } } });
      await db.businessPlan.delete({ where: { id: paidPlan.id } }).catch(() => undefined);
    }
  });
});
