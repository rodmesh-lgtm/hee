import { Prisma, PrismaClient } from "@prisma/client";
import { db } from "../db";

export const BUSINESS_MEMORY_RETENTION = {
  archivedNotesDays: 30,
  finishedRemindersDays: 90,
  notificationsDays: 30,
  deliveryHistoryDays: 90,
} as const;

export async function runBusinessMemoryRetention(database: PrismaClient = db) {
  return database.$transaction(async (tx) => {
    // In-app notifications are transient UI data. Remove read notifications after 30 days,
    // and notifications for already-finished reminders once the reminder reaches 90 days.
    const notifications = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminderNotification" n
      WHERE (n."readAt" IS NOT NULL AND n."readAt" < CURRENT_TIMESTAMP - INTERVAL '30 days')
         OR EXISTS (
           SELECT 1 FROM "SmartReminder" r
           WHERE r."id"=n."reminderId" AND r."businessId"=n."businessId"
             AND r."status" IN ('completed','cancelled')
             AND r."updatedAt" < CURRENT_TIMESTAMP - INTERVAL '90 days'
         )
    `);

    // Keep operational delivery evidence for 90 days. Never delete work that could still
    // execute or whose provider outcome is unknown.
    const deliveries = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminderDelivery" d
      WHERE d."createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND d."status" IN ('sent','failed','cancelled')
        AND NOT EXISTS (SELECT 1 FROM "SmartReminderNotification" n WHERE n."deliveryId"=d."id")
    `);

    // Finished reminders are retained for 90 days for support/audit, then removed only
    // after all child delivery/notification rows have safely aged out.
    const reminders = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminder" r
      WHERE r."status" IN ('completed','cancelled')
        AND r."updatedAt" < CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND NOT EXISTS (SELECT 1 FROM "SmartReminderDelivery" d WHERE d."reminderId"=r."id" AND d."businessId"=r."businessId")
        AND NOT EXISTS (SELECT 1 FROM "SmartReminderNotification" n WHERE n."reminderId"=r."id" AND n."businessId"=r."businessId")
    `);

    // Archived notes are a 30-day recycle bin. Linked notes are preserved until their
    // reminder is itself safely removed. Active/draft notes are never deleted by age.
    const notes = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "BusinessNote" n
      WHERE n."status"='archived'
        AND n."archivedAt" IS NOT NULL
        AND n."archivedAt" < CURRENT_TIMESTAMP - INTERVAL '30 days'
        AND NOT EXISTS (SELECT 1 FROM "SmartReminder" r WHERE r."businessNoteId"=n."id" AND r."businessId"=n."businessId")
    `);

    return { notifications, deliveries, reminders, notes };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
}
