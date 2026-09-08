-- INFRO Smart Reminders multi-channel delivery preferences.
-- Existing reminders remain WhatsApp-only; new reminders can opt into email and/or in-app delivery.

ALTER TABLE "SmartReminder"
  ADD COLUMN "deliveryChannels" TEXT[] NOT NULL DEFAULT ARRAY['whatsapp']::TEXT[];

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_delivery_channels_check" CHECK (
    cardinality("deliveryChannels") BETWEEN 1 AND 3
    AND "deliveryChannels" <@ ARRAY['whatsapp','email','in_app']::TEXT[]
  );

ALTER TABLE "SmartReminderDelivery"
  ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'whatsapp';

ALTER TABLE "SmartReminderDelivery"
  ADD CONSTRAINT "SmartReminderDelivery_channel_check" CHECK ("channel" IN ('whatsapp','email','in_app'));

DROP INDEX "SmartReminderDelivery_occurrence_unique";
CREATE UNIQUE INDEX "SmartReminderDelivery_occurrence_channel_unique"
  ON "SmartReminderDelivery"("businessId", "reminderId", "occurrenceAt", "channel");
CREATE INDEX "SmartReminderDelivery_tenant_channel_status_idx"
  ON "SmartReminderDelivery"("businessId", "channel", "status", "createdAt");

CREATE TABLE "SmartReminderNotification" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SmartReminderNotification_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SmartReminderNotification_title_check" CHECK (char_length("title") BETWEEN 1 AND 160),
    CONSTRAINT "SmartReminderNotification_body_check" CHECK (char_length("body") BETWEEN 1 AND 2000)
);

CREATE UNIQUE INDEX "SmartReminderNotification_delivery_unique" ON "SmartReminderNotification"("deliveryId");
CREATE INDEX "SmartReminderNotification_user_unread_idx" ON "SmartReminderNotification"("userId", "readAt", "createdAt");
CREATE INDEX "SmartReminderNotification_business_created_idx" ON "SmartReminderNotification"("businessId", "createdAt");

ALTER TABLE "SmartReminderNotification"
  ADD CONSTRAINT "SmartReminderNotification_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminderNotification_user_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminderNotification_reminder_tenant_fkey" FOREIGN KEY ("reminderId", "businessId") REFERENCES "SmartReminder"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminderNotification_delivery_fkey" FOREIGN KEY ("deliveryId") REFERENCES "SmartReminderDelivery"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
