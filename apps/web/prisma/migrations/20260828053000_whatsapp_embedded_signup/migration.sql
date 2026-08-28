CREATE TABLE "WhatsAppEmbeddedSignupSession" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "initiatedByUserId" TEXT NOT NULL,
    "stateDigest" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "credentialEnvelope" JSONB,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppEmbeddedSignupSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppEmbeddedSignupSession_stateDigest_key" ON "WhatsAppEmbeddedSignupSession"("stateDigest");
CREATE UNIQUE INDEX "WhatsAppEmbeddedSignupSession_id_business_unique" ON "WhatsAppEmbeddedSignupSession"("id", "businessId");
CREATE INDEX "WhatsAppEmbeddedSignupSession_business_status_expiry_idx" ON "WhatsAppEmbeddedSignupSession"("businessId", "status", "expiresAt");
CREATE INDEX "WhatsAppEmbeddedSignupSession_user_created_idx" ON "WhatsAppEmbeddedSignupSession"("initiatedByUserId", "createdAt");

ALTER TABLE "WhatsAppEmbeddedSignupSession" ADD CONSTRAINT "WhatsAppEmbeddedSignupSession_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppEmbeddedSignupSession" ADD CONSTRAINT "WhatsAppEmbeddedSignupSession_initiatedByUserId_fkey"
FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
