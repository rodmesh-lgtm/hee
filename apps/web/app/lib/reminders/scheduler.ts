import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { nextReminderOccurrence, normalizeReminderRecurrence, reminderDeliveryIdempotencyKey } from "./domain";

type DueReminder = {
  id: string;
  businessId: string;
  connectionId: string;
  templateId: string;
  recurrenceType: string;
  timezone: string;
  nextOccurrenceAt: Date;
};

function nextFutureOccurrence(reminder: DueReminder, now: Date) {
  const recurrenceType = normalizeReminderRecurrence(reminder.recurrenceType);
  if (recurrenceType === "once") return { nextOccurrenceAt: null as Date | null, skippedMissedOccurrences: 0 };
  let cursor = reminder.nextOccurrenceAt;
  let skippedMissedOccurrences = 0;
  for (let index = 0; index < 2000; index += 1) {
    const next = nextReminderOccurrence({ occurrenceAt: cursor, timezone: reminder.timezone, recurrenceType });
    if (!next) return { nextOccurrenceAt: null as Date | null, skippedMissedOccurrences };
    if (next.getTime() > now.getTime()) return { nextOccurrenceAt: next, skippedMissedOccurrences };
    cursor = next;
    skippedMissedOccurrences += 1;
  }
  throw new Error("REMINDER_RECURRENCE_CATCHUP_LIMIT_EXCEEDED");
}

async function scheduleNext(database: PrismaClient, now: Date) {
  return database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<DueReminder[]>(Prisma.sql`
      SELECT "id", "businessId", "connectionId", "templateId", "recurrenceType", "timezone", "nextOccurrenceAt"
      FROM "SmartReminder"
      WHERE "status" = 'scheduled' AND "nextOccurrenceAt" IS NOT NULL AND "nextOccurrenceAt" <= ${now}
      ORDER BY "nextOccurrenceAt", "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const reminder = rows[0];
    if (!reminder) return null;
    const future = nextFutureOccurrence(reminder, now);
    const deliveryId = randomUUID();
    const idempotencyKey = reminderDeliveryIdempotencyKey({ businessId: reminder.businessId, reminderId: reminder.id, occurrenceAt: reminder.nextOccurrenceAt });
    const inserted = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      INSERT INTO "SmartReminderDelivery" (
        "id", "businessId", "reminderId", "connectionId", "templateId", "occurrenceAt", "idempotencyKey", "status", "updatedAt"
      ) VALUES (
        ${deliveryId}, ${reminder.businessId}, ${reminder.id}, ${reminder.connectionId}, ${reminder.templateId},
        ${reminder.nextOccurrenceAt}, ${idempotencyKey}, 'queued', CURRENT_TIMESTAMP
      )
      ON CONFLICT ("idempotencyKey") DO NOTHING
      RETURNING "id"
    `);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminder"
      SET "nextOccurrenceAt" = ${future.nextOccurrenceAt}, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${reminder.id} AND "businessId" = ${reminder.businessId} AND "nextOccurrenceAt" = ${reminder.nextOccurrenceAt}
    `);
    return { ...reminder, deliveryId: inserted[0]?.id ?? null, idempotencyKey, nextScheduledOccurrenceAt: future.nextOccurrenceAt, skippedMissedOccurrences: future.skippedMissedOccurrences };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function runSmartReminderScheduler(input: { database?: PrismaClient; now?: Date; limit?: number } = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  let scheduled = 0;
  let deduplicated = 0;
  let skippedMissedOccurrences = 0;

  for (let index = 0; index < limit; index += 1) {
    const result = await scheduleNext(database, now);
    if (!result) break;
    const wasDeduplicated = !result.deliveryId;
    if (wasDeduplicated) deduplicated += 1;
    else scheduled += 1;
    skippedMissedOccurrences += result.skippedMissedOccurrences;
    await writeWhatsAppAuditLog({
      businessId: result.businessId,
      actorType: "system",
      action: "reminder.delivery.queue",
      targetType: "smart_reminder",
      targetId: result.id,
      outcome: "success",
      metadata: { occurrenceAt: result.nextOccurrenceAt.toISOString(), deduplicated: wasDeduplicated, skippedMissedOccurrences: result.skippedMissedOccurrences },
      database,
    });
  }
  return { scheduled, deduplicated, skippedMissedOccurrences };
}
