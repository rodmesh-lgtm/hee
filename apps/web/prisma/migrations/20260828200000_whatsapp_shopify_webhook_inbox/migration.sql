CREATE TABLE "WhatsAppShopifyWebhookEvent" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "integrationId" TEXT NOT NULL,
  "webhookId" TEXT NOT NULL, "topic" TEXT NOT NULL, "eventId" TEXT, "apiVersion" TEXT NOT NULL,
  "triggeredAt" TIMESTAMP(3), "payload" JSONB NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3), "attemptCount" INTEGER NOT NULL DEFAULT 0, "lastErrorCode" TEXT,
  CONSTRAINT "WhatsAppShopifyWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppShopifyWebhookEvent_header_check" CHECK (char_length("webhookId") BETWEEN 1 AND 128 AND char_length("topic") BETWEEN 1 AND 100 AND char_length("apiVersion") BETWEEN 1 AND 20),
  CONSTRAINT "WhatsAppShopifyWebhookEvent_event_check" CHECK ("eventId" IS NULL OR char_length("eventId") BETWEEN 1 AND 128),
  CONSTRAINT "WhatsAppShopifyWebhookEvent_attempt_check" CHECK ("attemptCount" BETWEEN 0 AND 20),
  CONSTRAINT "WhatsAppShopifyWebhookEvent_error_check" CHECK ("lastErrorCode" IS NULL OR char_length("lastErrorCode") BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX "WhatsAppShopifyWebhookEvent_webhookId_key" ON "WhatsAppShopifyWebhookEvent"("webhookId");
CREATE UNIQUE INDEX "WhatsAppShopifyWebhookEvent_id_business_unique" ON "WhatsAppShopifyWebhookEvent"("id","businessId");
CREATE INDEX "WhatsAppShopifyWebhookEvent_business_pending_idx" ON "WhatsAppShopifyWebhookEvent"("businessId","processedAt","receivedAt");
CREATE INDEX "WhatsAppShopifyWebhookEvent_integration_received_idx" ON "WhatsAppShopifyWebhookEvent"("integrationId","receivedAt");
ALTER TABLE "WhatsAppShopifyWebhookEvent" ADD CONSTRAINT "WhatsAppShopifyWebhookEvent_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppShopifyWebhookEvent" ADD CONSTRAINT "WhatsAppShopifyWebhookEvent_integration_tenant_fkey" FOREIGN KEY ("integrationId","businessId") REFERENCES "WhatsAppCommerceIntegration"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
