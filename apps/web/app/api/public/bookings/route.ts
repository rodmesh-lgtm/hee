import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { normalizePublicSlug } from "../../../lib/public-url";
import { bookingIntervalsOverlap, bookingMinutes, bookingWithinPreviousOvernightWorkingHours, bookingWithinWorkingHours, normalizedBookingDuration } from "../../../lib/booking-time";

type BookingPayload = {
  slug?: unknown;
  name?: unknown;
  phone?: unknown;
  serviceId?: unknown;
  bookingDate?: unknown;
  bookingTime?: unknown;
  notes?: unknown;
  requestId?: unknown;
};

function text(value: unknown, max: number) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length <= max ? normalized : null;
}

function normalizedPhone(value: unknown) {
  const raw = typeof value === "string" ? value.trim() : "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

function requestKey(value: unknown) {
  const key = typeof value === "string" ? value.trim() : "";
  return key.length >= 16 && key.length <= 128 && /^[A-Za-z0-9._:-]+$/.test(key) ? key : null;
}

function validDate(value: unknown) {
  const date = typeof value === "string" ? value.trim() : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function validTime(value: unknown) {
  const time = typeof value === "string" ? value.trim() : "";
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

function riyadhDate(date: string, time: string) {
  const parsed = new Date(`${date}T${time}:00+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function previousDay(dayOfWeek: number) {
  return (dayOfWeek + 6) % 7;
}

function shiftBookingDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export async function POST(request: Request) {
  let body: BookingPayload;
  try {
    body = (await request.json()) as BookingPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "بيانات غير صالحة" }, { status: 400 });
  }

  const slug = normalizePublicSlug(String(body.slug ?? ""));
  const name = text(body.name, 120);
  const phone = normalizedPhone(body.phone);
  const serviceId = text(body.serviceId, 80);
  const bookingDate = validDate(body.bookingDate);
  const bookingTime = validTime(body.bookingTime);
  const notes = text(body.notes, 1000);
  const idempotencyKey = requestKey(request.headers.get("idempotency-key") || body.requestId);

  if (!slug || !name || !phone || !serviceId || !bookingDate || !bookingTime || notes === null || !idempotencyKey) {
    return NextResponse.json({ ok: false, error: "بيانات الحجز غير مكتملة" }, { status: 400 });
  }

  const startsAt = riyadhDate(bookingDate, bookingTime);
  if (!startsAt) return NextResponse.json({ ok: false, error: "موعد الحجز غير صالح" }, { status: 400 });
  const now = Date.now();
  if (startsAt.getTime() < now + 5 * 60 * 1000) {
    return NextResponse.json({ ok: false, error: "اختر موعداً مستقبلياً" }, { status: 400 });
  }
  if (startsAt.getTime() > now + 180 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ ok: false, error: "لا يمكن الحجز لأكثر من 180 يوماً مقدماً" }, { status: 400 });
  }

  const business = await db.business.findFirst({
    where: { slug, deletedAt: null, isPublished: true },
    select: { id: true, bookingAvailable: true },
  });
  if (!business) return NextResponse.json({ ok: false }, { status: 404 });
  if (!business.bookingAvailable) return NextResponse.json({ ok: false, error: "الحجز غير مفعل لهذا النشاط" }, { status: 409 });

  const service = await db.service.findFirst({
    where: { id: serviceId, businessId: business.id, isActive: true, bookingEnabled: true, deletedAt: null },
    select: { id: true, name: true, durationMinutes: true },
  });
  if (!service) return NextResponse.json({ ok: false, error: "الخدمة غير متاحة للحجز" }, { status: 409 });
  const durationMinutes = normalizedBookingDuration(service.durationMinutes);

  const localNoon = new Date(`${bookingDate}T12:00:00+03:00`);
  const dayOfWeek = (localNoon.getUTCDay() + 6) % 7;
  const [schedule, previousSchedule] = await Promise.all([
    db.workingHours.findUnique({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek } },
      select: { opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
    }),
    db.workingHours.findUnique({
      where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: previousDay(dayOfWeek) } },
      select: { opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
    }),
  ]);
  const inTodayWindow = bookingWithinWorkingHours(bookingTime, durationMinutes, schedule);
  const inPreviousOvernightWindow = bookingWithinPreviousOvernightWorkingHours(bookingTime, durationMinutes, previousSchedule);
  if (!inTodayWindow && !inPreviousOvernightWindow) {
    return NextResponse.json({ ok: false, error: schedule || previousSchedule ? "مدة الخدمة لا تقع بالكامل داخل ساعات العمل" : "لم يتم ضبط ساعات العمل لهذا اليوم" }, { status: 409 });
  }

  try {
    const address = requestClientAddress(request) || "unknown";
    const [ipRate, phoneRate] = await Promise.all([
      consumePublicWriteLimit({ scope: "public-booking-ip", businessId: business.id, identity: address, limit: 10, windowSeconds: 600 }),
      consumePublicWriteLimit({ scope: "public-booking-phone", businessId: business.id, identity: phone, limit: 5, windowSeconds: 600 }),
    ]);
    if (!ipRate.allowed || !phoneRate.allowed) {
      const retryAfter = Math.max(1, ipRate.retryAfterSeconds, phoneRate.retryAfterSeconds);
      return NextResponse.json({ ok: false, error: "تم إرسال حجوزات كثيرة. حاول لاحقاً." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
  } catch (error) {
    console.error("[public-booking] rate_limit_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`public-booking:${business.id}:${idempotencyKey}`}))`;
      const previous = await tx.$queryRaw<Array<{ targetId: string | null }>>`
        SELECT "targetId" FROM "PublicSubmission"
        WHERE "businessId" = ${business.id} AND "scope" = 'booking' AND "idempotencyKey" = ${idempotencyKey}
        LIMIT 1
      `;
      if (previous[0]?.targetId) return { id: previous[0].targetId, replayed: true };

      // Serialize bookings per service, not per calendar day. Overnight services can
      // otherwise race across midnight (for example Monday 23:30 vs Tuesday 00:00).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking-service:${business.id}:${serviceId}`}))`;
      const previousBookingDate = shiftBookingDate(bookingDate, -1);
      const nextBookingDate = shiftBookingDate(bookingDate, 1);
      const existingBookings = await tx.booking.findMany({
        where: {
          businessId: business.id,
          serviceId,
          bookingDate: { in: [previousBookingDate, bookingDate, nextBookingDate] },
          status: { in: ["pending", "confirmed"] },
        },
        select: { id: true, bookingDate: true, bookingTime: true },
      });
      const requestedStart = bookingMinutes(bookingTime);
      const offsets = new Map([[previousBookingDate, -1440], [bookingDate, 0], [nextBookingDate, 1440]]);
      if (existingBookings.some((item) => {
        const existingStart = (offsets.get(item.bookingDate) ?? 0) + bookingMinutes(item.bookingTime);
        return bookingIntervalsOverlap(requestedStart, durationMinutes, existingStart, durationMinutes);
      })) {
        throw new Error("PUBLIC_BOOKING_SLOT_TAKEN");
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`customer:${business.id}:${phone}`}))`;
      let customer = await tx.customer.findFirst({
        where: { businessId: business.id, phone },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true },
      });
      if (!customer) {
        customer = await tx.customer.create({ data: { businessId: business.id, name, phone }, select: { id: true, name: true } });
      } else if (customer.name !== name) {
        await tx.customer.update({ where: { id: customer.id }, data: { name } });
      }

      const booking = await tx.booking.create({
        data: {
          businessId: business.id,
          customerId: customer.id,
          serviceId: service.id,
          bookingDate,
          bookingTime,
          notes: notes || null,
          status: "pending",
        },
        select: { id: true },
      });
      await tx.$executeRaw`
        INSERT INTO "PublicSubmission" ("businessId", "scope", "idempotencyKey", "targetId")
        VALUES (${business.id}, 'booking', ${idempotencyKey}, ${booking.id})
      `;
      return { id: booking.id, replayed: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    return NextResponse.json({ ok: true, bookingId: result.id, replayed: result.replayed }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PUBLIC_BOOKING_SLOT_TAKEN") {
      return NextResponse.json({ ok: false, error: "هذا الوقت يتداخل مع حجز قائم للخدمة" }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "هذا الموعد محجوز بالفعل" }, { status: 409 });
    }
    console.error("[public-booking] write_failed", error);
    return NextResponse.json({ ok: false, error: "تعذر تسجيل الحجز الآن" }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
