-- INFRO REMINDER provider receipt evidence stays on SmartReminderDelivery.
-- Central reminder traffic must not depend on tenant WhatsAppConversation/WhatsAppMessage.

ALTER TABLE "SmartReminderDelivery"
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "readAt" TIMESTAMP(3);

CREATE INDEX "SmartReminderDelivery_platform_receipt_idx"
  ON "SmartReminderDelivery"("whatsappSenderMode", "channel", "providerMessageId")
  WHERE "providerMessageId" IS NOT NULL;
