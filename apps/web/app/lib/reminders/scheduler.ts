import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { reminderDeliveryIdempotencyKey } from "./domain";

type DueReminder = {
  id: string;
  businessId: string;
  connectionId: string;
  templateId: string;
  recurrenceType: string;
  nextOccurrenceAt: Date;
};

async function scheduleNext(database: PrismaClient, now: Date) {
  return database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<DueReminder[]>(Prisma.sql`
      SELECT "id", "businessId", "connectionId", "templateId", "recurrenceType", "nextOccurrenceAt"
      FROM "SmartReminder"
      WHERE "status" = 'scheduled' AND "nextOccurrenceAt" IS NOT NULL AND "nextOccurrenceAt" <= ${now}
      ORDER BY "nextOccurrenceAt", "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const reminder = rows[0];
    if (!reminder) return null;
    if (reminder.recurrenceType !== "once") throw new Error("REMINDER_RECURRENCE_NOT_ENABLED_YET");

    const deliveryId = randomUUID();
    const idempotencyKey = reminderDeliveryIdempotencyKey({
      businessId: reminder.businessId,
      reminderId: reminder.id,
      occurrenceAt: reminder.nextOccurrenceAt,
    });
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
      SET "nextOccurrenceAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${reminder.id} AND "businessId" = ${reminder.businessId} AND "nextOccurrenceAt" = ${reminder.nextOccurrenceAt}
    `);
    return { ...reminder, deliveryId: inserted[0]?.id ?? null, idempotencyKey };
  });
}

export async function runSmartReminderScheduler(input: { database?: PrismaClient; now?: Date; limit?: number } = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  let scheduled = 0;
  let deduplicated = 0;

  for (let index = 0; index < limit; index += 1) {
    const result = await scheduleNext(database, now);
    if (!result) break;
    if (result.deliveryId) scheduled += 1;
    else deduplicated += 1;
    await writeWhatsAppAuditLog({
      businessId: result.businessId,
      actorType: "system",
      action: "reminder.delivery.queue",
      targetType: "smart_reminder",
      targetId: result.id,
      outcome: result.deliveryId ? "success" : "deduplicated",
      metadata: { occurrenceAt: result.nextOccurrenceAt.toISOString() },
      database,
    });
  }
  return { scheduled, deduplicated };
}
