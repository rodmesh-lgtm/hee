import { expect, test } from "@playwright/test";
import { PrismaClient, Prisma } from "@prisma/client";
import { Pool } from "pg";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const databaseUrl = process.env.DATABASE_URL;
let db: PrismaClient | null = null;
let pool: Pool | null = null;

function hashSession(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

async function seed() {
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  db ??= new PrismaClient();
  pool ??= new Pool({ connectionString: databaseUrl });
  const suffix = randomUUID();
  const userId = `reminder-user-${suffix}`;
  const businessId = `reminder-business-${suffix}`;
  const token = `playwright-reminder-${randomBytes(24).toString("hex")}`;
  const tokenHash = hashSession(token);
  const sessionId = `reminder-session-${suffix}`;
  const email = `reminder-${suffix}@example.com`;

  await db.user.create({
    data: {
      id: userId,
      name: "Reminder Owner",
      email,
      passwordHash: "playwright-no-login",
      emailVerifiedAt: new Date(),
    },
  });
  await db.business.create({
    data: {
      id: businessId,
      ownerId: userId,
      name: `Reminder Business ${suffix}`,
      slug: `reminder-${suffix}`.slice(0, 70),
      whatsapp: "+966555000033",
      phone: "+966555000033",
      onboardingCompleted: true,
    },
  });
  await db.session.create({
    data: {
      id: sessionId,
      userId,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  return { userId, businessId, sessionId, token };
}

async function cleanup(fixture: Awaited<ReturnType<typeof seed>>) {
  if (!db) return;
  await db.$transaction(async (tx) => {
    await tx.smartReminderNotification.deleteMany({ where: { businessId: fixture.businessId } });
    await tx.smartReminderDelivery.deleteMany({ where: { businessId: fixture.businessId } });
    await tx.smartReminder.deleteMany({ where: { businessId: fixture.businessId } });
    await tx.whatsAppAuditLog.deleteMany({ where: { businessId: fixture.businessId } });
    await tx.session.deleteMany({ where: { userId: fixture.userId } });
    await tx.business.delete({ where: { id: fixture.businessId } });
    await tx.user.delete({ where: { id: fixture.userId } });
  });
}

test.describe("smart reminders authenticated workflow", () => {
  test.beforeAll(async () => {
    if (!databaseUrl) test.skip(true, "DATABASE_URL is required");
    process.env.INFRO_REMINDER_WHATSAPP_ENABLED = "true";
    process.env.INFRO_REMINDER_WHATSAPP_WABA_ID = "123456789012345";
    process.env.INFRO_REMINDER_WHATSAPP_PHONE_NUMBER_ID = "123456789012346";
    process.env.INFRO_REMINDER_WHATSAPP_ACCESS_TOKEN = "playwright-reminder-access-token-long-enough";
    process.env.INFRO_REMINDER_WHATSAPP_TEMPLATE_NAME = "infro_reminder";
    process.env.INFRO_REMINDER_WHATSAPP_TEMPLATE_LANGUAGE = "ar";
    process.env.META_WHATSAPP_GRAPH_VERSION = "v23.0";
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
      const activateReminder = page.getByRole("button", { name: "حفظ وتفعيل التذكير" });
      await expect(activateReminder).toBeVisible();

      const scheduledLocal = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 16);
      await page.locator('input[name="title"]').fill("متابعة عرض الاختبار");
      await page.locator('textarea[name="body"]').fill("راجع العرض وتأكد من الخطوة التالية.");
      await page.locator('input[name="scheduledLocal"]').fill(scheduledLocal);
      await page.locator('select[name="recurrenceType"]').selectOption("weekly");
      await page.locator('input[name="recipientConsentAccepted"]').check();
      await activateReminder.click();
      await page.waitForURL(/\/dashboard\/reminders\?create=success/);

      const reminderCard = page.getByRole("article").filter({ hasText: "متابعة عرض الاختبار" });
      await expect(reminderCard.getByText("متابعة عرض الاختبار", { exact: true })).toBeVisible();
      await expect(reminderCard.getByText("أسبوعيًا", { exact: true })).toBeVisible();
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

      const auditCount = await db.whatsAppAuditLog.count({ where: { businessId: fixture.businessId } });
      expect(auditCount).toBeGreaterThan(0);
    } finally {
      await cleanup(fixture);
    }
  });
});
