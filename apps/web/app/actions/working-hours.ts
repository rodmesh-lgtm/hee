"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite } from "../lib/ownership";
import { isValidWorkingTime, validateWorkingHoursWindow } from "../lib/working-hours-validation";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validOptionalTime(raw: string) {
  return !raw || isValidWorkingTime(raw);
}

function invalid(reason: "time" | "window") {
  redirect(`/dashboard/working-hours?error=${reason}`);
}

function validDate(raw: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) return false;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return parsed.toISOString().slice(0, 10) === raw;
}

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

function shiftDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function refreshAppointmentPaths(slug: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/working-hours");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/inbox");
  revalidatePath("/preview");
  revalidatePath(`/${slug}`);
}

function boundedInteger(raw: string, minimum: number, maximum: number) {
  if (!/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function updateBookingSlotSettingsAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");

  const defaultDuration = boundedInteger(value(formData, "defaultSlotMinutes"), 15, 480);
  const defaultCapacity = boundedInteger(value(formData, "defaultCapacity"), 1, 500);
  if (!defaultDuration || defaultDuration % 15 !== 0 || !defaultCapacity) {
    redirect("/dashboard/working-hours?error=slot-settings");
  }

  const branches = await db.branch.findMany({
    where: { businessId: business.id, isActive: true },
    select: { id: true },
  });
  const branchUpdates = branches.map((branch) => {
    const capacity = boundedInteger(value(formData, `capacity-${branch.id}`), 1, 500);
    const slotMinutes = boundedInteger(value(formData, `slot-${branch.id}`), 15, 480);
    if (!capacity || !slotMinutes || slotMinutes % 15 !== 0) return null;
    return db.branch.updateMany({
      where: { id: branch.id, businessId: business.id },
      data: {
        bookingEnabled: formData.get(`enabled-${branch.id}`) === "on",
        bookingCapacity: capacity,
        bookingSlotMinutes: slotMinutes,
      },
    });
  });
  if (branchUpdates.some((operation) => operation === null)) {
    redirect("/dashboard/working-hours?error=slot-settings");
  }

  await db.$transaction([
    db.business.updateMany({
      where: { id: business.id, ownerId: business.ownerId, deletedAt: null },
      data: { bookingSlotMinutes: defaultDuration, bookingCapacity: defaultCapacity },
    }),
    ...branchUpdates.filter((operation): operation is NonNullable<typeof operation> => operation !== null),
  ]);
  refreshAppointmentPaths(business.slug);
  redirect("/dashboard/working-hours?saved=slots");
}

export async function upsertBookingAvailabilityOverrideAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");

  const date = value(formData, "date");
  const mode = value(formData, "mode");
  const note = value(formData, "note").slice(0, 240);
  const opensAt = value(formData, "opensAt");
  const closesAt = value(formData, "closesAt");
  const secondOpensAt = value(formData, "secondOpensAt");
  const secondClosesAt = value(formData, "secondClosesAt");
  const today = riyadhDateKey();

  if (!validDate(date) || date < today || date > shiftDate(today, 365) || !["open", "closed"].includes(mode)) {
    redirect("/dashboard/working-hours?error=override-date");
  }

  const isClosed = mode === "closed";
  if (!isClosed) {
    if (![opensAt, closesAt, secondOpensAt, secondClosesAt].every(validOptionalTime) || !opensAt || !closesAt) {
      redirect("/dashboard/working-hours?error=override-time");
    }
    if (!validateWorkingHoursWindow({ opensAt, closesAt, secondOpensAt, secondClosesAt })) {
      redirect("/dashboard/working-hours?error=override-window");
    }
  }

  await db.bookingAvailabilityOverride.upsert({
    where: { businessId_date: { businessId: business.id, date } },
    update: {
      isClosed,
      opensAt: isClosed ? null : opensAt,
      closesAt: isClosed ? null : closesAt,
      secondOpensAt: isClosed ? null : secondOpensAt || null,
      secondClosesAt: isClosed ? null : secondClosesAt || null,
      note: note || null,
    },
    create: {
      businessId: business.id,
      date,
      isClosed,
      opensAt: isClosed ? null : opensAt,
      closesAt: isClosed ? null : closesAt,
      secondOpensAt: isClosed ? null : secondOpensAt || null,
      secondClosesAt: isClosed ? null : secondClosesAt || null,
      note: note || null,
    },
  });

  refreshAppointmentPaths(business.slug);
  redirect("/dashboard/working-hours?saved=override");
}

export async function deleteBookingAvailabilityOverrideAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");
  const id = value(formData, "id");
  if (id) {
    await db.bookingAvailabilityOverride.deleteMany({ where: { id, businessId: business.id } });
    refreshAppointmentPaths(business.slug);
  }
  redirect("/dashboard/working-hours?saved=override-deleted");
}

export async function updateWorkingHoursAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) redirect("/login");

  const rows = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const isClosed = formData.get(`closed-${dayOfWeek}`) === "on";
    const opensAt = value(formData, `opens-${dayOfWeek}`);
    const closesAt = value(formData, `closes-${dayOfWeek}`);
    const secondOpensAt = value(formData, `second-opens-${dayOfWeek}`);
    const secondClosesAt = value(formData, `second-closes-${dayOfWeek}`);
    return { dayOfWeek, isClosed, opensAt, closesAt, secondOpensAt, secondClosesAt };
  });

  for (const row of rows) {
    if (![row.opensAt, row.closesAt, row.secondOpensAt, row.secondClosesAt].every(validOptionalTime)) invalid("time");
    if (row.isClosed) continue;
    if (!row.opensAt || !row.closesAt) invalid("time");
    if (!validateWorkingHoursWindow({
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      secondOpensAt: row.secondOpensAt,
      secondClosesAt: row.secondClosesAt,
    })) invalid("window");
  }

  await db.$transaction(rows.map((row) => db.workingHours.upsert({
    where: { businessId_dayOfWeek: { businessId: business.id, dayOfWeek: row.dayOfWeek } },
    update: {
      isClosed: row.isClosed,
      opensAt: row.isClosed ? null : row.opensAt,
      closesAt: row.isClosed ? null : row.closesAt,
      secondOpensAt: row.isClosed ? null : row.secondOpensAt || null,
      secondClosesAt: row.isClosed ? null : row.secondClosesAt || null,
    },
    create: {
      businessId: business.id,
      dayOfWeek: row.dayOfWeek,
      isClosed: row.isClosed,
      opensAt: row.isClosed ? null : row.opensAt,
      closesAt: row.isClosed ? null : row.closesAt,
      secondOpensAt: row.isClosed ? null : row.secondOpensAt || null,
      secondClosesAt: row.isClosed ? null : row.secondClosesAt || null,
    },
  })));

  revalidatePath("/dashboard/working-hours");
  revalidatePath("/dashboard/services");
  revalidatePath("/dashboard/my-page");
  revalidatePath("/preview");
  revalidatePath(`/${business.slug}`);
  redirect("/dashboard/working-hours?saved=1");
}
