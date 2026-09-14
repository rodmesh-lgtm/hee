import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { normalizePublicSlug } from "../../../lib/public-url";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../lib/request-body";
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

type ExistingBookingRange = {
  id: string;
  bookingDate: string;
  bookingTime: string;
  durationMinutes: number;
};

type WorkingHoursState = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  secondOpensAt: string | null;
  secondClosesAt: string | null;
  isClosed: boolean;
};

type AvailabilityOverrideState = Omit<WorkingHoursState, "dayOfWeek"> & {
  date: string;
};

function bookingInsideResolvedSchedule(
  time: string,
  durationMinutes: number,
  dateOverride: AvailabilityOverrideState | null,
  weeklySchedule: Omit<WorkingHoursState, "dayOfWeek"> | null,
  previousDateOverride: AvailabilityOverrideState | null,
  previousWeeklySchedule: Omit<WorkingHoursState, "dayOfWeek"> | null,
) {
  if (dateOverride) return bookingWithinWorkingHours(time, durationMinutes, dateOverride);
  return (
    bookingWithinWorkingHours(time, durationMinutes, weeklySchedule) ||
    bookingWithinPreviousOvernightWorkingHours(
      time,
      durationMinutes,
      previousDateOverride ?? previousWeeklySchedule,
    )
  );
}

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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day ? date : null;
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

async function existingSubmission(businessId: string, idempotencyKey: string) {
  const rows = await db.$queryRaw<Array<{ targetId: string | null }>>`
    SELECT "targetId" FROM "PublicSubmission"
    WHERE "businessId" = ${businessId} AND "scope" = 'booking' AND "idempotencyKey" = ${idempotencyKey}
    LIMIT 1
  `;
  return rows[0]?.targetId ?? null;
}

const availabilityResponseHeaders = { "Cache-Control": "private, no-store, max-age=0" };

function riyadhDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dayOfWeekForDate(date: string) {
  const localNoon = new Date(`${date}T12:00:00+03:00`);
  return (localNoon.getUTCDay() + 6) % 7;
}

