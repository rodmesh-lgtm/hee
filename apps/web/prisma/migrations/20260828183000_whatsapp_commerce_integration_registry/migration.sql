CREATE TABLE "WhatsAppCommerceIntegration" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalStoreId" TEXT NOT NULL,
  "displayName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "credentialEnvelope" JSONB,
  "connectedAt" TIMESTAMP(3),
  "disconnectedAt" TIMESTAMP(3),
  "lastWebhookAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppCommerceIntegration_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppCommerceIntegration_provider_check" CHECK ("provider" IN ('salla','zid','shopify')),
  CONSTRAINT "WhatsAppCommerceIntegration_status_check" CHECK ("status" IN ('draft','active','disconnected')),
  CONSTRAINT "WhatsAppCommerceIntegration_store_check" CHECK (char_length("externalStoreId") BETWEEN 1 AND 255),
  CONSTRAINT "WhatsAppCommerceIntegration_name_check" CHECK ("displayName" IS NULL OR char_length("displayName") BETWEEN 1 AND 120),
  CONSTRAINT "WhatsAppCommerceIntegration_error_check" CHECK ("lastErrorCode" IS NULL OR char_length("lastErrorCode") BETWEEN 1 AND 100),
  CONSTRAINT "WhatsAppCommerceIntegration_lifecycle_check" CHECK (
    ("status" = 'draft' AND "credentialEnvelope" IS NULL AND "connectedAt" IS NULL AND "disconnectedAt" IS NULL)
    OR ("status" = 'active' AND "credentialEnvelope" IS NOT NULL AND "connectedAt" IS NOT NULL AND "disconnectedAt" IS NULL)
    OR ("status" = 'disconnected' AND "credentialEnvelope" IS NULL AND "disconnectedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "WhatsAppCommerceIntegration_tenant_store_unique" ON "WhatsAppCommerceIntegration"("businessId","provider","externalStoreId");
CREATE UNIQUE INDEX "WhatsAppCommerceIntegration_id_business_unique" ON "WhatsAppCommerceIntegration"("id","businessId");
CREATE UNIQUE INDEX "WhatsAppCommerceIntegration_active_store_unique" ON "WhatsAppCommerceIntegration"("provider","externalStoreId") WHERE "status" = 'active';
CREATE INDEX "WhatsAppCommerceIntegration_business_status_idx" ON "WhatsAppCommerceIntegration"("businessId","provider","status");
ALTER TABLE "WhatsAppCommerceIntegration" ADD CONSTRAINT "WhatsAppCommerceIntegration_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
