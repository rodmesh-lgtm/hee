import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

type Seeded = { userId: string; businessId: string; serviceId: string; sessionToken: string; slug: string };

function riyadhDateKey(offsetDays: number) {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function seed(): Promise<Seeded> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: { isActive: true }, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true } });
  const user = await db.user.create({ data: { name: "Transaction Owner", email: `tx-owner-${suffix}@hee.test`, passwordHash: "rc-only" } });
  const slug = `tx-${suffix}`;
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      planId: plan.id,
      name: "منشأة حجوزات HEE",
      slug,
      businessType: "خدمات",
      shortDescription: "اختبار المعاملة من العميل إلى المالك",
      phone: "0555000022",
      whatsapp: "966555000022",
      city: "الرياض",
      isPublished: true,
      publishedAt: new Date(),
      bookingAvailable: true,
      onboardingCompleted: true,
    },
  });
  const service = await db.service.create({ data: { businessId: business.id, name: "استشارة لمدة ساعة", price: 150, durationMinutes: 60, bookingEnabled: true, isActive: true } });
  await db.workingHours.createMany({ data: Array.from({ length: 7 }, (_, dayOfWeek) => ({ businessId: business.id, dayOfWeek, opensAt: "08:00", closesAt: "23:00", isClosed: false })) });
  const sessionToken = crypto.randomUUID();
  await db.session.create({ data: { token: sessionToken, userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
  return { userId: user.id, businessId: business.id, serviceId: service.id, sessionToken, slug };
}

async function setSession(page: Page, token: string) {
  await page.context().addCookies([{ name: "hee_session", value: token, url: baseUrl }]);
}

async function cleanup(seed: Seeded) {
  await db.analyticsEvent.deleteMany({ where: { businessId: seed.businessId } });
  await db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "businessId" = ${seed.businessId}`;
  await db.booking.deleteMany({ where: { businessId: seed.businessId } });
  await db.orderItem.deleteMany({ where: { order: { businessId: seed.businessId } } });
  await db.order.deleteMany({ where: { businessId: seed.businessId } });
  await db.customer.deleteMany({ where: { businessId: seed.businessId } });
  await db.workingHours.deleteMany({ where: { businessId: seed.businessId } });
  await db.service.deleteMany({ where: { businessId: seed.businessId } });
  await db.business.delete({ where: { id: seed.businessId } });
  await db.session.deleteMany({ where: { userId: seed.userId } });
  await db.user.delete({ where: { id: seed.userId } });
}

test.describe.serial("public transactions workflow", () => {
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

  test("creates a public booking and lets the owner confirm it from inbox", async ({ browser }) => {
    test.setTimeout(90_000);
    const seeded = await seed();
    const publicPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const ownerPage = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    try {
      await publicPage.goto(`${baseUrl}/${seeded.slug}`, { waitUntil: "domcontentloaded" });
      await expect(publicPage.getByRole("button", { name: "طلب خدمة" })).toBeVisible();
      await expect(publicPage.getByRole("button", { name: "حجز موعد" })).toBeVisible();
      await publicPage.getByRole("button", { name: "حجز موعد" }).click();
      await expect(publicPage.getByRole("dialog", { name: "حجز موعد" })).toBeVisible();

      const tomorrow = riyadhDateKey(1);
      await publicPage.getByLabel("الاسم").fill("عميل اختبار");
      await publicPage.getByLabel("رقم الجوال").fill("0500000011");
      await publicPage.getByLabel("الخدمة").selectOption(seeded.serviceId);
      await publicPage.getByLabel("التاريخ").fill(tomorrow);
      await publicPage.getByLabel("الوقت").fill("10:00");
      await publicPage.getByRole("button", { name: "تأكيد الحجز" }).click();
      await expect(publicPage.getByText("تم تسجيل الحجز بنجاح وسيظهر مباشرة لدى المنشأة.")).toBeVisible({ timeout: 20_000 });

      const booking = await expect.poll(async () => db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { id: true, status: true, bookingDate: true, bookingTime: true } }), { timeout: 20_000 }).not.toBeNull();
      void booking;
      const persisted = await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { id: true, status: true, bookingDate: true, bookingTime: true } });
      expect(persisted?.status).toBe("pending");
      expect(persisted?.bookingDate).toBe(tomorrow);
      expect(persisted?.bookingTime).toBe("10:00");

      await setSession(ownerPage, seeded.sessionToken);
      await ownerPage.goto(`${baseUrl}/dashboard/inbox`, { waitUntil: "domcontentloaded" });
      await expect(ownerPage.getByRole("heading", { name: "الطلبات والحجوزات" })).toBeVisible();
      await expect(ownerPage.getByText("عميل اختبار")).toBeVisible();
      await expect(ownerPage.getByText("استشارة لمدة ساعة")).toBeVisible();
      await ownerPage.getByRole("button", { name: "تأكيد الحجز" }).click();
      await expect.poll(async () => (await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { status: true } }))?.status, { timeout: 20_000 }).toBe("confirmed");
      await expect(ownerPage.getByText("مؤكد", { exact: true })).toBeVisible();
    } finally {
      await publicPage.close();
      await ownerPage.close();
      await cleanup(seeded);
    }
  });
});
