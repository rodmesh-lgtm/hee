import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

function riyadhDateKey(offsetDays: number) {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function cleanup(businessId: string, userId: string) {
  await db.analyticsEvent.deleteMany({ where: { businessId } });
  await db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "businessId" = ${businessId}`;
  await db.booking.deleteMany({ where: { businessId } });
  await db.orderItem.deleteMany({ where: { order: { businessId } } });
  await db.order.deleteMany({ where: { businessId } });
  await db.product.deleteMany({ where: { businessId } });
  await db.customer.deleteMany({ where: { businessId } });
  await db.workingHours.deleteMany({ where: { businessId } });
  await db.service.deleteMany({ where: { businessId } });
  await db.business.delete({ where: { id: businessId } });
  await db.user.delete({ where: { id: userId } });
}

test.describe("public write idempotency", () => {
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

  test("replays successful booking and order writes before mutable availability checks", async ({ request }) => {
    test.setTimeout(60_000);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = await db.user.create({ data: { name: "Idempotency Owner", email: `idem-${suffix}@hee.test`, passwordHash: "test-only" } });
    const business = await db.business.create({
      data: {
        ownerId: user.id,
        name: "منشأة اختبار التكرار",
        slug: `idem-${suffix}`,
        businessType: "خدمات",
        isPublished: true,
        publishedAt: new Date(),
        bookingAvailable: true,
        acceptOnlineOrders: true,
      },
    });
    const service = await db.service.create({ data: { businessId: business.id, name: "استشارة", price: 100, durationMinutes: 30, bookingEnabled: true, isActive: true } });
    const product = await db.product.create({ data: { businessId: business.id, name: "منتج اختبار", price: 7500, isActive: true } });
    await db.workingHours.createMany({ data: Array.from({ length: 7 }, (_, dayOfWeek) => ({ businessId: business.id, dayOfWeek, opensAt: "08:00", closesAt: "23:00", isClosed: false })) });

    try {
      const bookingKey = crypto.randomUUID();
      const bookingDate = riyadhDateKey(1);
      const bookingPayload = { slug: business.slug, name: "عميل تكرار", phone: "0500000111", serviceId: service.id, bookingDate, bookingTime: "11:00", requestId: bookingKey };
      const firstBooking = await request.post(`${baseUrl}/api/public/bookings`, { headers: { "Idempotency-Key": bookingKey }, data: bookingPayload });
      expect(firstBooking.status()).toBe(201);
      const firstBookingBody = await firstBooking.json() as { bookingId?: string; replayed?: boolean };
      expect(firstBookingBody.bookingId).toBeTruthy();
      expect(firstBookingBody.replayed).toBe(false);

      await db.business.update({ where: { id: business.id }, data: { bookingAvailable: false } });
      await db.service.update({ where: { id: service.id }, data: { isActive: false, bookingEnabled: false } });

      const replayBooking = await request.post(`${baseUrl}/api/public/bookings`, { headers: { "Idempotency-Key": bookingKey }, data: bookingPayload });
      expect(replayBooking.status()).toBe(200);
      const replayBookingBody = await replayBooking.json() as { bookingId?: string; replayed?: boolean };
      expect(replayBookingBody).toEqual({ ok: true, bookingId: firstBookingBody.bookingId, replayed: true });
      expect(await db.booking.count({ where: { businessId: business.id } })).toBe(1);

      const orderKey = crypto.randomUUID();
      const orderPayload = { slug: business.slug, name: "عميل تكرار", phone: "0500000111", items: [{ productId: product.id, quantity: 2 }], orderType: "pickup", requestId: orderKey };
      const firstOrder = await request.post(`${baseUrl}/api/public/orders`, { headers: { "Idempotency-Key": orderKey }, data: orderPayload });
      expect(firstOrder.status()).toBe(201);
      const firstOrderBody = await firstOrder.json() as { orderId?: string; replayed?: boolean };
      expect(firstOrderBody.orderId).toBeTruthy();
      expect(firstOrderBody.replayed).toBe(false);

      await db.business.update({ where: { id: business.id }, data: { acceptOnlineOrders: false } });
      await db.product.update({ where: { id: product.id }, data: { isActive: false } });

      const replayOrder = await request.post(`${baseUrl}/api/public/orders`, { headers: { "Idempotency-Key": orderKey }, data: orderPayload });
      expect(replayOrder.status()).toBe(200);
      const replayOrderBody = await replayOrder.json() as { orderId?: string; replayed?: boolean };
      expect(replayOrderBody).toEqual({ ok: true, orderId: firstOrderBody.orderId, replayed: true });
      expect(await db.order.count({ where: { businessId: business.id } })).toBe(1);
    } finally {
      await cleanup(business.id, user.id);
    }
  });
});
