"use server";

import { revalidatePath } from "next/cache";
import { db } from "../lib/db";
import { getOwnedBusinessForWrite } from "../lib/ownership";
import { isValidWorkingTime, validateWorkingHoursWindow } from "../lib/working-hours-validation";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validOptionalTime(raw: string) {
  return !raw || isValidWorkingTime(raw);
}

export async function updateWorkingHoursAction(formData: FormData) {
  const business = await getOwnedBusinessForWrite();
  if (!business) return;

  const rows = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const isClosed = formData.get(`closed-${dayOfWeek}`) === "on";
    const opensAt = value(formData, `opens-${dayOfWeek}`);
    const closesAt = value(formData, `closes-${dayOfWeek}`);
    const secondOpensAt = value(formData, `second-opens-${dayOfWeek}`);
    const secondClosesAt = value(formData, `second-closes-${dayOfWeek}`);
    return { dayOfWeek, isClosed, opensAt, closesAt, secondOpensAt, secondClosesAt };
  });

  for (const row of rows) {
    if (![row.opensAt, row.closesAt, row.secondOpensAt, row.secondClosesAt].every(validOptionalTime)) return;
    if (row.isClosed) continue;
    if (!row.opensAt || !row.closesAt) return;
    if (!validateWorkingHoursWindow({
      opensAt: row.opensAt,
      closesAt: row.closesAt,
      secondOpensAt: row.secondOpensAt,
      secondClosesAt: row.secondClosesAt,
    })) return;
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
}
