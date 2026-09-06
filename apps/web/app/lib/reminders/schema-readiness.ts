import "server-only";

import { Prisma } from "@prisma/client";
import { db } from "../db";

export async function isSmartRemindersSchemaReady() {
  const rows = await db.$queryRaw<Array<{
    reminderReady: boolean;
    deliveryReady: boolean;
    channelsReady: boolean;
    deliveryChannelReady: boolean;
    reminderSenderModeReady: boolean;
    deliverySenderModeReady: boolean;
    notificationReady: boolean;
    platformRateReady: boolean;
  }>>(Prisma.sql`
    SELECT
      to_regclass('public."SmartReminder"') IS NOT NULL AS "reminderReady",
      to_regclass('public."SmartReminderDelivery"') IS NOT NULL AS "deliveryReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='deliveryChannels') AS "channelsReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminderDelivery' AND column_name='channel') AS "deliveryChannelReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='whatsappSenderMode') AS "reminderSenderModeReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminderDelivery' AND column_name='whatsappSenderMode') AS "deliverySenderModeReady",
      to_regclass('public."SmartReminderNotification"') IS NOT NULL AS "notificationReady",
      to_regclass('public."InfroReminderWhatsAppRateBucket"') IS NOT NULL AS "platformRateReady"
  `);
  const readiness = rows[0];
  return Boolean(
    readiness?.reminderReady
    && readiness?.deliveryReady
    && readiness?.channelsReady
    && readiness?.deliveryChannelReady
    && readiness?.reminderSenderModeReady
    && readiness?.deliverySenderModeReady
    && readiness?.notificationReady
    && readiness?.platformRateReady
  );
}
