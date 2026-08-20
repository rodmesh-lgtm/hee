import { expect, test, type APIRequestContext } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
let pool: Pool;
let db: PrismaClient;

type Seeded = { userId: string; businessId: string; serviceId: string; slug: string };

function riyadhDateKey(offsetDays: number) {
  const now = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function seed(): Promise<Seeded> {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const plan = await db.businessPlan.upsert({ where: { code: "FREE" }, update: { isActive: true }, create: { code: "FREE", name: "Free", monthlyPrice: 0, productLimit: 3, isActive: true } });
  const user = await db.user.create({ data: { name: "Duration Owner", email: `duration-${suffix}@hee.test`, passwordHash: "rc-only" } });
  const business = await db.business.create({
    data: {
      ownerId: user.id,
      planId: plan.id,
      name: "منشأة اختبار مدة الحجز",
      slug: `duration-${suffix}`,
      businessType: "خدمات",
      phone: "0555000033",
      whatsapp: "966555000033",
      isPublished: true,
      publishedAt: new Date(),
      bookingAvailable: true,
      onboardingCompleted: true,
    },
  });
  const service = await db.service.create({ data: { businessId: business.id, name: "جلسة ساعة", price: 100, durationMinutes: 60, bookingEnabled: true, isActive: true } });
  await db.workingHours.createMany({ data: Array.from({ length: 7 }, (_, dayOfWeek) => ({ businessId: business.id, dayOfWeek, opensAt: "08:00", closesAt: "18:00", isClosed: false })) });
  return { userId: user.id, businessId: business.id, serviceId: service.id, slug: business.slug };
}

async function cleanup(seed: Seeded) {
  await db.$executeRaw`DELETE FROM "PublicSubmission" WHERE "businessId" = ${seed.businessId}`;
  await db.booking.deleteMany({ where: { businessId: seed.businessId } });
  await db.customer.deleteMany({ where: { businessId: seed.businessId } });
  await db.workingHours.deleteMany({ where: { businessId: seed.businessId } });
  await db.service.deleteMany({ where: { businessId: seed.businessId } });
  await db.business.delete({ where: { id: seed.businessId } });
  await db.user.delete({ where: { id: seed.userId } });
}

async function postBooking(request: APIRequestContext, seeded: Seeded, date: string, time: string, phone: string) {
  const requestId = crypto.randomUUID();
  return request.post(`${baseUrl}/api/public/bookings`, {
    headers: { "Idempotency-Key": requestId },
    data: { slug: seeded.slug, name: "عميل مدة", phone, serviceId: seeded.serviceId, bookingDate: date, bookingTime: time, requestId },
  });
}

test.describe.serial("booking duration snapshot workflow", () => {
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

  test("keeps the original occupied duration after the service duration changes", async ({ request }) => {
    test.setTimeout(60_000);
    const seeded = await seed();
    const date = riyadhDateKey(2);

    try {
      const first = await postBooking(request, seeded, date, "10:00", "0500000201");
      expect(first.status()).toBe(201);

      const snapshots = await db.$queryRaw<Array<{ durationMinutes: number }>>`
        SELECT "durationMinutes" FROM "BookingDurationSnapshot"
        WHERE "bookingId" IN (SELECT "id" FROM "Booking" WHERE "businessId" = ${seeded.businessId})
      `;
      expect(snapshots).toEqual([{ durationMinutes: 60 }]);

      await db.service.update({ where: { id: seeded.serviceId }, data: { durationMinutes: 30 } });

      const overlapping = await postBooking(request, seeded, date, "10:45", "0500000202");
      expect(overlapping.status()).toBe(409);
      expect((await overlapping.json()).error).toContain("يتداخل");

      const boundary = await postBooking(request, seeded, date, "11:00", "0500000203");
      expect(boundary.status()).toBe(201);
    } finally {
      await cleanup(seeded);
    }
  });
});
