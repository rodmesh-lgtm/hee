import { Prisma } from "@prisma/client";
import { after, NextResponse } from "next/server";
import { db } from "../../../lib/db";
import { consumePublicWriteLimit, requestClientAddress } from "../../../lib/rate-limit";
import { normalizePublicSlug } from "../../../lib/public-url";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../lib/request-body";
import { bookingIntervalsOverlap, bookingMinutes, bookingWithinPreviousOvernightWorkingHours, bookingWithinWorkingHours, normalizedBookingDuration } from "../../../lib/booking-time";
import { emitInternalWhatsAppAutomationEvent } from "../../../lib/whatsapp/automation-event-producer";
import { processWhatsAppAutomationEvent } from "../../../lib/whatsapp/automation-processor";
import { processNextWhatsAppAutomationDelivery } from "../../../lib/whatsapp/automation-delivery-worker";
import { normalizeE164 } from "../../../lib/whatsapp/contact-domain";
import { hasActiveBusinessSubscription } from "../../../lib/subscription-entitlement";
import { sallaBookingGate } from "../../../lib/commerce/booking-eligibility";

export const maxDuration = 60;

type BookingPayload = {
  slug?: unknown;
  name?: unknown;
  phone?: unknown;
  serviceId?: unknown;
  branchId?: unknown;
  bookingDate?: unknown;
  bookingTime?: unknown;
  notes?: unknown;
  requestId?: unknown;
  whatsappConfirmationConsent?: unknown;
};

type ExistingBookingRange = {
  id: string;
  bookingDate: string;
  bookingTime: string;
  durationMinutes: number;
};

