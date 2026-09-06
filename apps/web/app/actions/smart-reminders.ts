"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveBusinessForUser } from "../lib/active-business";
import { getCurrentUserForWrites } from "../lib/auth";
import { db } from "../lib/db";
import { normalizeReminderChannels, reminderLocalDateTimeToUtc } from "../lib/reminders/domain";
import { cancelSmartReminder, completeSmartReminder, createSmartReminder, pauseSmartReminder, rescheduleSmartReminder, resumeSmartReminder, updateSmartReminderContent } from "../lib/reminders/operations";
import { isSmartRemindersSchemaReady } from "../lib/reminders/schema-readiness";
import { hasActiveWhatsAppMarketingEntitlement } from "../lib/whatsapp/feature-entitlement";
import { getWhatsAppWriteContext } from "../lib/whatsapp/rbac";

const field = (form: FormData, key: string, max: number) => {
  const value = String(form.get(key) ?? "").trim();
  return value && value.length <= max ? value : null;
};

async function reminderContext() {
  const user = await getCurrentUserForWrites();
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/dashboard?business=required");
  if (!await isSmartRemindersSchemaReady()) redirect("/dashboard/reminders?schema=pending");
  return { userId: user.id, businessId: business.id };
}

async function assertWhatsAppReminderAccess(businessId: string) {
  const whatsapp = await getWhatsAppWriteContext("automation.manage");
  if (!whatsapp || whatsapp.businessId !== businessId) redirect("/dashboard/reminders?create=whatsapp-access-denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
}

function destinationFor(error: unknown, action: string) {
  const code = error instanceof Error ? error.message : "";
  if (code === "REMINDER_DELIVERY_IN_PROGRESS") return `/dashboard/reminders?${action}=busy`;
  if (code === "REMINDER_RESCHEDULE_REQUIRED") return `/dashboard/reminders?${action}=reschedule-required`;
  if (code === "REMINDER_LOCAL_TIME_INVALID") return `/dashboard/reminders?${action}=invalid-time`;
  if (code === "REMINDER_RECIPIENT_CONSENT_REQUIRED") return `/dashboard/reminders?${action}=consent-required`;
  if (code === "REMINDER_DELIVERY_CHANNELS_INVALID") return `/dashboard/reminders?${action}=channels-required`;
  if (code === "REMINDER_NOTE_INVALID") return `/dashboard/reminders?${action}=note-invalid`;
  return `/dashboard/reminders?${action}=failed`;
}

export async function createSmartReminderAction(form: FormData) {
  const context = await reminderContext();
  const title = field(form, "title", 160);
  const body = field(form, "body", 2000);
  const templateId = field(form, "templateId", 128);
  const businessNoteId = field(form, "businessNoteId", 128);
  const timezone = field(form, "timezone", 64);
  const localDateTime = field(form, "scheduledLocal", 32);
  const recurrenceType = field(form, "recurrenceType", 16) ?? "once";
  let deliveryChannels;
  try { deliveryChannels = normalizeReminderChannels(form.getAll("deliveryChannels").map(String)); }
  catch { redirect("/dashboard/reminders?create=channels-required"); }
  const wantsWhatsApp = deliveryChannels.includes("whatsapp");
  const recipientConsentAccepted = form.get("recipientConsentAccepted") === "on";
  if (!title || !body || !timezone || !localDateTime || (wantsWhatsApp && (!templateId || !recipientConsentAccepted))) redirect("/dashboard/reminders?create=consent-required");
  if (wantsWhatsApp) await assertWhatsAppReminderAccess(context.businessId);
  try {
    const scheduledAt = reminderLocalDateTimeToUtc(localDateTime, timezone);
    await createSmartReminder({ businessId: context.businessId, actorUserId: context.userId, title, body, templateId, businessNoteId, scheduledAt, timezone, recurrenceType, recipientConsentAccepted, deliveryChannels });
    revalidatePath("/dashboard/reminders");
    revalidatePath("/dashboard/notes");
  } catch (error) { redirect(destinationFor(error, "create")); }
  redirect("/dashboard/reminders?create=success");
}

export async function updateSmartReminderAction(form: FormData) { const context=await reminderContext(); const reminderId=field(form,"reminderId",128),title=field(form,"title",160),body=field(form,"body",2000); if(!reminderId||!title||!body)redirect("/dashboard/reminders?update=invalid"); try{await updateSmartReminderContent({businessId:context.businessId,actorUserId:context.userId,reminderId,title,body});revalidatePath("/dashboard/reminders");}catch(error){redirect(destinationFor(error,"update"));} redirect("/dashboard/reminders?update=success"); }
export async function rescheduleSmartReminderAction(form: FormData) { const context=await reminderContext(); const reminderId=field(form,"reminderId",128),timezone=field(form,"timezone",64),localDateTime=field(form,"scheduledLocal",32); if(!reminderId||!timezone||!localDateTime)redirect("/dashboard/reminders?reschedule=invalid"); try{const scheduledAt=reminderLocalDateTimeToUtc(localDateTime,timezone);await rescheduleSmartReminder({businessId:context.businessId,actorUserId:context.userId,reminderId,scheduledAt,timezone});revalidatePath("/dashboard/reminders");}catch(error){redirect(destinationFor(error,"reschedule"));} redirect("/dashboard/reminders?reschedule=success&tab=upcoming"); }
export async function pauseSmartReminderAction(form: FormData) { const context=await reminderContext(); const reminderId=field(form,"reminderId",128); if(!reminderId)redirect("/dashboard/reminders?pause=invalid"); try{await pauseSmartReminder({businessId:context.businessId,actorUserId:context.userId,reminderId});revalidatePath("/dashboard/reminders");}catch(error){redirect(destinationFor(error,"pause"));} redirect("/dashboard/reminders?pause=success&tab=paused"); }
export async function resumeSmartReminderAction(form: FormData) { const context=await reminderContext(); const reminderId=field(form,"reminderId",128); if(!reminderId)redirect("/dashboard/reminders?resume=invalid"); try{await resumeSmartReminder({businessId:context.businessId,actorUserId:context.userId,reminderId});revalidatePath("/dashboard/reminders");}catch(error){redirect(destinationFor(error,"resume"));} redirect("/dashboard/reminders?resume=success&tab=upcoming"); }
export async function cancelSmartReminderAction(form: FormData) { const context=await reminderContext(); const reminderId=field(form,"reminderId",128); if(!reminderId)redirect("/dashboard/reminders?cancel=invalid"); try{await cancelSmartReminder({businessId:context.businessId,actorUserId:context.userId,reminderId});revalidatePath("/dashboard/reminders");}catch(error){redirect(destinationFor(error,"cancel"));} redirect("/dashboard/reminders?cancel=success&tab=cancelled"); }
export async function completeSmartReminderAction(form: FormData) { const context=await reminderContext(); const reminderId=field(form,"reminderId",128); if(!reminderId)redirect("/dashboard/reminders?complete=invalid"); try{await completeSmartReminder({businessId:context.businessId,actorUserId:context.userId,reminderId});revalidatePath("/dashboard/reminders");}catch(error){redirect(destinationFor(error,"complete"));} redirect("/dashboard/reminders?complete=success&tab=completed"); }
export async function snoozeSmartReminderAction(form: FormData) { const context=await reminderContext(); const reminderId=field(form,"reminderId",128),minutes=Number(field(form,"minutes",8)); if(!reminderId||![10,30,60,1440].includes(minutes))redirect("/dashboard/reminders?snooze=invalid"); const rows=await db.$queryRaw<Array<{timezone:string}>>(Prisma.sql`SELECT "timezone" FROM "SmartReminder" WHERE "id"=${reminderId} AND "businessId"=${context.businessId} LIMIT 1`); if(!rows[0])redirect("/dashboard/reminders?snooze=failed"); try{await rescheduleSmartReminder({businessId:context.businessId,actorUserId:context.userId,reminderId,scheduledAt:new Date(Date.now()+minutes*60_000),timezone:rows[0].timezone});revalidatePath("/dashboard/reminders");}catch(error){redirect(destinationFor(error,"snooze"));} redirect("/dashboard/reminders?snooze=success&tab=upcoming"); }