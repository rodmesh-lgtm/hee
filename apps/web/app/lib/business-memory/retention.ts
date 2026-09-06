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
    // In-app notifications are transient UI data. Read notification cards may age out even
    // while the underlying business work remains open; the reminder/work record stays intact.
    const notifications = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminderNotification" n
      WHERE (n."readAt" IS NOT NULL AND n."readAt" < CURRENT_TIMESTAMP - INTERVAL '30 days')
         OR EXISTS (
           SELECT 1 FROM "SmartReminder" r
           WHERE r."id"=n."reminderId" AND r."businessId"=n."businessId"
             AND (r."status"='cancelled' OR (r."status"='completed' AND r."progressPercent"=100))
             AND r."updatedAt" < CURRENT_TIMESTAMP - INTERVAL '90 days'
         )
    `);

    // Keep provider delivery evidence for 90 days. This is transport history, not the
    // business-execution record itself, so completed delivery rows may age out independently.
    const deliveries = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminderDelivery" d
      WHERE d."createdAt" < CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND d."status" IN ('sent','failed','cancelled')
        AND NOT EXISTS (SELECT 1 FROM "SmartReminderNotification" n WHERE n."deliveryId"=d."id")
    `);

    // A reminder whose notification lifecycle ended is NOT disposable while work is still
    // partially complete. Only explicit cancellation or 100% business completion qualifies
    // it for age-based removal after child transport evidence has expired.
    const reminders = await tx.$executeRaw(Prisma.sql`
      DELETE FROM "SmartReminder" r
      WHERE (r."status"='cancelled' OR (r."status"='completed' AND r."progressPercent"=100 AND r."workCompletedAt" IS NOT NULL))
        AND r."updatedAt" < CURRENT_TIMESTAMP - INTERVAL '90 days'
        AND NOT EXISTS (SELECT 1 FROM "SmartReminderDelivery" d WHERE d."reminderId"=r."id" AND d."businessId"=r."businessId")
        AND NOT EXISTS (SELECT 1 FROM "SmartReminderNotification" n WHERE n."reminderId"=r."id" AND n."businessId"=r."businessId")
    `);

    // Archived notes are a 30-day recycle bin. Linked notes remain preserved while their
    // business reminder/work context exists. Active and draft notes are never deleted by age.
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