type PublicBookingBranch = {
  id: string;
  name: string;
  city: string | null;
  bookingSlotMinutes: number;
  bookingCapacity: number;
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

function bookingAlignedToResolvedSchedule(
  time: string,
  slotMinutes: number,
  dateOverride: AvailabilityOverrideState | null,
  weeklySchedule: Omit<WorkingHoursState, "dayOfWeek"> | null,
  previousDateOverride: AvailabilityOverrideState | null,
  previousWeeklySchedule: Omit<WorkingHoursState, "dayOfWeek"> | null,
) {
  const minute = bookingMinutes(time);
  const current = dateOverride ?? weeklySchedule;
  const anchors = [current?.opensAt, current?.secondOpensAt]
    .filter((candidate): candidate is string => Boolean(candidate))
    .map(bookingMinutes);
  const previous = previousDateOverride ?? previousWeeklySchedule;
  for (const [open, close] of [[previous?.opensAt, previous?.closesAt], [previous?.secondOpensAt, previous?.secondClosesAt]]) {
    if (open && close && bookingMinutes(close) <= bookingMinutes(open)) anchors.push(bookingMinutes(open) - 1440);
  }
  return anchors.some((anchor) => minute >= anchor && (minute - anchor) % slotMinutes === 0);
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

function bookingWhatsAppPhone(value: unknown) {
  if (typeof value !== "string") return null;
  const direct = normalizeE164(value);
  if (direct) return direct;
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("966")) return normalizeE164(`+${digits}`);
  return normalizeE164(value, "966");
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
  const requestedBranchId = text(requestUrl.searchParams.get("branchId"), 80);
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
        bookingSlotMinutes: true,
        bookingCapacity: true,
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
        branches: {
          where: { isActive: true, bookingEnabled: true },
          orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
          select: { id: true, name: true, city: true, bookingSlotMinutes: true, bookingCapacity: true },
        },
      },
    });
    const service = business?.services[0];
    if (!business || !service || !await hasActiveBusinessSubscription({ businessId: business.id })) {
      return NextResponse.json({ ok: false, error: "الحجز أو الخدمة غير متاحين" }, { status: 409, headers: availabilityResponseHeaders });
    }
    const publicBranches: PublicBookingBranch[] = business.branches;
    const publicBranchSummaries = publicBranches.map((branch) => ({
      id: branch.id,
      name: branch.name,
      city: branch.city,
      bookingSlotMinutes: branch.bookingSlotMinutes,
    }));
    const selectedBranch = requestedBranchId
      ? publicBranches.find((branch) => branch.id === requestedBranchId) ?? null
      : publicBranches.length === 1 ? publicBranches[0] : null;
    if (requestedBranchId && !selectedBranch) {
      return NextResponse.json({ ok: false, error: "الفرع غير متاح للحجز" }, { status: 409, headers: availabilityResponseHeaders });
    }
    if (publicBranches.length > 1 && !selectedBranch) {
      return NextResponse.json({ ok: true, timezone: "Asia/Riyadh", branches: publicBranchSummaries, requiresBranch: true, days: [] }, { headers: availabilityResponseHeaders });
    }
    const slotMinutes = selectedBranch?.bookingSlotMinutes ?? business.bookingSlotMinutes;
    const capacity = selectedBranch?.bookingCapacity ?? business.bookingCapacity;

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
        AND (${selectedBranch?.id ?? null}::text IS NULL AND b."branchId" IS NULL OR b."branchId" = ${selectedBranch?.id ?? null})
        AND b."status" IN ('pending', 'confirmed')
        AND b."bookingDate" >= ${queryStart}
        AND b."bookingDate" <= ${queryEnd}
    `;

    const durationMinutes = slotMinutes;
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
      const slotDetails: Array<{ start: string; end: string }> = [];

      for (let minute = 0; minute < 1440; minute += 15) {
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
        if (!bookingAlignedToResolvedSchedule(time, slotMinutes, dateOverride, schedule, previousDateOverride, previousSchedule)) continue;
        const occupied = existingBookings.filter((item) => {
          const offsetMinutes = dateOffsets.get(item.bookingDate);
          if (offsetMinutes === undefined) return false;
          const existingStart = offsetMinutes + bookingMinutes(item.bookingTime);
          return bookingIntervalsOverlap(minute, durationMinutes, existingStart, normalizedBookingDuration(item.durationMinutes));
        }).length;
        const remaining = Math.max(0, capacity - occupied);
        if (remaining > 0) {
          slots.push(time);
          slotDetails.push({ start: time, end: timeFromMinutes((minute + slotMinutes) % 1440) });
        }
      }

      return { date, dayOfWeek, available: slots.length > 0, slots, slotDetails };
    });

    return NextResponse.json(
      {
        ok: true,
        timezone: "Asia/Riyadh",
        durationMinutes,
        slotMinutes,
        branches: publicBranchSummaries,
        selectedBranchId: selectedBranch?.id ?? null,
        days,
      },
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
  const bookingPhoneE164 = bookingWhatsAppPhone(body.phone);
  const phone = bookingPhoneE164 ? bookingPhoneE164.slice(1) : normalizedPhone(body.phone);
  const serviceId = text(body.serviceId, 80);
  const branchId = text(body.branchId, 80);
  const bookingDate = validDate(body.bookingDate);
  const bookingTime = validTime(body.bookingTime);
  const notes = text(body.notes, 1000);
  const idempotencyKey = requestKey(request.headers.get("idempotency-key") || body.requestId);
  const whatsappConfirmationConsent = body.whatsappConfirmationConsent === true;
  const whatsappPhone = whatsappConfirmationConsent ? bookingPhoneE164 : null;

  if (!slug || !name || !phone || !bookingPhoneE164 || !serviceId || !bookingDate || !bookingTime || notes === null || !idempotencyKey || (whatsappConfirmationConsent && !whatsappPhone)) {
    return NextResponse.json({ ok: false, error: "بيانات الحجز غير مكتملة" }, { status: 400 });
  }

  let business: { id: string; bookingAvailable: boolean; bookingSlotMinutes: number; bookingCapacity: number } | null;
  try {
    business = await db.business.findFirst({
      where: {
        slug,
        deletedAt: null,
        isPublished: true,
        owner: { deletedAt: null, emailVerifiedAt: { not: null } },
      },
      select: { id: true, bookingAvailable: true, bookingSlotMinutes: true, bookingCapacity: true },
    });
  } catch (error) {
    console.error("[public-booking] business_lookup_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
  if (!business) return NextResponse.json({ ok: false }, { status: 404 });
  if (!await hasActiveBusinessSubscription({ businessId: business.id })) {
    return NextResponse.json({ ok: false, error: "الحجز متوقف لأن اشتراك المنشأة غير نشط" }, { status: 409 });
  }

  try {
    const replayTargetId = await existingSubmission(business.id, idempotencyKey);
    if (replayTargetId) {
      const confirmationEvent = await db.whatsAppAutomationEvent.findUnique({
        where: { businessId_source_externalEventId: { businessId: business.id, source: "ir.booking.confirmation", externalEventId: replayTargetId } },
        select: { id: true },
      });
      return NextResponse.json({ ok: true, bookingId: replayTargetId, replayed: true, whatsappConfirmationQueued: Boolean(confirmationEvent) }, { status: 200 });
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
  let activeBranches: Array<{ id: string; bookingSlotMinutes: number; bookingCapacity: number }>;
  try {
    activeBranches = await db.branch.findMany({
      where: { businessId: business.id, isActive: true, bookingEnabled: true },
      select: { id: true, bookingSlotMinutes: true, bookingCapacity: true },
    });
  } catch (error) {
    console.error("[public-booking] branch_lookup_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
  const selectedBranch = branchId ? activeBranches.find((branch) => branch.id === branchId) ?? null : activeBranches.length === 1 ? activeBranches[0] : null;
  if (activeBranches.length > 1 && !selectedBranch) return NextResponse.json({ ok: false, error: "اختر الفرع المطلوب" }, { status: 400 });
  if (branchId && !selectedBranch) return NextResponse.json({ ok: false, error: "الفرع غير متاح للحجز" }, { status: 409 });
  const durationMinutes = selectedBranch?.bookingSlotMinutes ?? business.bookingSlotMinutes;

  const localNoon = new Date(`${bookingDate}T12:00:00+03:00`);
  const dayOfWeek = (localNoon.getUTCDay() + 6) % 7;
  type Schedule = Omit<WorkingHoursState, "dayOfWeek">;
  let schedule: Schedule | null;
  let previousSchedule: Schedule | null;
  let dateOverride: AvailabilityOverrideState | null;
  let previousDateOverride: AvailabilityOverrideState | null;
  const previousBookingDate = shiftBookingDate(bookingDate, -1);
  try {
    [schedule, previousSchedule, dateOverride, previousDateOverride] = await Promise.all([
      db.workingHours.findUnique({
        where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek } },
        select: { opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
      }),
      db.workingHours.findUnique({
        where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: previousDay(dayOfWeek) } },
        select: { opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
      }),
      db.bookingAvailabilityOverride.findUnique({
        where: { businessId_date: { businessId: business.id, date: bookingDate } },
        select: { date: true, opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
      }),
      db.bookingAvailabilityOverride.findUnique({
        where: { businessId_date: { businessId: business.id, date: previousBookingDate } },
        select: { date: true, opensAt: true, closesAt: true, secondOpensAt: true, secondClosesAt: true, isClosed: true },
      }),
    ]);
  } catch (error) {
    console.error("[public-booking] schedule_lookup_failed", error);
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Retry-After": "30" } });
  }
  const insideResolvedSchedule = bookingInsideResolvedSchedule(
    bookingTime,
    durationMinutes,
    dateOverride,
    schedule,
    previousDateOverride,
    previousSchedule,
  );
  if (!insideResolvedSchedule) {
    return NextResponse.json({
      ok: false,
      error: dateOverride?.isClosed
        ? "هذا التاريخ مغلق للحجز"
        : schedule || previousSchedule || dateOverride || previousDateOverride
          ? "مدة الخدمة لا تقع بالكامل داخل الأوقات المتاحة"
          : "لم يتم ضبط أوقات الحجز لهذا اليوم",
    }, { status: 409 });
  }
  if (!bookingAlignedToResolvedSchedule(bookingTime, durationMinutes, dateOverride, schedule, previousDateOverride, previousSchedule)) {
    return NextResponse.json({ ok: false, error: "اختر إحدى الفترات المحددة للفرع" }, { status: 409 });
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
    const eligibility = await sallaBookingGate({ businessId: business.id, phoneE164: bookingPhoneE164 });
    if (eligibility.required && !eligibility.eligible) {
      return NextResponse.json({
        ok: false,
        error: "استخدم رقم الجوال المسجل في طلب مدفوع ومؤكد من متجر هذه المنشأة.",
      }, { status: 403 });
    }
  } catch (error) {
    console.error("[public-booking] commerce_eligibility_lookup_failed", error);
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
      if (previous[0]?.targetId) return { id: previous[0].targetId, replayed: true, confirmationEventId: null };

      // Serialize the exact branch/date/slot capacity check so simultaneous visitors
      // cannot exceed the configured seat count.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`booking-slot:${business.id}:${selectedBranch?.id ?? "business"}:${bookingDate}:${bookingTime}`}))`;

      // Re-prove every mutable public-booking invariant at commit time. SHARE locks keep
      // publication, mailbox ownership, booking availability and service eligibility from
      // changing between this decision and the insert. The preflight above remains only a
      // fast user-facing rejection path; it is never the final authorization decision.
      const eligibleTargets = await tx.$queryRaw<Array<{ serviceId: string; bookingSlotMinutes: number; bookingCapacity: number }>>`
        SELECT s."id" AS "serviceId", b."bookingSlotMinutes", b."bookingCapacity"
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
          AND EXISTS (
            SELECT 1
            FROM "Subscription" subscription
            WHERE subscription."businessId" = b."id"
              AND subscription."status" = 'active'
              AND subscription."startsAt" <= CURRENT_TIMESTAMP
              AND (
                (subscription."provider" IS DISTINCT FROM 'access_code' AND subscription."endsAt" > CURRENT_TIMESTAMP)
                OR (
                  subscription."provider" = 'access_code'
                  AND subscription."autoRenew" = false
                  AND subscription."endsAt" IS NULL
                  AND EXISTS (
                    SELECT 1
                    FROM "SubscriptionAccessGrant" access_grant
                    JOIN "SubscriptionAccessCode" access_code ON access_code."id" = access_grant."codeId"
                    WHERE access_grant."subscriptionId" = subscription."id"
                      AND access_grant."businessId" = b."id"
                      AND access_grant."revokedAt" IS NULL
                      AND access_code."isActive" = true
                      AND access_code."revokedAt" IS NULL
                      AND (access_code."expiresAt" IS NULL OR access_code."expiresAt" > CURRENT_TIMESTAMP)
                  )
                )
              )
          )
          AND (
            NOT EXISTS (
              SELECT 1 FROM "WhatsAppCommerceIntegration" salla_integration
              WHERE salla_integration."businessId" = b."id"
                AND salla_integration."provider" = 'salla'
                AND salla_integration."status" = 'active'
            )
            OR EXISTS (
              SELECT 1
              FROM "CommerceBookingEligibility" booking_eligibility
              JOIN "WhatsAppCommerceIntegration" eligibility_integration
                ON eligibility_integration."id" = booking_eligibility."integrationId"
               AND eligibility_integration."businessId" = booking_eligibility."businessId"
              WHERE booking_eligibility."businessId" = b."id"
                AND booking_eligibility."provider" = 'salla'
                AND booking_eligibility."phoneE164" = ${bookingPhoneE164}
                AND booking_eligibility."eligible" = true
                AND eligibility_integration."provider" = 'salla'
                AND eligibility_integration."status" = 'active'
            )
          )
        FOR SHARE OF b, u, s
      `;
      const currentService = eligibleTargets[0];
      if (!currentService) {
        const gate = await sallaBookingGate({ businessId: business.id, phoneE164: bookingPhoneE164, database: tx });
        if (gate.required && !gate.eligible) throw new Error("PUBLIC_BOOKING_CUSTOMER_INELIGIBLE");
        throw new Error("PUBLIC_BOOKING_TARGET_UNAVAILABLE");
      }
      const currentBranches = selectedBranch ? await tx.$queryRaw<Array<{ id: string; bookingSlotMinutes: number; bookingCapacity: number }>>`
        SELECT "id", "bookingSlotMinutes", "bookingCapacity"
        FROM "Branch"
        WHERE "id" = ${selectedBranch.id}
          AND "businessId" = ${business.id}
          AND "isActive" = true
          AND "bookingEnabled" = true
        FOR SHARE
      ` : [];
      const currentBranch = currentBranches[0] ?? null;
      if (selectedBranch && !currentBranch) throw new Error("PUBLIC_BOOKING_TARGET_UNAVAILABLE");
      const currentDurationMinutes = currentBranch?.bookingSlotMinutes ?? currentService.bookingSlotMinutes;
      const currentCapacity = currentBranch?.bookingCapacity ?? currentService.bookingCapacity;

      const previousDayOfWeek = previousDay(dayOfWeek);
      const currentHours = await tx.$queryRaw<WorkingHoursState[]>`
        SELECT "dayOfWeek", "opensAt", "closesAt", "secondOpensAt", "secondClosesAt", "isClosed"
        FROM "WorkingHours"
        WHERE "businessId" = ${business.id}
          AND "dayOfWeek" IN (${dayOfWeek}, ${previousDayOfWeek})
        FOR SHARE
      `;
      const currentOverrides = await tx.$queryRaw<AvailabilityOverrideState[]>`
        SELECT "date", "opensAt", "closesAt", "secondOpensAt", "secondClosesAt", "isClosed"
        FROM "BookingAvailabilityOverride"
        WHERE "businessId" = ${business.id}
          AND "date" IN (${bookingDate}, ${previousBookingDate})
        FOR SHARE
      `;
      const hoursByDay = new Map(currentHours.map((item) => [item.dayOfWeek, item]));
      const overridesByDate = new Map(currentOverrides.map((item) => [item.date, item]));
      const currentSchedule = hoursByDay.get(dayOfWeek) ?? null;
      const currentPreviousSchedule = hoursByDay.get(previousDayOfWeek) ?? null;
      const currentDateOverride = overridesByDate.get(bookingDate) ?? null;
      const currentPreviousDateOverride = overridesByDate.get(previousBookingDate) ?? null;
      if (!bookingInsideResolvedSchedule(
        bookingTime,
        currentDurationMinutes,
        currentDateOverride,
        currentSchedule,
        currentPreviousDateOverride,
        currentPreviousSchedule,
      )) throw new Error("PUBLIC_BOOKING_SCHEDULE_CHANGED");
      if (!bookingAlignedToResolvedSchedule(
        bookingTime,
        currentDurationMinutes,
        currentDateOverride,
        currentSchedule,
        currentPreviousDateOverride,
        currentPreviousSchedule,
      )) throw new Error("PUBLIC_BOOKING_SCHEDULE_CHANGED");

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
          AND (${currentBranch?.id ?? null}::text IS NULL AND b."branchId" IS NULL OR b."branchId" = ${currentBranch?.id ?? null})
          AND b."status" IN ('pending', 'confirmed')
          AND (
            b."bookingDate" = ${previousBookingDate}
            OR b."bookingDate" = ${bookingDate}
            OR b."bookingDate" = ${nextBookingDate}
          )
      `;
      const requestedStart = bookingMinutes(bookingTime);
      const offsets = new Map([[previousBookingDate, -1440], [bookingDate, 0], [nextBookingDate, 1440]]);
      const occupiedSeats = existingBookings.filter((item) => {
        const existingStart = (offsets.get(item.bookingDate) ?? 0) + bookingMinutes(item.bookingTime);
        return bookingIntervalsOverlap(requestedStart, currentDurationMinutes, existingStart, normalizedBookingDuration(item.durationMinutes));
      }).length;
      if (occupiedSeats >= currentCapacity) throw new Error("PUBLIC_BOOKING_SLOT_FULL");

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
          branchId: currentBranch?.id ?? null,
          bookingDate,
          bookingTime,
          slotEndTime: timeFromMinutes((bookingMinutes(bookingTime) + currentDurationMinutes) % 1440),
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
      let confirmationEventId: string | null = null;
      if (whatsappConfirmationConsent && whatsappPhone) {
        await tx.whatsAppContact.upsert({
          where: { businessId_phoneE164: { businessId: business.id, phoneE164: whatsappPhone } },
          create: { businessId: business.id, phoneE164: whatsappPhone, displayName: name, source: "booking" },
          update: { displayName: name },
          select: { id: true },
        });
        await tx.whatsAppConsent.upsert({
          where: { businessId_phoneE164: { businessId: business.id, phoneE164: whatsappPhone } },
          create: {
            businessId: business.id,
            customerId: customer.id,
            phoneE164: whatsappPhone,
            source: "booking",
            evidence: `public_booking_confirmation_opt_in:v1:${idempotencyKey}`,
            consentedAt: new Date(),
          },
          update: {
            customerId: customer.id,
            source: "booking",
            evidence: `public_booking_confirmation_opt_in:v1:${idempotencyKey}`,
            consentedAt: new Date(),
            revokedAt: null,
          },
        });
        const emitted = await emitInternalWhatsAppAutomationEvent({
          database: tx,
          businessId: business.id,
          source: "ir.booking.confirmation",
          externalEventId: booking.id,
          triggerType: "booking_confirmation",
          subjectType: "booking.created",
          subjectId: booking.id,
          customerPhone: whatsappPhone,
        });
        confirmationEventId = emitted.emitted ? emitted.eventId : null;
      }
      return { id: booking.id, replayed: false, confirmationEventId };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    if (result.confirmationEventId) {
      after(async () => {
        try {
          const processed = await processWhatsAppAutomationEvent({ eventId: result.confirmationEventId!, workerId: `booking-${result.id}` });
          for (let index = 0; index < processed.jobs; index += 1) await processNextWhatsAppAutomationDelivery();
        } catch (error) {
          console.error("[public-booking] whatsapp_confirmation_deferred", error instanceof Error ? error.message : "unknown");
        }
      });
    }
    return NextResponse.json({ ok: true, bookingId: result.id, replayed: result.replayed, whatsappConfirmationQueued: Boolean(result.confirmationEventId) }, { status: result.replayed ? 200 : 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "PUBLIC_BOOKING_SLOT_FULL") {
      return NextResponse.json({ ok: false, error: "اكتملت سعة هذه الفترة. اختر الفترة التالية المتاحة." }, { status: 409 });
    }
    if (error instanceof Error && error.message === "PUBLIC_BOOKING_TARGET_UNAVAILABLE") {
      return NextResponse.json({ ok: false, error: "الحجز أو الخدمة لم يعودا متاحين لهذا النشاط" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "PUBLIC_BOOKING_CUSTOMER_INELIGIBLE") {
      return NextResponse.json({ ok: false, error: "استخدم رقم الجوال المسجل في طلب مدفوع ومؤكد من متجر هذه المنشأة." }, { status: 403 });
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
