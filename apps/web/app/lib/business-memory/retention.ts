import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../db";

export const BUSINESS_MEMORY_RETENTION = {
  archivedNotesDays: 30,
  finishedRemindersDays: 30,
  readNotificationsDays: 30,
  deliveryHistoryDays: 90,
} as const;

export async function runBusinessMemoryRetention(database: PrismaClient = db) {
  return database.$transaction(async (tx) => {
    // Only remove read in-app notifications after their usefulness window.
    const notifications = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminderNotification"
      WHERE "readAt" IS NOT NULL AND "readAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'
    `);

    // Delivery history is operational/audit data. Never remove anything queued, retrying,
    // processing, unknown, or recent. Parent reminders remain intact here.
    const deliveries = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminderDelivery"
      WHERE "createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND "status" IN ('sent','failed','cancelled')
    `);

    // Finished reminders are eligible only after 30 days and only when no delivery can
    // still run or have an uncertain outcome. This avoids deleting work under a worker.
    const reminders = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminder" r
      WHERE r."status" IN ('completed','cancelled')
        AND r."updatedAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM "SmartReminderDelivery" d
          WHERE d."reminderId"=r."id" AND d."businessId"=r."businessId"
            AND d."status" IN ('queued','processing','retry_scheduled','delivery_unknown')
        )
    `);

    // Archived notes are a 30-day recycle bin. A note linked by any retained reminder is
    // intentionally preserved; active/draft/pinned notes are never age-deleted.
    const notes = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "BusinessNote" n
      WHERE n."status"='archived'
        AND n."archivedAt" IS NOT NULL
        AND n."archivedAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND NOT EXISTS (
          SELECT 1 FROM "SmartReminder" r
          WHERE r."businessNoteId"=n."id" AND r."businessId"=n."businessId"
        )
    `);

    return { notifications, deliveries, reminders, notes };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
