CREATE TABLE "WhatsAppAutomationApiKey" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "keyPrefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdByUserId" TEXT NOT NULL,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppAutomationApiKey_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAutomationApiKey_status_check" CHECK ("status" IN ('active','revoked')),
  CONSTRAINT "WhatsAppAutomationApiKey_prefix_check" CHECK ("keyPrefix" ~ '^irwa_live_[0-9a-f]{16}$'),
  CONSTRAINT "WhatsAppAutomationApiKey_hash_check" CHECK ("keyHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "WhatsAppAutomationApiKey_revocation_check" CHECK (("status" = 'active' AND "revokedAt" IS NULL) OR ("status" = 'revoked' AND "revokedAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "WhatsAppAutomationApiKey_keyPrefix_key" ON "WhatsAppAutomationApiKey"("keyPrefix");
CREATE UNIQUE INDEX "WhatsAppAutomationApiKey_id_business_unique" ON "WhatsAppAutomationApiKey"("id","businessId");
CREATE INDEX "WhatsAppAutomationApiKey_business_status_idx" ON "WhatsAppAutomationApiKey"("businessId","status","createdAt");
ALTER TABLE "WhatsAppAutomationApiKey" ADD CONSTRAINT "WhatsAppAutomationApiKey_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationApiKey" ADD CONSTRAINT "WhatsAppAutomationApiKey_created_by_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
