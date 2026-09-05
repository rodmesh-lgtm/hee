import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "../db";

export async function isSmartRemindersSchemaReady() {
  const rows = await db.$queryRaw<Array<{ reminderReady: boolean; deliveryReady: boolean }>>(Prisma.sql`
    SELECT
      to_regclass('public."SmartReminder"') IS NOT NULL AS "reminderReady",
      to_regclass('public."SmartReminderDelivery"') IS NOT NULL AS "deliveryReady"
  `);
  const readiness = rows[0];
  return Boolean(readiness?.reminderReady && readiness?.deliveryReady);
}
