"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "../lib/db";
import { reminderLocalDateTimeToUtc } from "../lib/reminders/domain";
import { cancelSmartReminder, completeSmartReminder, createSmartReminder, pauseSmartReminder, rescheduleSmartReminder, resumeSmartReminder, updateSmartReminderContent } from "../lib/reminders/operations";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";

const field = (form: FormData, key: string, max: number) => {
  const value = String(form.get(key) ?? "").trim();
  return value && value.length <= max ? value : null;
};

async function reminderContext() {
  const context = await getWhatsAppWriteContext("automation.manage");
  if (!context) redirect("/dashboard/reminders?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  return context;
}

function destinationFor(error: unknown, action: string) {
  const code = error instanceof Error ? error.message : "";
  if (code === "REMINDER_DELIVERY_IN_PROGRESS") return `/dashboard/reminders?${action}=busy`;
  if (code === "REMINDER_RESCHEDULE_REQUIRED") return `/dashboard/reminders?${action}=reschedule-required`;
  if (code === "REMINDER_LOCAL_TIME_INVALID") return `/dashboard/reminders?${action}=invalid-time`;
  if (code === "REMINDER_RECIPIENT_CONSENT_REQUIRED") return `/dashboard/reminders?${action}=consent-required`;
  return `/dashboard/reminders?${action}=failed`;
}

export async function createSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const title = field(form, "title", 160);
  const body = field(form, "body", 2000);
  const templateId = field(form, "templateId", 128);
  const timezone = field(form, "timezone", 64);
  const localDateTime = field(form, "scheduledLocal", 32);
  if (!title || !body || !templateId || !timezone || !localDateTime) redirect("/dashboard/reminders?create=invalid");
  try {
    const scheduledAt = reminderLocalDateTimeToUtc(localDateTime, timezone);
    await createSmartReminder({ businessId: context.businessId, actorUserId: context.userId, title, body, templateId, scheduledAt, timezone, recurrenceType: "once" });
    revalidatePath("/dashboard/reminders");
  } catch (error) {
    redirect(destinationFor(error, "create"));
  }
  redirect("/dashboard/reminders?create=success");
}

export async function updateSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const reminderId = field(form, "reminderId", 128), title = field(form, "title", 160), body = field(form, "body", 2000);
  if (!reminderId || !title || !body) redirect("/dashboard/reminders?update=invalid");
  try {
    await updateSmartReminderContent({ businessId: context.businessId, actorUserId: context.userId, reminderId, title, body });
    revalidatePath("/dashboard/reminders");
  } catch (error) { redirect(destinationFor(error, "update")); }
  redirect("/dashboard/reminders?update=success");
}

export async function rescheduleSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const reminderId = field(form, "reminderId", 128), timezone = field(form, "timezone", 64), localDateTime = field(form, "scheduledLocal", 32);
  if (!reminderId || !timezone || !localDateTime) redirect("/dashboard/reminders?reschedule=invalid");
  try {
    const scheduledAt = reminderLocalDateTimeToUtc(localDateTime, timezone);
    await rescheduleSmartReminder({ businessId: context.businessId, actorUserId: context.userId, reminderId, scheduledAt, timezone });
    revalidatePath("/dashboard/reminders");
  } catch (error) { redirect(destinationFor(error, "reschedule")); }
  redirect("/dashboard/reminders?reschedule=success");
}

export async function pauseSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const reminderId = field(form, "reminderId", 128);
  if (!reminderId) redirect("/dashboard/reminders?pause=invalid");
  try { await pauseSmartReminder({ businessId: context.businessId, actorUserId: context.userId, reminderId }); revalidatePath("/dashboard/reminders"); }
  catch (error) { redirect(destinationFor(error, "pause")); }
  redirect("/dashboard/reminders?pause=success");
}

export async function resumeSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const reminderId = field(form, "reminderId", 128);
  if (!reminderId) redirect("/dashboard/reminders?resume=invalid");
  try { await resumeSmartReminder({ businessId: context.businessId, actorUserId: context.userId, reminderId }); revalidatePath("/dashboard/reminders"); }
  catch (error) { redirect(destinationFor(error, "resume")); }
  redirect("/dashboard/reminders?resume=success");
}

export async function cancelSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const reminderId = field(form, "reminderId", 128);
  if (!reminderId) redirect("/dashboard/reminders?cancel=invalid");
  try { await cancelSmartReminder({ businessId: context.businessId, actorUserId: context.userId, reminderId }); revalidatePath("/dashboard/reminders"); }
  catch (error) { redirect(destinationFor(error, "cancel")); }
  redirect("/dashboard/reminders?cancel=success");
}

export async function completeSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const reminderId = field(form, "reminderId", 128);
  if (!reminderId) redirect("/dashboard/reminders?complete=invalid");
  try { await completeSmartReminder({ businessId: context.businessId, actorUserId: context.userId, reminderId }); revalidatePath("/dashboard/reminders"); }
  catch (error) { redirect(destinationFor(error, "complete")); }
  redirect("/dashboard/reminders?complete=success");
}

export async function snoozeSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const reminderId = field(form, "reminderId", 128);
  const minutes = Number(field(form, "minutes", 8));
  if (!reminderId || ![10, 30, 60, 1440].includes(minutes)) redirect("/dashboard/reminders?snooze=invalid");
  const rows = await db.$queryRaw<Array<{ timezone: string }>>(Prisma.sql`
    SELECT "timezone" FROM "SmartReminder" WHERE "id" = ${reminderId} AND "businessId" = ${context.businessId} LIMIT 1
  `);
  if (!rows[0]) redirect("/dashboard/reminders?snooze=failed");
  try {
    await rescheduleSmartReminder({ businessId: context.businessId, actorUserId: context.userId, reminderId, scheduledAt: new Date(Date.now() + minutes * 60_000), timezone: rows[0].timezone });
    revalidatePath("/dashboard/reminders");
  } catch (error) { redirect(destinationFor(error, "snooze")); }
  redirect("/dashboard/reminders?snooze=success");
}
