CREATE UNIQUE INDEX "WhatsAppConnection_id_business_phone_unique" ON "WhatsAppConnection"("id", "businessId", "phoneNumberId");
CREATE UNIQUE INDEX "WhatsAppConversation_id_business_phone_unique" ON "WhatsAppConversation"("id", "businessId", "phoneNumberId");
CREATE TABLE "WhatsAppReplyJob" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "connectionId" TEXT NOT NULL, "conversationId" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL, "idempotencyKey" TEXT NOT NULL, "textBody" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued', "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "leaseOwner" TEXT, "leaseExpiresAt" TIMESTAMP(3),
  "providerMessageId" TEXT, "lastErrorCode" TEXT, "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppReplyJob_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppReplyJob_idempotency_unique" ON "WhatsAppReplyJob"("idempotencyKey");
CREATE UNIQUE INDEX "WhatsAppReplyJob_provider_message_unique" ON "WhatsAppReplyJob"("providerMessageId");
CREATE INDEX "WhatsAppReplyJob_ready_idx" ON "WhatsAppReplyJob"("status", "nextAttemptAt");
CREATE INDEX "WhatsAppReplyJob_conversation_idx" ON "WhatsAppReplyJob"("businessId", "conversationId", "createdAt");
CREATE INDEX "WhatsAppReplyJob_lease_idx" ON "WhatsAppReplyJob"("leaseExpiresAt");
ALTER TABLE "WhatsAppReplyJob" ADD CONSTRAINT "WhatsAppReplyJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppReplyJob" ADD CONSTRAINT "WhatsAppReplyJob_connection_tenant_phone_fkey" FOREIGN KEY ("connectionId", "businessId", "phoneNumberId") REFERENCES "WhatsAppConnection"("id", "businessId", "phoneNumberId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppReplyJob" ADD CONSTRAINT "WhatsAppReplyJob_conversation_tenant_phone_fkey" FOREIGN KEY ("conversationId", "businessId", "phoneNumberId") REFERENCES "WhatsAppConversation"("id", "businessId", "phoneNumberId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppReplyJob" ADD CONSTRAINT "WhatsAppReplyJob_status_check" CHECK ("status" IN ('queued', 'processing', 'retry_scheduled', 'sent', 'failed', 'cancelled', 'delivery_unknown'));
ALTER TABLE "WhatsAppReplyJob" ADD CONSTRAINT "WhatsAppReplyJob_attempt_count_check" CHECK ("attemptCount" >= 0);
ALTER TABLE "WhatsAppReplyJob" ADD CONSTRAINT "WhatsAppReplyJob_text_check" CHECK (char_length("textBody") BETWEEN 1 AND 4096);
ALTER TABLE "WhatsAppReplyJob" ADD CONSTRAINT "WhatsAppReplyJob_lease_check" CHECK (("leaseOwner" IS NULL) = ("leaseExpiresAt" IS NULL));
