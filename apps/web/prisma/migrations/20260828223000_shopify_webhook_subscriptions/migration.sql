CREATE TABLE "WhatsAppShopifyWebhookSync" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "syncedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppShopifyWebhookSync_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppShopifyWebhookSync_status_check" CHECK ("status" IN ('pending','processing','retry_scheduled','ready','failed')),
  CONSTRAINT "WhatsAppShopifyWebhookSync_attempt_check" CHECK ("attemptCount" BETWEEN 0 AND 8),
  CONSTRAINT "WhatsAppShopifyWebhookSync_lease_check" CHECK (
    ("status" = 'processing' AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL)
    OR ("status" <> 'processing' AND "leaseOwner" IS NULL AND "leaseExpiresAt" IS NULL)
  ),
  CONSTRAINT "WhatsAppShopifyWebhookSync_owner_check" CHECK ("leaseOwner" IS NULL OR char_length("leaseOwner") BETWEEN 1 AND 100),
  CONSTRAINT "WhatsAppShopifyWebhookSync_error_check" CHECK ("lastErrorCode" IS NULL OR char_length("lastErrorCode") BETWEEN 1 AND 100)
);

CREATE UNIQUE INDEX "WhatsAppShopifyWebhookSync_integrationId_key" ON "WhatsAppShopifyWebhookSync"("integrationId");
CREATE UNIQUE INDEX "WhatsAppShopifyWebhookSync_id_business_unique" ON "WhatsAppShopifyWebhookSync"("id","businessId");
CREATE UNIQUE INDEX "WhatsAppShopifyWebhookSync_integration_business_unique" ON "WhatsAppShopifyWebhookSync"("integrationId","businessId");
CREATE INDEX "WhatsAppShopifyWebhookSync_pending_idx" ON "WhatsAppShopifyWebhookSync"("status","nextAttemptAt");

ALTER TABLE "WhatsAppShopifyWebhookSync"
  ADD CONSTRAINT "WhatsAppShopifyWebhookSync_business_fkey"
    FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsAppShopifyWebhookSync_integration_tenant_fkey"
    FOREIGN KEY ("integrationId","businessId") REFERENCES "WhatsAppCommerceIntegration"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
