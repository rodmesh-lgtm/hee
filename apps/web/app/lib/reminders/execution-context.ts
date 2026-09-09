import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";

export const REMINDER_WORK_HEALTH = ["on_track", "at_risk", "blocked"] as const;
export const REMINDER_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type ReminderWorkHealth = typeof REMINDER_WORK_HEALTH[number];
export type ReminderPriority = typeof REMINDER_PRIORITIES[number];

function optionalBounded(value: string | null | undefined, max: number, code: string) {
  const normalized = String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalized) return null;
  if (normalized.length > max) throw new Error(code);
  return normalized;
}

export async function updateReminderExecutionContext(input: {
  businessId: string;
  actorUserId: string;
  reminderId: string;
  workHealth: ReminderWorkHealth | string;
  priority: ReminderPriority | string;
  responsiblePerson?: string | null;
  businessDueAt?: Date | null;
  nextAction?: string | null;
}) {
  if (!REMINDER_WORK_HEALTH.includes(input.workHealth as ReminderWorkHealth)) throw new Error("REMINDER_EXECUTION_HEALTH_INVALID");
  if (!REMINDER_PRIORITIES.includes(input.priority as ReminderPriority)) throw new Error("REMINDER_EXECUTION_PRIORITY_INVALID");
  if (input.businessDueAt && Number.isNaN(input.businessDueAt.getTime())) throw new Error("REMINDER_EXECUTION_DUE_INVALID");
  const responsiblePerson = optionalBounded(input.responsiblePerson, 160, "REMINDER_EXECUTION_RESPONSIBLE_INVALID");
  const nextAction = optionalBounded(input.nextAction, 1200, "REMINDER_EXECUTION_NEXT_ACTION_INVALID");

  await db.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; status: string }>>(Prisma.sql`
      SELECT "id", "status" FROM "SmartReminder"
      WHERE "id"=${input.reminderId} AND "businessId"=${input.businessId}
      FOR UPDATE
    `);
    const reminder = rows[0];
    if (!reminder || reminder.status === "cancelled") throw new Error("REMINDER_EXECUTION_NOT_EDITABLE");
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder"
      SET "workHealth"=${input.workHealth}, "priority"=${input.priority}, "responsiblePerson"=${responsiblePerson},
          "businessDueAt"=${input.businessDueAt ?? null}, "nextAction"=${nextAction}, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${input.reminderId} AND "businessId"=${input.businessId}
    `);
    await writeWhatsAppAuditLog({
      businessId: input.businessId,
      actorUserId: input.actorUserId,
      action: "reminder.execution_context.update",
      targetType: "smart_reminder",
      targetId: input.reminderId,
      outcome: "success",
      metadata: {
        workHealth: String(input.workHealth), priority: String(input.priority),
        hasResponsiblePerson: Boolean(responsiblePerson), hasDueDate: Boolean(input.businessDueAt), hasNextAction: Boolean(nextAction),
      },
      database: tx,
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}