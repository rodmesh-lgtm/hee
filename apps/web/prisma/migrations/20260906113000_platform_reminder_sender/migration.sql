-- INFRO REMINDER: central WhatsApp sender for customer reminders.
-- Existing tenant-bound reminders keep sender mode 'tenant'. New reminders may use
-- the INFRO-owned Meta sender with no tenant WhatsApp connection/template binding.

ALTER TABLE "SmartReminder"
  ADD COLUMN "whatsappSenderMode" TEXT NOT NULL DEFAULT 'tenant';

ALTER TABLE "SmartReminderDelivery"
  ADD COLUMN "whatsappSenderMode" TEXT NOT NULL DEFAULT 'tenant';

ALTER TABLE "SmartReminder"
  DROP CONSTRAINT IF EXISTS "SmartReminder_whatsapp_binding_required";

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_whatsapp_sender_mode_check"
  CHECK ("whatsappSenderMode" IN ('tenant','platform')),
  ADD CONSTRAINT "SmartReminder_whatsapp_binding_required" CHECK (
    NOT ('whatsapp' = ANY("deliveryChannels"))
    OR (
      "recipientPhoneE164" IS NOT NULL
      AND "recipientConsentedAt" IS NOT NULL
      AND "recipientConsentEvidence" = 'dashboard_explicit_reminder_opt_in_v1'
      AND (
        ("whatsappSenderMode" = 'tenant' AND "connectionId" IS NOT NULL AND "templateId" IS NOT NULL)
        OR
        ("whatsappSenderMode" = 'platform' AND "connectionId" IS NULL AND "templateId" IS NULL)
      )
    )
  );

ALTER TABLE "SmartReminderDelivery"
  DROP CONSTRAINT IF EXISTS "SmartReminderDelivery_whatsapp_binding_required";

ALTER TABLE "SmartReminderDelivery"
  ADD CONSTRAINT "SmartReminderDelivery_whatsapp_sender_mode_check"
  CHECK ("whatsappSenderMode" IN ('tenant','platform')),
  ADD CONSTRAINT "SmartReminderDelivery_whatsapp_binding_required" CHECK (
    "channel" <> 'whatsapp'
    OR (
      ("whatsappSenderMode" = 'tenant' AND "connectionId" IS NOT NULL AND "templateId" IS NOT NULL)
      OR
      ("whatsappSenderMode" = 'platform' AND "connectionId" IS NULL AND "templateId" IS NULL)
    )
  );

CREATE TABLE "InfroReminderWhatsAppRateBucket" (
  "windowStart" TIMESTAMPTZ NOT NULL,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InfroReminderWhatsAppRateBucket_pkey" PRIMARY KEY ("windowStart"),
  CONSTRAINT "InfroReminderWhatsAppRateBucket_sent_count_check" CHECK ("sentCount" BETWEEN 0 AND 100000)
);
