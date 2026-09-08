-- INFRO Smart Reminders: email and in-app reminders must not depend on a WhatsApp connection.
-- Existing WhatsApp reminders remain protected by explicit database checks.

ALTER TABLE "SmartReminder"
  ALTER COLUMN "connectionId" DROP NOT NULL,
  ALTER COLUMN "templateId" DROP NOT NULL,
  ALTER COLUMN "recipientPhoneE164" DROP NOT NULL,
  ALTER COLUMN "recipientConsentedAt" DROP NOT NULL,
  ALTER COLUMN "recipientConsentEvidence" DROP NOT NULL;

ALTER TABLE "SmartReminderDelivery"
  ALTER COLUMN "connectionId" DROP NOT NULL,
  ALTER COLUMN "templateId" DROP NOT NULL;

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_whatsapp_binding_required" CHECK (
    NOT ('whatsapp' = ANY("deliveryChannels"))
    OR (
      "connectionId" IS NOT NULL
      AND "templateId" IS NOT NULL
      AND "recipientPhoneE164" IS NOT NULL
      AND "recipientConsentedAt" IS NOT NULL
      AND "recipientConsentEvidence" = 'dashboard_explicit_reminder_opt_in_v1'
    )
  );

ALTER TABLE "SmartReminderDelivery"
  ADD CONSTRAINT "SmartReminderDelivery_whatsapp_binding_required" CHECK (
    "channel" <> 'whatsapp'
    OR ("connectionId" IS NOT NULL AND "templateId" IS NOT NULL)
  );