function timeFromMinutes(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const slug = normalizePublicSlug(requestUrl.searchParams.get("slug") ?? "");
  const serviceId = text(requestUrl.searchParams.get("serviceId"), 80);
  if (!slug || !serviceId) {
    return NextResponse.json({ ok: false, error: "اختر خدمة لعرض المواعيد" }, { status: 400, headers: availabilityResponseHeaders });
  }

  const today = riyadhDateKey();
  const lastDay = shiftBookingDate(today, 29);

  try {
    const business = await db.business.findFirst({
      where: {
        slug,
        deletedAt: null,
        isPublished: true,
        bookingAvailable: true,
        owner: { deletedAt: null, emailVerifiedAt: { not: null } },
      },
      select: {
        id: true,
        openingHours: {
          select: { dayOfWeek: true, opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
        },
        bookingAvailabilityOverrides: {
          where: { date: { gte: shiftBookingDate(today, -1), lte: lastDay } },
          select: { date: true, opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
        },
        services: {
          where: { id: serviceId, deletedAt: null, isActive: true, bookingEnabled: true },
          select: { id: true, durationMinutes: true },
          take: 1,
        },
      },
    });
    const service = business?.services[0];
    if (!business || !service) {
      return NextResponse.json({ ok: false, error: "الحجز أو الخدمة غير متاحين" }, { status: 409, headers: availabilityResponseHeaders });
    }

    const queryStart = shiftBookingDate(today, -1);
    const queryEnd = shiftBookingDate(lastDay, 1);
    const existingBookings = await db.$queryRaw<ExistingBookingRange[]>`
      SELECT
        b."id",
        b."bookingDate",
        b."bookingTime",
        COALESCE(
          snapshot."durationMinutes",
          CASE WHEN linked_service."durationMinutes" BETWEEN 5 AND 1440 THEN linked_service."durationMinutes" ELSE 30 END
        )::int AS "durationMinutes"
      FROM "Booking" b
      LEFT JOIN "BookingDurationSnapshot" snapshot ON snapshot."bookingId" = b."id"
      LEFT JOIN "Service" linked_service ON linked_service."id" = b."serviceId"
      WHERE b."businessId" = ${business.id}
        AND b."serviceId" = ${service.id}
        AND b."status" IN ('pending', 'confirmed')
        AND b."bookingDate" >= ${queryStart}
        AND b."bookingDate" <= ${queryEnd}
    `;

    const durationMinutes = normalizedBookingDuration(service.durationMinutes);
    const schedules = new Map(business.openingHours.map((item) => [item.dayOfWeek, item]));
    const overrides = new Map(business.bookingAvailabilityOverrides.map((item) => [item.date, item]));
    const minimumStart = Date.now() + 5 * 60 * 1000;
    const days = Array.from({ length: 30 }, (_, offset) => {
      const date = shiftBookingDate(today, offset);
      const dayOfWeek = dayOfWeekForDate(date);
      const schedule = schedules.get(dayOfWeek) ?? null;
      const previousSchedule = schedules.get(previousDay(dayOfWeek)) ?? null;
      const previousDate = shiftBookingDate(date, -1);
      const dateOverride = overrides.get(date) ?? null;
      const previousDateOverride = overrides.get(previousDate) ?? null;
      const nextDate = shiftBookingDate(date, 1);
      const dateOffsets = new Map([[previousDate, -1440], [date, 0], [nextDate, 1440]]);
      const slots: string[] = [];

      for (let minute = 0; minute < 1440; minute += 30) {
        const time = timeFromMinutes(minute);
        const start = riyadhDate(date, time);
        if (!start || start.getTime() < minimumStart) continue;
        const insideSchedule = bookingInsideResolvedSchedule(
          time,
          durationMinutes,
          dateOverride,
          schedule,
          previousDateOverride,
          previousSchedule,
        );
        if (!insideSchedule) continue;
        const overlaps = existingBookings.some((item) => {
          const offsetMinutes = dateOffsets.get(item.bookingDate);
          if (offsetMinutes === undefined) return false;
          const existingStart = offsetMinutes + bookingMinutes(item.bookingTime);
          return bookingIntervalsOverlap(minute, durationMinutes, existingStart, normalizedBookingDuration(item.durationMinutes));
        });
        if (!overlaps) slots.push(time);
      }

      return { date, dayOfWeek, available: slots.length > 0, slots };
    });

    return NextResponse.json(
      { ok: true, timezone: "Asia/Riyadh", durationMinutes, days },
      { headers: availabilityResponseHeaders },
    );
  } catch (error) {
    console.error("[public-booking] availability_lookup_failed", error);
    return NextResponse.json(
      { ok: false, error: "تعذر تحميل المواعيد المتاحة الآن" },
      { status: 503, headers: { ...availabilityResponseHeaders, "Retry-After": "30" } },
    );
  }
}

export async function POST(request: Request) {
  let body: BookingPayload;
  try {
    body = (await readBoundedJson(request, 64 * 1024)) as BookingPayload;
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof RequestBodyTooLargeError ? "حجم الحجز أكبر من المسموح" : "بيانات غير صالحة" },
      { status: error instanceof RequestBodyTooLargeError ? 413 : 400 },
    );
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

  let business: { id: string; bookingAvailable: boolean } | null;
  try {
    business = await db.business.findFirst({
      where: {
        slug,
        deletedAt: null,
        isPublished: true,
        owner: { deletedAt: null, emailVerifiedAt: { not: null } },
      },
      select: { id: true, bookingAvailable: true },
    });
  } catch (error) {
    console.error("[public-booking] business_lookup_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
  if (!business) return NextResponse.json({ ok: false }, { status: 404 });

  try {
    const replayTargetId = await existingSubmission(business.id, idempotencyKey);
    if (replayTargetId) {
      return NextResponse.json({ ok: true, bookingId: replayTargetId, replayed: true }, { status: 200 });
    }
  } catch (error) {
    console.error("[public-booking] idempotency_lookup_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
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

  if (!business.bookingAvailable) return NextResponse.json({ ok: false, error: "الحجز غير مفعل لهذا النشاط" }, { status: 409 });

  let service: { id: string; name: string; durationMinutes: number | null } | null;
  try {
    service = await db.service.findFirst({
      where: { id: serviceId, businessId: business.id, isActive: true, bookingEnabled: true, deletedAt: null },
      select: { id: true, name: true, durationMinutes: true },
    });
  } catch (error) {
    console.error("[public-booking] service_lookup_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
  if (!service) return NextResponse.json({ ok: false, error: "الخدمة غير متاحة للحجز" }, { status: 409 });
  const durationMinutes = normalizedBookingDuration(service.durationMinutes);

  const localNoon = new Date(`${bookingDate}T12:00:00+03:00`);
  const dayOfWeek = (localNoon.getUTCDay() + 6) % 7;
  let schedule: { opensAt: string | null; closesAt: string | null; secondOpensAt: string | null; secondClosesAt: string | null; isClosed: boolean } | null;
  let previousSchedule: typeof schedule;
  try {
    [schedule, previousSchedule] = await Promise.all([
      db.workingHours.findUnique({
        where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek } },
        select: { opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
      }),
      db.workingHours.findUnique({
        where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: previousDay(dayOfWeek) } },
        select: { opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
      }),
    ]);
  } catch (error) {
    console.error("[public-booking] schedule_lookup_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
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

      // Re-prove every mutable public-booking invariant at commit time. SHARE locks keep
      // publication, mailbox ownership, booking availability and service eligibility from
      // changing between this decision and the insert. The preflight above remains only a
      // fast user-facing rejection path; it is never the final authorization decision.
      const eligibleTargets = await tx.$queryRaw<Array<{ serviceId: string; durationMinutes: number | null }>>`
        SELECT s."id" AS "serviceId", s."durationMinutes"
        FROM "Business" b
        JOIN "User" u ON u."id" = b."ownerId"
        JOIN "Service" s ON s."businessId" = b."id"
        WHERE b."id" = ${business.id}
          AND b."slug" = ${slug}
          AND b."deletedAt" IS NULL
          AND b."isPublished" = true
          AND b."bookingAvailable" = true
          AND u."deletedAt" IS NULL
          AND u."emailVerifiedAt" IS NOT NULL
          AND s."id" = ${serviceId}
          AND s."deletedAt" IS NULL
          AND s."isActive" = true
          AND s."bookingEnabled" = true
        FOR SHARE OF b, u, s
      `;
      const currentService = eligibleTargets[0];
      if (!currentService) throw new Error("PUBLIC_BOOKING_TARGET_UNAVAILABLE");
      const currentDurationMinutes = normalizedBookingDuration(currentService.durationMinutes);

      const previousDayOfWeek = previousDay(dayOfWeek);
      const currentHours = await tx.$queryRaw<WorkingHoursState[]>`
        SELECT "dayOfWeek", "opensAt", "closesAt", "secondOpensAt", "secondClosesAt", "isClosed"
        FROM "WorkingHours"
        WHERE "businessId" = ${business.id}
          AND "dayOfWeek" IN (${dayOfWeek}, ${previousDayOfWeek})
        FOR SHARE
      `;
      const hoursByDay = new Map(currentHours.map((item) => [item.dayOfWeek, item]));
      const currentSchedule = hoursByDay.get(dayOfWeek) ?? null;
      const currentPreviousSchedule = hoursByDay.get(previousDayOfWeek) ?? null;
      const currentInTodayWindow = bookingWithinWorkingHours(bookingTime, currentDurationMinutes, currentSchedule);
      const currentInPreviousOvernightWindow = bookingWithinPreviousOvernightWorkingHours(bookingTime, currentDurationMinutes, currentPreviousSchedule);
      if (!currentInTodayWindow && !currentInPreviousOvernightWindow) throw new Error("PUBLIC_BOOKING_SCHEDULE_CHANGED");

      const previousBookingDate = shiftBookingDate(bookingDate, -1);
      const nextBookingDate = shiftBookingDate(bookingDate, 1);
      const existingBookings = await tx.$queryRaw<ExistingBookingRange[]>`
        SELECT
          b."id",
          b."bookingDate",
          b."bookingTime",
          COALESCE(
            snapshot."durationMinutes",
            CASE WHEN service."durationMinutes" BETWEEN 5 AND 1440 THEN service."durationMinutes" ELSE 30 END
          )::int AS "durationMinutes"
        FROM "Booking" b
        LEFT JOIN "BookingDurationSnapshot" snapshot ON snapshot."bookingId" = b."id"
        LEFT JOIN "Service" service ON service."id" = b."serviceId"
        WHERE b."businessId" = ${business.id}
          AND b."serviceId" = ${serviceId}
          AND b."status" IN ('pending', 'confirmed')
          AND (
            b."bookingDate" = ${previousBookingDate}
            OR b."bookingDate" = ${bookingDate}
            OR b."bookingDate" = ${nextBookingDate}
          )
      `;
      const requestedStart = bookingMinutes(bookingTime);
      const offsets = new Map([[previousBookingDate, -1440], [bookingDate, 0], [nextBookingDate, 1440]]);
      if (existingBookings.some((item) => {
        const existingStart = (offsets.get(item.bookingDate) ?? 0) + bookingMinutes(item.bookingTime);
        return bookingIntervalsOverlap(requestedStart, currentDurationMinutes, existingStart, normalizedBookingDuration(item.durationMinutes));
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
          serviceId: currentService.serviceId,
          bookingDate,
          bookingTime,
          notes: notes || null,
          status: "pending",
        },
        select: { id: true },
      });
      await tx.$executeRaw`
        INSERT INTO "BookingDurationSnapshot" ("bookingId", "durationMinutes")
        VALUES (${booking.id}, ${currentDurationMinutes})
      `;
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
    if (error instanceof Error && error.message === "PUBLIC_BOOKING_TARGET_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: "الحجز أو الخدمة لم يعودا متاحين لهذا النشاط" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "PUBLIC_BOOKING_SCHEDULE_CHANGED") {
      return NextResponse.json({ ok: false, error: "تغيرت ساعات العمل أو مدة الخدمة. اختر موعدًا متاحًا من جديد." }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ ok: false, error: "هذا الموعد محجوز بالفعل" }, { status: 409 });
    }
    console.error("[public-booking] write_failed", error);
    return NextResponse.json({ ok: false, error: "تعذر تسجيل الحجز الآن" }, { status: 503, headers: { "Retry-After": "30" } });
  }
}
