import { expect, test } from "@playwright/test";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

type Fixture = { userId: string; businessId: string; connectionId: string; templateId: string; token: string };

async function seed(): Promise<Fixture> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plan = await db.businessPlan.upsert({
    where: { code: "BUSINESS" },
    update: { isActive: true },
    create: { code: "BUSINESS", name: "Business", monthlyPrice: 9900, productLimit: 10, isActive: true },
  });
  const user = await db.user.create({
    data: {
      name: "Smart Reminders Workflow",
      email: `smart-reminders-${suffix}@hee.test`,
      passwordHash: "rc-only",
      emailVerifiedAt: new Date(),
    },
  });
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      planId: plan.id,
      name: "منشأة اختبار التذكيرات",
      slug: `smart-reminders-${suffix}`,
      businessType: "خدمات أعمال",
      phone: "0555000033",
      whatsapp: "0555000033",
      city: "الرياض",
      onboardingCompleted: true,
    },
  });
  await db.subscription.create({
    data: {
      businessId: business.id,
      planId: plan.id,
      status: "active",
      provider: "moyasar",
      startsAt: new Date(Date.now() - 60_000),
      endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      autoRenew: false,
    },
  });
  const connection = await db.whatsAppConnection.create({
    data: {
      businessId: business.id,
      provider: "meta",
      status: "connected",
      wabaId: `waba-${suffix}`,
      phoneNumberId: `phone-${suffix}`,
      displayPhoneNumber: "+966555000033",
      verifiedName: "INFRO Reminder Test",
      credentialEnvelope: { v: 1, alg: "aes-256-gcm", keyVersion: "rc", iv: "rc", ciphertext: "rc", tag: "rc" },
      connectedAt: new Date(),
    },
  });
  const template = await db.whatsAppTemplate.create({
    data: {
      businessId: business.id,
      connectionId: connection.id,
      provider: "meta",
      providerTemplateId: `reminder-template-${suffix}`,
      name: `infro_reminder_${suffix.replaceAll("-", "_")}`,
      language: "ar",
      category: "UTILITY",
      status: "approved",
      providerStatus: "APPROVED",
      components: [{ type: "BODY", text: "تذكيرك: {{1}}" }],
      rawPayload: { status: "APPROVED" },
      lastSyncedAt: new Date(),
    },
  });
  const token = crypto.randomUUID();
  await db.session.create({ data: { token, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return { userId: user.id, businessId: business.id, connectionId: connection.id, templateId: template.id, token };
}

async function cleanup(fixture: Fixture) {
  await db.$executeRaw(Prisma.sql`DELETE FROM "SmartReminderDelivery" WHERE "businessId" = ${fixture.businessId}`);
  await db.$executeRaw(Prisma.sql`DELETE FROM "SmartReminder" WHERE "businessId" = ${fixture.businessId}`);
  await db.whatsAppAuditLog.deleteMany({ where: { businessId: fixture.businessId } });
  await db.whatsAppTemplate.deleteMany({ where: { businessId: fixture.businessId } });
  await db.whatsAppConnection.deleteMany({ where: { businessId: fixture.businessId } });
  await db.subscription.deleteMany({ where: { businessId: fixture.businessId } });
  await db.business.delete({ where: { id: fixture.businessId } });
  await db.session.deleteMany({ where: { userId: fixture.userId } });
  await db.authIdentity.deleteMany({ where: { userId: fixture.userId } });
  await db.user.delete({ where: { id: fixture.userId } });
}

test.describe.serial("smart reminders authenticated workflow", () => {
  test.beforeAll(async () => {
    const connectionString = String(process.env.DATABASE_URL ?? "").trim();
    if (!connectionString) throw new Error("DATABASE_URL is required for smart reminders workflow");
    pool = new Pool({ connectionString, max: 3 });
    db = new PrismaClient({ adapter: new PrismaPg(pool) });
  });

  test.afterAll(async () => {
    await db?.$disconnect();
    await pool?.end();
  });

  test("owner creates, pauses, resumes and completes a tenant-scoped recurring reminder", async ({ page }) => {
    test.setTimeout(120_000);
    const fixture = await seed();
    await page.context().addCookies([{ name: "hee_session", value: fixture.token, url: baseUrl }]);

    try {
      const response = await page.goto(`${baseUrl}/dashboard/reminders`, { waitUntil: "domcontentloaded" });
      expect(response?.ok()).toBe(true);
      await expect(page.locator('[data-dashboard-path="/dashboard/reminders"]')).toBeVisible();
      await expect(page.getByRole("heading", { name: "تذكيرات أعمالك الذكية" })).toBeVisible();
      await expect(page.getByRole("button", { name: "إضافة التذكير" })).toBeVisible();

      const scheduledLocal = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
      await page.locator('input[name="title"]').fill("متابعة عرض الاختبار");
      await page.locator('textarea[name="body"]').fill("راجع العرض وتأكد من الخطوة التالية.");
      await page.locator('input[name="scheduledLocal"]').fill(scheduledLocal);
      await page.locator('select[name="recurrenceType"]').selectOption("weekly");
      await page.locator('input[name="recipientConsentAccepted"]').check();
      await page.getByRole("button", { name: "إضافة التذكير" }).click();
      await page.waitForURL(/\/dashboard\/reminders\?create=success/);

      await expect(page.getByText("متابعة عرض الاختبار", { exact: true })).toBeVisible();
      await expect(page.getByText("أسبوعيًا", { exact: true })).toBeVisible();
      const rows = await db.$queryRaw<Array<{ id: string; businessId: string; status: string; recurrenceType: string; recipientPhoneE164: string; recipientConsentEvidence: string }>>(Prisma.sql`
        SELECT "id", "businessId", "status", "recurrenceType", "recipientPhoneE164", "recipientConsentEvidence"
        FROM "SmartReminder" WHERE "businessId" = ${fixture.businessId} ORDER BY "createdAt" DESC LIMIT 1
      `);
      expect(rows).toHaveLength(1);
      expect(rows[0].businessId).toBe(fixture.businessId);
      expect(rows[0].status).toBe("scheduled");
      expect(rows[0].recurrenceType).toBe("weekly");
      expect(rows[0].recipientPhoneE164).toBe("+966555000033");
      expect(rows[0].recipientConsentEvidence).toBe("dashboard_explicit_reminder_opt_in_v1");

      await page.getByRole("button", { name: "إيقاف" }).click();
      await page.waitForURL(/\/dashboard\/reminders\?pause=success/);
      await expect(page.getByText("متوقف مؤقتًا", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "استئناف" }).click();
      await page.waitForURL(/\/dashboard\/reminders\?resume=success/);
      await expect(page.getByText("قادم", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: "إكمال" }).click();
      await page.waitForURL(/\/dashboard\/reminders\?complete=success/);
      const completed = await db.$queryRaw<Array<{ status: string; nextOccurrenceAt: Date | null }>>(Prisma.sql`
        SELECT "status", "nextOccurrenceAt" FROM "SmartReminder" WHERE "id" = ${rows[0].id} AND "businessId" = ${fixture.businessId}
      `);
      expect(completed[0]?.status).toBe("completed");
      expect(completed[0]?.nextOccurrenceAt).toBeNull();
    } finally {
      await cleanup(fixture);
    }
  });
});
