import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "../db";

export async function isSmartRemindersSchemaReady() {
  const rows = await db.$queryRaw<Array<{ reminderReady: boolean; deliveryReady: boolean; channelsReady: boolean; deliveryChannelReady: boolean; notificationReady: boolean }>>(Prisma.sql`
    SELECT
      to_regclass('public."SmartReminder"') IS NOT NULL AS "reminderReady",
      to_regclass('public."SmartReminderDelivery"') IS NOT NULL AS "deliveryReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='deliveryChannels') AS "channelsReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminderDelivery' AND column_name='channel') AS "deliveryChannelReady",
      to_regclass('public."SmartReminderNotification"') IS NOT NULL AS "notificationReady"
  `);
  const readiness = rows[0];
  return Boolean(readiness?.reminderReady && readiness?.deliveryReady && readiness?.channelsReady && readiness?.deliveryChannelReady && readiness?.notificationReady);
}
