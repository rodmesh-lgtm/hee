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

  test("all pending requests remain reachable beyond the first page", async ({ page }) => {
    test.setTimeout(120_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const admin = await db.user.upsert({
      where: { email: adminEmail },
      update: { name: "RC Platform Admin", deletedAt: null },
      create: { name: "RC Platform Admin", email: adminEmail, passwordHash: "rc-only" },
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
        data: Array.from({ length: 51 }, (_, index) => ({
          ownerId: owner.id,
          planId: plan.id,
          name: `منشأة طلب إداري ${String(index + 1).padStart(2, "0")}`,
          slug: `${prefix}-${index + 1}`,
          businessType: "خدمات أعمال",
          onboardingCompleted: true,
        })),
      });
      const businesses = await db.business.findMany({ where: { slug: { startsWith: prefix } }, select: { id: true } });
      expect(businesses).toHaveLength(51);
      await db.analyticsEvent.createMany({
        data: businesses.map((business) => ({
          businessId: business.id,
          eventType: "verification_requested",
          metadata: { source: "rc_admin_requests", status: "pending" },
        })),
      });

      await page.context().addCookies([{ name: "hee_session", value: adminSessionToken, url: baseUrl }]);
      await page.goto(`${baseUrl}/admin/requests?type=verification`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { name: "طلبات الإدارة" })).toBeVisible();
      await expect(page.getByText(/51 طلب معلق · صفحة 1 من 2/)).toBeVisible();
      await expect(page.getByRole("button", { name: "اعتماد التوثيق" })).toHaveCount(50);
      await page.getByRole("link", { name: "التالي" }).click();
      await expect(page.getByText(/51 طلب معلق · صفحة 2 من 2/)).toBeVisible();
      await expect(page.getByRole("button", { name: "اعتماد التوثيق" })).toHaveCount(1);
    } finally {
      const businesses = await db.business.findMany({ where: { slug: { startsWith: prefix } }, select: { id: true } });
      const businessIds = businesses.map((business) => business.id);
      if (businessIds.length) {
        await db.analyticsEvent.deleteMany({ where: { businessId: { in: businessIds } } });
        await db.business.deleteMany({ where: { id: { in: businessIds } } });
      }
      await db.session.deleteMany({ where: { id: adminSessionToken } }).catch(() => undefined);
      await db.session.deleteMany({ where: { token: adminSessionToken } });
      await db.user.delete({ where: { id: owner.id } }).catch(() => undefined);
      const adminBusinesses = await db.business.count({ where: { ownerId: admin.id } });
      if (adminBusinesses === 0) await db.user.delete({ where: { id: admin.id } }).catch(() => undefined);
    }
  });
});
