CREATE TABLE "WhatsAppConversation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "phoneNumberId" TEXT NOT NULL,
  "customerPhoneE164" TEXT NOT NULL,
  "customerDisplayName" TEXT,
  "lastMessageAt" TIMESTAMP(3),
  "lastInboundAt" TIMESTAMP(3),
  "lastOutboundAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppConversation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppConversation_tenant_phone_unique" ON "WhatsAppConversation"("businessId", "phoneNumberId", "customerPhoneE164");
CREATE INDEX "WhatsAppConversation_business_last_message_idx" ON "WhatsAppConversation"("businessId", "lastMessageAt");
ALTER TABLE "WhatsAppConversation" ADD CONSTRAINT "WhatsAppConversation_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppMessage" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'meta',
  "providerMessageId" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "messageType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "textBody" TEXT,
  "payload" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "providerTimestamp" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppMessage_provider_message_unique" ON "WhatsAppMessage"("provider", "providerMessageId");
CREATE INDEX "WhatsAppMessage_business_created_idx" ON "WhatsAppMessage"("businessId", "createdAt");
CREATE INDEX "WhatsAppMessage_conversation_created_idx" ON "WhatsAppMessage"("conversationId", "createdAt");
CREATE INDEX "WhatsAppMessage_business_status_idx" ON "WhatsAppMessage"("businessId", "status", "createdAt");
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WhatsAppConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_direction_check" CHECK ("direction" IN ('inbound', 'outbound'));
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_status_check" CHECK ("status" IN ('received', 'queued', 'sent', 'delivered', 'read', 'failed'));

-- A message and its conversation must always belong to the same tenant.
CREATE UNIQUE INDEX "WhatsAppConversation_id_business_unique" ON "WhatsAppConversation"("id", "businessId");
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_conversation_tenant_fkey" FOREIGN KEY ("conversationId", "businessId") REFERENCES "WhatsAppConversation"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
