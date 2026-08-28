CREATE UNIQUE INDEX "WhatsAppCampaign_id_business_connection_unique" ON "WhatsAppCampaign"("id", "businessId", "connectionId");
CREATE UNIQUE INDEX "WhatsAppCampaignRecipient_id_business_unique" ON "WhatsAppCampaignRecipient"("id", "businessId");
CREATE UNIQUE INDEX "WhatsAppCampaignRecipient_id_business_campaign_unique" ON "WhatsAppCampaignRecipient"("id", "businessId", "campaignId");

CREATE TABLE "WhatsAppDeliveryJob" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppDeliveryJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppDeliveryJob_recipient_unique" ON "WhatsAppDeliveryJob"("recipientId");
CREATE UNIQUE INDEX "WhatsAppDeliveryJob_recipient_tenant_campaign_unique" ON "WhatsAppDeliveryJob"("recipientId", "businessId", "campaignId");
CREATE UNIQUE INDEX "WhatsAppDeliveryJob_idempotency_unique" ON "WhatsAppDeliveryJob"("idempotencyKey");
CREATE UNIQUE INDEX "WhatsAppDeliveryJob_provider_message_unique" ON "WhatsAppDeliveryJob"("providerMessageId");
CREATE INDEX "WhatsAppDeliveryJob_ready_idx" ON "WhatsAppDeliveryJob"("status", "nextAttemptAt");
CREATE INDEX "WhatsAppDeliveryJob_campaign_status_idx" ON "WhatsAppDeliveryJob"("businessId", "campaignId", "status");
CREATE INDEX "WhatsAppDeliveryJob_lease_idx" ON "WhatsAppDeliveryJob"("leaseExpiresAt");
ALTER TABLE "WhatsAppDeliveryJob" ADD CONSTRAINT "WhatsAppDeliveryJob_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppDeliveryJob" ADD CONSTRAINT "WhatsAppDeliveryJob_connection_tenant_fkey" FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppConnection"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppDeliveryJob" ADD CONSTRAINT "WhatsAppDeliveryJob_campaign_connection_fkey" FOREIGN KEY ("campaignId", "businessId", "connectionId") REFERENCES "WhatsAppCampaign"("id", "businessId", "connectionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppDeliveryJob" ADD CONSTRAINT "WhatsAppDeliveryJob_recipient_campaign_fkey" FOREIGN KEY ("recipientId", "businessId", "campaignId") REFERENCES "WhatsAppCampaignRecipient"("id", "businessId", "campaignId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppDeliveryJob" ADD CONSTRAINT "WhatsAppDeliveryJob_status_check" CHECK ("status" IN ('queued', 'processing', 'retry_scheduled', 'sent', 'failed', 'cancelled', 'delivery_unknown'));
ALTER TABLE "WhatsAppDeliveryJob" ADD CONSTRAINT "WhatsAppDeliveryJob_attempt_count_check" CHECK ("attemptCount" >= 0);
ALTER TABLE "WhatsAppDeliveryJob" ADD CONSTRAINT "WhatsAppDeliveryJob_lease_check" CHECK (("leaseOwner" IS NULL) = ("leaseExpiresAt" IS NULL));

CREATE TABLE "WhatsAppSendRateBucket" (
  "connectionId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppSendRateBucket_pkey" PRIMARY KEY ("connectionId", "windowStart")
);

CREATE INDEX "WhatsAppSendRateBucket_business_window_idx" ON "WhatsAppSendRateBucket"("businessId", "windowStart");
ALTER TABLE "WhatsAppSendRateBucket" ADD CONSTRAINT "WhatsAppSendRateBucket_connection_tenant_fkey" FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppConnection"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppSendRateBucket" ADD CONSTRAINT "WhatsAppSendRateBucket_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppSendRateBucket" ADD CONSTRAINT "WhatsAppSendRateBucket_count_check" CHECK ("sentCount" >= 0);
