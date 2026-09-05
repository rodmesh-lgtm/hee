import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { normalizeE164 } from "../whatsapp/contact-domain";
import { normalizeReminderRecurrence, normalizeReminderTimezone, reminderTemplateSupportsBodyParameter, validateReminderSchedule, type ReminderRecurrenceType } from "./domain";

const REMINDER_CONSENT_EVIDENCE = "dashboard_explicit_reminder_opt_in_v1";

function boundedText(value: string, max: number, code: string) {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) throw new Error(code);
  return normalized;
}

async function resolveSelfReminderRecipient(database: Prisma.TransactionClient, input: { businessId: string; requestedPhone?: string | null }) {
  const business = await database.business.findFirst({ where: { id: input.businessId, deletedAt: null }, select: { whatsapp: true, phone: true } });
  if (!business) throw new Error("REMINDER_BUSINESS_NOT_FOUND");
  const allowed = [business.whatsapp, business.phone]
    .map((value) => normalizeE164(value, "966"))
    .filter((value): value is string => Boolean(value));
  const uniqueAllowed = [...new Set(allowed)];
  if (!uniqueAllowed.length) throw new Error("REMINDER_RECIPIENT_NOT_CONFIGURED");
  if (!input.requestedPhone) return uniqueAllowed[0];
  const requested = normalizeE164(input.requestedPhone, "966");
  if (!requested || !uniqueAllowed.includes(requested)) throw new Error("REMINDER_RECIPIENT_NOT_BUSINESS_OWNED");
  return requested;
}

async function requireRunnableReminderTemplate(database: Prisma.TransactionClient, input: { businessId: string; templateId: string }) {
  const template = await database.whatsAppTemplate.findFirst({
    where: { id: input.templateId, businessId: input.businessId, provider: "meta", status: "approved", connection: { businessId: input.businessId, provider: "meta", status: "connected" } },
    select: { id: true, businessId: true, connectionId: true, components: true },
  });
  if (!template || template.businessId !== input.businessId || !reminderTemplateSupportsBodyParameter(template.components)) throw new Error("REMINDER_TEMPLATE_NOT_RUNNABLE");
  return template;
}

type LockedReminder = { id: string; status: string; scheduledAt: Date; nextOccurrenceAt: Date | null };

async function lockReminder(database: Prisma.TransactionClient, businessId: string, reminderId: string) {
  const rows = await database.$queryRaw<LockedReminder[]>(Prisma.sql`
    SELECT "id", "status", "scheduledAt", "nextOccurrenceAt"
    FROM "SmartReminder"
    WHERE "id" = ${reminderId} AND "businessId" = ${businessId}
    FOR UPDATE
  `);
  return rows[0] ?? null;
}

async function assertNoInFlightDelivery(database: Prisma.TransactionClient, businessId: string, reminderId: string) {
  const rows = await database.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS "count" FROM "SmartReminderDelivery"
    WHERE "businessId" = ${businessId} AND "reminderId" = ${reminderId} AND "status" = 'processing'
  `);
  if (Number(rows[0]?.count ?? 0) > 0) throw new Error("REMINDER_DELIVERY_IN_PROGRESS");
}

async function cancelQueuedDeliveries(database: Prisma.TransactionClient, businessId: string, reminderId: string) {
  await database.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderDelivery"
    SET "status" = 'cancelled', "leaseOwner" = NULL, "leaseExpiresAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "reminderId" = ${reminderId} AND "businessId" = ${businessId} AND "status" IN ('queued','retry_scheduled')
  `);
}

