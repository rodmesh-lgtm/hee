CREATE TABLE "WhatsAppCommerceOAuthSession" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "initiatedByUserId" TEXT NOT NULL,
  "stateDigest" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'created',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppCommerceOAuthSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppCommerceOAuthSession_state_digest_check" CHECK (char_length("stateDigest") = 64),
  CONSTRAINT "WhatsAppCommerceOAuthSession_status_check" CHECK ("status" IN ('created','exchanging','connected','failed','cancelled')),
  CONSTRAINT "WhatsAppCommerceOAuthSession_error_check" CHECK ("lastErrorCode" IS NULL OR char_length("lastErrorCode") BETWEEN 1 AND 100),
  CONSTRAINT "WhatsAppCommerceOAuthSession_lifecycle_check" CHECK (
    ("status" IN ('created','exchanging') AND "consumedAt" IS NULL) OR
    ("status" IN ('connected','failed','cancelled') AND "consumedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "WhatsAppCommerceOAuthSession_stateDigest_key" ON "WhatsAppCommerceOAuthSession"("stateDigest");
CREATE UNIQUE INDEX "WhatsAppCommerceOAuthSession_id_business_unique" ON "WhatsAppCommerceOAuthSession"("id","businessId");
CREATE INDEX "WhatsAppCommerceOAuthSession_integration_status_idx" ON "WhatsAppCommerceOAuthSession"("businessId","integrationId","status","expiresAt");
CREATE INDEX "WhatsAppCommerceOAuthSession_user_created_idx" ON "WhatsAppCommerceOAuthSession"("initiatedByUserId","createdAt");

ALTER TABLE "WhatsAppCommerceOAuthSession" ADD CONSTRAINT "WhatsAppCommerceOAuthSession_business_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppCommerceOAuthSession" ADD CONSTRAINT "WhatsAppCommerceOAuthSession_integration_tenant_fkey"
FOREIGN KEY ("integrationId","businessId") REFERENCES "WhatsAppCommerceIntegration"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppCommerceOAuthSession" ADD CONSTRAINT "WhatsAppCommerceOAuthSession_user_fkey"
FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
