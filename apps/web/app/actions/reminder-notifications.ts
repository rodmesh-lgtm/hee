"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getCurrentUserForWrites } from "../lib/auth";
import { db } from "../lib/db";
import { isSmartRemindersSchemaReady } from "../lib/reminders/schema-readiness";

function value(form: FormData, key: string, max = 128) {
  const raw = String(form.get(key) ?? "").trim();
  return raw && raw.length <= max ? raw : null;
}

async function notificationContext() {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/dashboard?business=required");
  if (!await isSmartRemindersSchemaReady()) redirect("/dashboard/notifications?schema=pending");
  return { userId: user.id, businessId: business.id };
}

export async function markReminderNotificationReadAction(form: FormData) {
  const context = await notificationContext();
  const notificationId = value(form, "notificationId");
  if (!notificationId) redirect("/dashboard/notifications?read=invalid");
  const changed = await db.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderNotification"
    SET "readAt" = COALESCE("readAt", CURRENT_TIMESTAMP)
    WHERE "id" = ${notificationId} AND "businessId" = ${context.businessId} AND "userId" = ${context.userId}
  `);
  if (changed !== 1) redirect("/dashboard/notifications?read=missing");
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?read=success");
}

export async function markAllReminderNotificationsReadAction() {
  const context = await notificationContext();
  await db.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderNotification"
    SET "readAt" = CURRENT_TIMESTAMP
    WHERE "businessId" = ${context.businessId} AND "userId" = ${context.userId} AND "readAt" IS NULL
  `);
  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?readAll=success");
}