export async function createSmartReminder(input: {
  businessId: string; actorUserId: string; title: string; body: string; templateId: string; scheduledAt: Date; timezone: string;
  recurrenceType?: ReminderRecurrenceType | string; recipientPhone?: string | null; recipientConsentAccepted: boolean;
}) {
  if (!input.recipientConsentAccepted) throw new Error("REMINDER_RECIPIENT_CONSENT_REQUIRED");
  const title = boundedText(input.title, 160, "REMINDER_TITLE_INVALID");
  const body = boundedText(input.body, 2000, "REMINDER_BODY_INVALID");
  const timezone = normalizeReminderTimezone(input.timezone);
  const scheduledAt = validateReminderSchedule({ scheduledAt: input.scheduledAt });
  const recurrenceType = normalizeReminderRecurrence(input.recurrenceType ?? "once");
  if (recurrenceType !== "once") throw new Error("REMINDER_RECURRENCE_NOT_ENABLED_YET");
  const id = randomUUID();
  const consentedAt = new Date();

  await db.$transaction(async (tx) => {
    const [template, recipientPhoneE164] = await Promise.all([
      requireRunnableReminderTemplate(tx, { businessId: input.businessId, templateId: input.templateId }),
      resolveSelfReminderRecipient(tx, { businessId: input.businessId, requestedPhone: input.recipientPhone }),
    ]);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "SmartReminder" (
        "id", "businessId", "createdByUserId", "connectionId", "templateId", "title", "body", "recipientPhoneE164",
        "recipientConsentedAt", "recipientConsentEvidence", "timezone", "scheduledAt", "nextOccurrenceAt", "recurrenceType", "status", "updatedAt"
      ) VALUES (
        ${id}, ${input.businessId}, ${input.actorUserId}, ${template.connectionId}, ${template.id}, ${title}, ${body}, ${recipientPhoneE164},
        ${consentedAt}, ${REMINDER_CONSENT_EVIDENCE}, ${timezone}, ${scheduledAt}, ${scheduledAt}, ${recurrenceType}, 'scheduled', CURRENT_TIMESTAMP
      )
    `);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.create", targetType: "smart_reminder", targetId: id, outcome: "success", metadata: { timezone, recurrenceType, connectionId: template.connectionId, templateId: template.id, reminderConsent: true }, database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { id, scheduledAt, timezone, recurrenceType };
}

export async function updateSmartReminderContent(input: { businessId: string; actorUserId: string; reminderId: string; title: string; body: string }) {
  const title = boundedText(input.title, 160, "REMINDER_TITLE_INVALID");
  const body = boundedText(input.body, 2000, "REMINDER_BODY_INVALID");
  await db.$transaction(async (tx) => {
    const reminder = await lockReminder(tx, input.businessId, input.reminderId);
    if (!reminder || !["scheduled", "paused"].includes(reminder.status)) throw new Error("REMINDER_NOT_EDITABLE");
    await assertNoInFlightDelivery(tx, input.businessId, input.reminderId);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder" SET "title" = ${title}, "body" = ${body}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId}
    `);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.update", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success", database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function cancelSmartReminder(input: { businessId: string; actorUserId: string; reminderId: string }) {
  await db.$transaction(async (tx) => {
    const reminder = await lockReminder(tx, input.businessId, input.reminderId);
    if (!reminder || !["scheduled", "paused"].includes(reminder.status)) throw new Error("REMINDER_NOT_CANCELLABLE");
    await assertNoInFlightDelivery(tx, input.businessId, input.reminderId);
    await cancelQueuedDeliveries(tx, input.businessId, input.reminderId);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder" SET "status" = 'cancelled', "cancelledAt" = CURRENT_TIMESTAMP, "nextOccurrenceAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId}
    `);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.cancel", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success", database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function rescheduleSmartReminder(input: { businessId: string; actorUserId: string; reminderId: string; scheduledAt: Date; timezone: string }) {
  const timezone = normalizeReminderTimezone(input.timezone);
  const scheduledAt = validateReminderSchedule({ scheduledAt: input.scheduledAt });
  await db.$transaction(async (tx) => {
    const reminder = await lockReminder(tx, input.businessId, input.reminderId);
    if (!reminder || !["scheduled", "paused"].includes(reminder.status)) throw new Error("REMINDER_NOT_RESCHEDULABLE");
    await assertNoInFlightDelivery(tx, input.businessId, input.reminderId);
    await cancelQueuedDeliveries(tx, input.businessId, input.reminderId);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder"
      SET "scheduledAt" = ${scheduledAt}, "nextOccurrenceAt" = ${scheduledAt}, "timezone" = ${timezone}, "status" = 'scheduled', "pausedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId}
    `);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.reschedule", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success", metadata: { timezone }, database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  return { scheduledAt, timezone };
}

export async function pauseSmartReminder(input: { businessId: string; actorUserId: string; reminderId: string }) {
  await db.$transaction(async (tx) => {
    const reminder = await lockReminder(tx, input.businessId, input.reminderId);
    if (!reminder || reminder.status !== "scheduled" || !reminder.nextOccurrenceAt) throw new Error("REMINDER_NOT_PAUSABLE");
    await assertNoInFlightDelivery(tx, input.businessId, input.reminderId);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder" SET "status" = 'paused', "pausedAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId}
    `);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.pause", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success", database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resumeSmartReminder(input: { businessId: string; actorUserId: string; reminderId: string }) {
  await db.$transaction(async (tx) => {
    const reminder = await lockReminder(tx, input.businessId, input.reminderId);
    if (!reminder || reminder.status !== "paused" || !reminder.nextOccurrenceAt) throw new Error("REMINDER_NOT_RESUMABLE");
    if (reminder.nextOccurrenceAt.getTime() <= Date.now()) throw new Error("REMINDER_RESCHEDULE_REQUIRED");
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder" SET "status" = 'scheduled', "pausedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId}
    `);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.resume", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success", database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function completeSmartReminder(input: { businessId: string; actorUserId: string; reminderId: string }) {
  await db.$transaction(async (tx) => {
    const reminder = await lockReminder(tx, input.businessId, input.reminderId);
    if (!reminder || !["scheduled", "paused"].includes(reminder.status)) throw new Error("REMINDER_NOT_COMPLETABLE");
    await assertNoInFlightDelivery(tx, input.businessId, input.reminderId);
    await cancelQueuedDeliveries(tx, input.businessId, input.reminderId);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder" SET "status" = 'completed', "completedAt" = CURRENT_TIMESTAMP, "nextOccurrenceAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId}
    `);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.complete", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success", database: tx });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
