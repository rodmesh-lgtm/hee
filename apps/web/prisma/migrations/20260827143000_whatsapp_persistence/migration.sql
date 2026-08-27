-- WhatsApp Cloud API persistence foundation. This migration stores no plaintext access tokens.
CREATE TABLE "WhatsAppConnection" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "wabaId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "displayPhoneNumber" TEXT,
    "verifiedName" TEXT,
    "credentialEnvelope" JSONB NOT NULL,
    "connectedAt" TIMESTAMP(3),
    "disabledAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppConnection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppConnection_business_provider_unique" ON "WhatsAppConnection"("businessId", "provider");
CREATE UNIQUE INDEX "WhatsAppConnection_provider_waba_unique" ON "WhatsAppConnection"("provider", "wabaId");
CREATE UNIQUE INDEX "WhatsAppConnection_provider_phone_unique" ON "WhatsAppConnection"("provider", "phoneNumberId");
CREATE INDEX "WhatsAppConnection_business_status_idx" ON "WhatsAppConnection"("businessId", "status");
ALTER TABLE "WhatsAppConnection" ADD CONSTRAINT "WhatsAppConnection_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppConsent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "phoneE164" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "consentedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppConsent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppConsent_business_phone_unique" ON "WhatsAppConsent"("businessId", "phoneE164");
CREATE INDEX "WhatsAppConsent_business_active_idx" ON "WhatsAppConsent"("businessId", "revokedAt");
CREATE INDEX "WhatsAppConsent_customer_idx" ON "WhatsAppConsent"("customerId");
ALTER TABLE "WhatsAppConsent" ADD CONSTRAINT "WhatsAppConsent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppConsent" ADD CONSTRAINT "WhatsAppConsent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "WhatsAppWebhookEvent" (
    "id" TEXT NOT NULL,
    "businessId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'meta',
    "providerEventId" TEXT NOT NULL,
    "wabaId" TEXT,
    "phoneNumberId" TEXT,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    CONSTRAINT "WhatsAppWebhookEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WhatsAppWebhookEvent_provider_event_unique" ON "WhatsAppWebhookEvent"("provider", "providerEventId");
CREATE INDEX "WhatsAppWebhookEvent_business_received_idx" ON "WhatsAppWebhookEvent"("businessId", "receivedAt");
CREATE INDEX "WhatsAppWebhookEvent_phone_received_idx" ON "WhatsAppWebhookEvent"("phoneNumberId", "receivedAt");
CREATE INDEX "WhatsAppWebhookEvent_processing_idx" ON "WhatsAppWebhookEvent"("processedAt", "receivedAt");
ALTER TABLE "WhatsAppWebhookEvent" ADD CONSTRAINT "WhatsAppWebhookEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE SET NULL ON UPDATE CASCADE;
