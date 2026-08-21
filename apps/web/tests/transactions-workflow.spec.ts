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

function dayIndexForRiyadhDate(date: string) {
  const localNoon = new Date(`${date}T12:00:00+03:00`);
  return (localNoon.getUTCDay() + 6) % 7;
}

async function seed(): Promise<Seeded> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: { isActive: true }, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true } });
  const user = await db.user.create({ data: { name: "Transaction Owner", email: `tx-owner-${suffix}@hee.test`, passwordHash: "rc-only", emailVerifiedAt: new Date() } });
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
  await db.product.deleteMany({ where: { businessId: seed.businessId } });
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

  test("creates a public booking and safely manages it from a mobile inbox", async ({ browser }) => {
    test.setTimeout(90_000);
    const seeded = await seed();
    const publicPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const ownerPage = await browser.newPage({ viewport: { width: 390, height: 844 } });

    try {
      await publicPage.goto(`${baseUrl}/${seeded.slug}`, { waitUntil: "domcontentloaded" });
      const requestButton = publicPage.getByRole("button", { name: "طلب خدمة" });
      await expect(requestButton).toBeVisible();
      await requestButton.click();
      const requestDialog = publicPage.getByRole("dialog", { name: "طلب خدمة" });
      await expect(requestDialog).toBeVisible();
      await expect(requestDialog.getByLabel("الاسم")).toBeFocused();
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("hidden");
      await publicPage.keyboard.press("Escape");
      await expect(requestDialog).toBeHidden();
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("");
      await expect(requestButton).toBeFocused();

      const bookingButton = publicPage.getByRole("button", { name: "حجز موعد" });
      await expect(bookingButton).toBeVisible();
      await bookingButton.click();
      const bookingDialog = publicPage.getByRole("dialog", { name: "حجز موعد" });
      await expect(bookingDialog).toBeVisible();
      await expect(bookingDialog.getByLabel("الاسم")).toBeFocused();
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("hidden");
      const bookingClose = bookingDialog.getByRole("button", { name: "إغلاق" });
      const bookingCloseBox = await bookingClose.boundingBox();
      expect(bookingCloseBox?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect(bookingCloseBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      await publicPage.keyboard.press("Escape");
      await expect(bookingDialog).toBeHidden();
      expect(await publicPage.evaluate(() => document.body.style.overflow)).toBe("");
      await expect(bookingButton).toBeFocused();

      await publicPage.setViewportSize({ width: 390, height: 520 });
      await bookingButton.click();
      await expect(bookingDialog).toBeVisible();
      const bookingBox = await bookingDialog.boundingBox();
      expect(bookingBox?.height ?? 9999).toBeLessThanOrEqual(496);
      const bookingSubmit = bookingDialog.getByRole("button", { name: "تأكيد الحجز" });
      await bookingSubmit.scrollIntoViewIfNeeded();
      await expect(bookingSubmit).toBeVisible();

      const tomorrow = riyadhDateKey(1);
      await bookingDialog.getByLabel("الاسم").fill("عميل اختبار");
      await bookingDialog.getByLabel("رقم الجوال").fill("0500000011");
      await bookingDialog.getByLabel("الخدمة").selectOption(seeded.serviceId);
      await bookingDialog.getByLabel("التاريخ").fill(tomorrow);
      await bookingDialog.getByLabel("الوقت").fill("10:00");
      await bookingSubmit.click();
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

      const cancelButton = ownerPage.getByRole("button", { name: "إلغاء", exact: true });
      const cancelBox = await cancelButton.boundingBox();
      expect(cancelBox?.height ?? 0).toBeGreaterThanOrEqual(44);

      ownerPage.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("إلغاء هذا الحجز");
        await dialog.dismiss();
      });
      await cancelButton.click();
      await expect.poll(async () => (await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { status: true } }))?.status).toBe("confirmed");

      ownerPage.once("dialog", async (dialog) => {
        expect(dialog.message()).toContain("إلغاء هذا الحجز");
        await dialog.accept();
      });
      await cancelButton.click();
      await expect.poll(async () => (await db.booking.findFirst({ where: { businessId: seeded.businessId }, select: { status: true } }))?.status, { timeout: 20_000 }).toBe("cancelled");
      await expect(ownerPage.getByText("ملغي", { exact: true })).toBeVisible();
    } finally {
      await publicPage.close();
      await ownerPage.close();
      await cleanup(seeded);
    }
  });

  test("keeps overnight availability on the starting day and blocks cross-midnight overlap", async ({ request }) => {
    test.setTimeout(60_000);
    const seeded = await seed();
    const overnightDate = riyadhDateKey(2);
    const followingDate = riyadhDateKey(3);
    const overnightDay = dayIndexForRiyadhDate(overnightDate);

    try {
      await db.workingHours.updateMany({
        where: { businessId: seeded.businessId },
        data: { isClosed: true, opensAt: null, closesAt: null, secondOpensAt: null, secondClosesAt: null },
      });
      await db.workingHours.update({
        where: { businessId_dayOfWeek: { businessId: seeded.businessId, dayOfWeek: overnightDay } },
        data: { isClosed: false, opensAt: "20:00", closesAt: "02:00" },
      });

      const firstId = crypto.randomUUID();
      const first = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": firstId },
        data: { slug: seeded.slug, name: "عميل ليلي 1", phone: "0500000101", serviceId: seeded.serviceId, bookingDate: overnightDate, bookingTime: "23:30", requestId: firstId },
      });
      expect(first.status()).toBe(201);

      const conflictingId = crypto.randomUUID();
      const conflicting = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": conflictingId },
        data: { slug: seeded.slug, name: "عميل ليلي 2", phone: "0500000102", serviceId: seeded.serviceId, bookingDate: followingDate, bookingTime: "00:00", requestId: conflictingId },
      });
      expect(conflicting.status()).toBe(409);
      expect((await conflicting.json()).error).toContain("يتداخل");

      const allowedId = crypto.randomUUID();
      const allowed = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": allowedId },
        data: { slug: seeded.slug, name: "عميل ليلي 3", phone: "0500000103", serviceId: seeded.serviceId, bookingDate: followingDate, bookingTime: "01:00", requestId: allowedId },
      });
      expect(allowed.status()).toBe(201);

      const stored = await db.booking.findMany({ where: { businessId: seeded.businessId }, orderBy: [{ bookingDate: "asc" }, { bookingTime: "asc" }], select: { bookingDate: true, bookingTime: true } });
      expect(stored).toEqual([
        { bookingDate: overnightDate, bookingTime: "23:30" },
        { bookingDate: followingDate, bookingTime: "01:00" },
      ]);
    } finally {
      await cleanup(seeded);
    }
  });

  test("rejects impossible Gregorian booking dates before persistence", async ({ request }) => {
    const seeded = await seed();

    try {
      const requestId = crypto.randomUUID();
      const response = await request.post(`${baseUrl}/api/public/bookings`, {
        headers: { "Idempotency-Key": requestId },
        data: {
          slug: seeded.slug,
          name: "عميل تاريخ",
          phone: "0500000201",
          serviceId: seeded.serviceId,
          bookingDate: "2026-02-30",
          bookingTime: "10:00",
          requestId,
        },
      });
      expect(response.status()).toBe(400);
      expect(await db.booking.count({ where: { businessId: seeded.businessId } })).toBe(0);
      expect(await db.customer.count({ where: { businessId: seeded.businessId } })).toBe(0);
    } finally {
      await cleanup(seeded);
    }
  });

  test("rejects unsupported order types and delivery when the business disables it", async ({ request }) => {
    const seeded = await seed();

    try {
      await db.business.update({ where: { id: seeded.businessId }, data: { acceptOnlineOrders: true, deliveryAvailable: false } });
      const product = await db.product.create({ data: { businessId: seeded.businessId, name: "منتج اختبار", price: 2500, isActive: true } });

      const invalidId = crypto.randomUUID();
      const invalid = await request.post(`${baseUrl}/api/public/orders`, {
        headers: { "Idempotency-Key": invalidId },
        data: {
          slug: seeded.slug,
          name: "عميل طلب",
          phone: "0500000202",
          orderType: "courier",
          items: [{ productId: product.id, quantity: 1 }],
          requestId: invalidId,
        },
      });
      expect(invalid.status()).toBe(400);

      const deliveryId = crypto.randomUUID();
      const delivery = await request.post(`${baseUrl}/api/public/orders`, {
        headers: { "Idempotency-Key": deliveryId },
        data: {
          slug: seeded.slug,
          name: "عميل توصيل",
          phone: "0500000203",
          orderType: "delivery",
          items: [{ productId: product.id, quantity: 1 }],
          requestId: deliveryId,
        },
      });
      expect(delivery.status()).toBe(409);
      expect((await delivery.json()).error).toContain("التوصيل غير متاح");
      expect(await db.order.count({ where: { businessId: seeded.businessId } })).toBe(0);
      expect(await db.customer.count({ where: { businessId: seeded.businessId } })).toBe(0);
    } finally {
      await cleanup(seeded);
    }
  });
});
