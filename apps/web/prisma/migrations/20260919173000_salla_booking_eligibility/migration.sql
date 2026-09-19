CREATE TABLE "SallaWebhookEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "merchantId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "processedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  CONSTRAINT "SallaWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SallaWebhookEvent_status_check" CHECK ("status" IN ('pending','processing','retry_scheduled','processed','ignored','failed')),
  CONSTRAINT "SallaWebhookEvent_attempt_check" CHECK ("attemptCount" >= 0),
  CONSTRAINT "SallaWebhookEvent_tenant_fk" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SallaWebhookEvent_integration_tenant_fk" FOREIGN KEY ("integrationId", "businessId") REFERENCES "WhatsAppCommerceIntegration"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SallaWebhookEvent_eventId_key" ON "SallaWebhookEvent"("eventId");
CREATE UNIQUE INDEX "SallaWebhookEvent_id_business_unique" ON "SallaWebhookEvent"("id", "businessId");
CREATE INDEX "SallaWebhookEvent_pending_idx" ON "SallaWebhookEvent"("status", "nextAttemptAt", "receivedAt");
CREATE INDEX "SallaWebhookEvent_integration_received_idx" ON "SallaWebhookEvent"("integrationId", "receivedAt");

CREATE TABLE "CommerceBookingEligibility" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "externalOrderId" TEXT NOT NULL,
  "phoneE164" TEXT,
  "paymentStatus" TEXT,
  "orderStatus" TEXT,
  "eligible" BOOLEAN NOT NULL DEFAULT false,
  "providerUpdatedAt" TIMESTAMP(3),
  "sourceEventId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommerceBookingEligibility_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommerceBookingEligibility_provider_check" CHECK ("provider" IN ('salla')),
  CONSTRAINT "CommerceBookingEligibility_phone_check" CHECK ("phoneE164" IS NULL OR "phoneE164" ~ '^\\+[1-9][0-9]{7,14}$'),
  CONSTRAINT "CommerceBookingEligibility_tenant_fk" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "CommerceBookingEligibility_integration_tenant_fk" FOREIGN KEY ("integrationId", "businessId") REFERENCES "WhatsAppCommerceIntegration"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "CommerceBookingEligibility_integration_order_unique" ON "CommerceBookingEligibility"("integrationId", "externalOrderId");
CREATE UNIQUE INDEX "CommerceBookingEligibility_id_business_unique" ON "CommerceBookingEligibility"("id", "businessId");
CREATE INDEX "CommerceBookingEligibility_business_phone_idx" ON "CommerceBookingEligibility"("businessId", "phoneE164", "eligible");
CREATE INDEX "CommerceBookingEligibility_integration_status_idx" ON "CommerceBookingEligibility"("integrationId", "eligible", "updatedAt");
