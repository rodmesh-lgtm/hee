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
    deliveryReceiptsReady: boolean;
    progressReady: boolean;
    workCompletionReady: boolean;
    notificationReady: boolean;
    platformRateReady: boolean;
    platformOptOutReady: boolean;
  }>>(Prisma.sql`
    SELECT
      to_regclass('public."SmartReminder"') IS NOT NULL AS "reminderReady",
      to_regclass('public."SmartReminderDelivery"') IS NOT NULL AS "deliveryReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='deliveryChannels') AS "channelsReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminderDelivery' AND column_name='channel') AS "deliveryChannelReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='whatsappSenderMode') AS "reminderSenderModeReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminderDelivery' AND column_name='whatsappSenderMode') AS "deliverySenderModeReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminderDelivery' AND column_name='deliveredAt')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminderDelivery' AND column_name='readAt') AS "deliveryReceiptsReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='progressPercent')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='progressNote')
        AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='progressUpdatedAt') AS "progressReady",
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='SmartReminder' AND column_name='workCompletedAt') AS "workCompletionReady",
      to_regclass('public."SmartReminderNotification"') IS NOT NULL AS "notificationReady",
      to_regclass('public."InfroReminderWhatsAppRateBucket"') IS NOT NULL AS "platformRateReady",
      to_regclass('public."InfroReminderWhatsAppOptOut"') IS NOT NULL AS "platformOptOutReady"
  `);
  const readiness = rows[0];
  return Boolean(
    readiness?.reminderReady
    && readiness?.deliveryReady
    && readiness?.channelsReady
    && readiness?.deliveryChannelReady
    && readiness?.reminderSenderModeReady
    && readiness?.deliverySenderModeReady
    && readiness?.deliveryReceiptsReady
    && readiness?.progressReady
    && readiness?.workCompletionReady
    && readiness?.notificationReady
    && readiness?.platformRateReady
    && readiness?.platformOptOutReady
  );
}
