CREATE UNIQUE INDEX "WhatsAppConnection_id_business_unique" ON "WhatsAppConnection"("id", "businessId");

CREATE TABLE "WhatsAppTemplate" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'meta',
  "providerTemplateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "language" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "providerStatus" TEXT NOT NULL,
  "parameterFormat" TEXT,
  "qualityScore" TEXT,
  "rejectedReason" TEXT,
  "components" JSONB NOT NULL,
  "rawPayload" JSONB NOT NULL,
  "lastSyncedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppTemplate_provider_id_unique" ON "WhatsAppTemplate"("provider", "providerTemplateId");
CREATE UNIQUE INDEX "WhatsAppTemplate_business_name_language_unique" ON "WhatsAppTemplate"("businessId", "name", "language");
CREATE INDEX "WhatsAppTemplate_business_status_idx" ON "WhatsAppTemplate"("businessId", "status");
CREATE INDEX "WhatsAppTemplate_connection_sync_idx" ON "WhatsAppTemplate"("connectionId", "lastSyncedAt");

ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_connection_tenant_fkey" FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppConnection"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_provider_check" CHECK ("provider" = 'meta');
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_status_check" CHECK ("status" IN ('approved', 'pending', 'rejected', 'paused', 'disabled', 'unknown'));
ALTER TABLE "WhatsAppTemplate" ADD CONSTRAINT "WhatsAppTemplate_category_check" CHECK ("category" IN ('marketing', 'utility', 'authentication', 'unknown'));
