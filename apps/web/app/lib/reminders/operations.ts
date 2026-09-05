import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { normalizeE164 } from "../whatsapp/contact-domain";
import { normalizeReminderRecurrence, normalizeReminderTimezone, reminderTemplateSupportsBodyParameter, validateReminderSchedule, type ReminderRecurrenceType } from "./domain";

function boundedText(value: string, max: number, code: string) {
  const normalized = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized || normalized.length > max) throw new Error(code);
  return normalized;
}

async function resolveSelfReminderRecipient(input: { businessId: string; requestedPhone?: string | null }) {
  const business = await db.business.findFirst({
    where: { id: input.businessId, deletedAt: null },
    select: { whatsapp: true, phone: true },
  });
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

async function requireRunnableReminderTemplate(input: { businessId: string; templateId: string }) {
  const template = await db.whatsAppTemplate.findFirst({
    where: {
      id: input.templateId,
      businessId: input.businessId,
      provider: "meta",
      status: "approved",
      connection: { businessId: input.businessId, provider: "meta", status: "connected" },
    },
    select: { id: true, businessId: true, connectionId: true, components: true },
  });
  if (!template || template.businessId !== input.businessId || !reminderTemplateSupportsBodyParameter(template.components)) {
    throw new Error("REMINDER_TEMPLATE_NOT_RUNNABLE");
  }
  return template;
}

export async function createSmartReminder(input: {
  businessId: string;
  actorUserId: string;
  title: string;
  body: string;
  templateId: string;
  scheduledAt: Date;
  timezone: string;
  recurrenceType?: ReminderRecurrenceType | string;
  recipientPhone?: string | null;
}) {
  const title = boundedText(input.title, 160, "REMINDER_TITLE_INVALID");
  const body = boundedText(input.body, 2000, "REMINDER_BODY_INVALID");
  const timezone = normalizeReminderTimezone(input.timezone);
  const scheduledAt = validateReminderSchedule({ scheduledAt: input.scheduledAt });
  const recurrenceType = normalizeReminderRecurrence(input.recurrenceType ?? "once");
  if (recurrenceType !== "once") throw new Error("REMINDER_RECURRENCE_NOT_ENABLED_YET");

  const [template, recipientPhoneE164] = await Promise.all([
    requireRunnableReminderTemplate({ businessId: input.businessId, templateId: input.templateId }),
    resolveSelfReminderRecipient({ businessId: input.businessId, requestedPhone: input.recipientPhone }),
  ]);
  const id = randomUUID();

  await db.$executeRaw(Prisma.sql`
    INSERT INTO "SmartReminder" (
      "id", "businessId", "createdByUserId", "connectionId", "templateId", "title", "body",
      "recipientPhoneE164", "timezone", "scheduledAt", "nextOccurrenceAt", "recurrenceType", "status", "updatedAt"
    ) VALUES (
      ${id}, ${input.businessId}, ${input.actorUserId}, ${template.connectionId}, ${template.id}, ${title}, ${body},
      ${recipientPhoneE164}, ${timezone}, ${scheduledAt}, ${scheduledAt}, ${recurrenceType}, 'scheduled', CURRENT_TIMESTAMP
    )
  `);

  await writeWhatsAppAuditLog({
    businessId: input.businessId,
    actorUserId: input.actorUserId,
    action: "reminder.create",
    targetType: "smart_reminder",
    targetId: id,
    outcome: "success",
    metadata: { timezone, recurrenceType, connectionId: template.connectionId, templateId: template.id },
  });
  return { id, scheduledAt, timezone, recurrenceType };
}

export async function cancelSmartReminder(input: { businessId: string; actorUserId: string; reminderId: string }) {
  const changed = await db.$executeRaw(Prisma.sql`
    UPDATE "SmartReminder"
    SET "status" = 'cancelled', "cancelledAt" = CURRENT_TIMESTAMP, "nextOccurrenceAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId} AND "status" IN ('scheduled','paused')
  `);
  if (changed !== 1) throw new Error("REMINDER_NOT_CANCELLABLE");
  await db.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderDelivery"
    SET "status" = 'cancelled', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "reminderId" = ${input.reminderId} AND "businessId" = ${input.businessId} AND "status" = 'queued'
  `);
  await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.cancel", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success" });
}

export async function rescheduleSmartReminder(input: { businessId: string; actorUserId: string; reminderId: string; scheduledAt: Date; timezone: string }) {
  const timezone = normalizeReminderTimezone(input.timezone);
  const scheduledAt = validateReminderSchedule({ scheduledAt: input.scheduledAt });
  const changed = await db.$executeRaw(Prisma.sql`
    UPDATE "SmartReminder"
    SET "scheduledAt" = ${scheduledAt}, "nextOccurrenceAt" = ${scheduledAt}, "timezone" = ${timezone}, "status" = 'scheduled',
        "pausedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${input.reminderId} AND "businessId" = ${input.businessId} AND "status" IN ('scheduled','paused')
  `);
  if (changed !== 1) throw new Error("REMINDER_NOT_RESCHEDULABLE");
  await db.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderDelivery"
    SET "status" = 'cancelled', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "reminderId" = ${input.reminderId} AND "businessId" = ${input.businessId} AND "status" = 'queued'
  `);
  await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "reminder.reschedule", targetType: "smart_reminder", targetId: input.reminderId, outcome: "success", metadata: { timezone } });
  return { scheduledAt, timezone };
}
