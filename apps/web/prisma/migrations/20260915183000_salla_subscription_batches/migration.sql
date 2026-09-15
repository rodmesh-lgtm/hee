CREATE TABLE "SallaSubscriptionBatch" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "externalProductId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "capacity" INTEGER NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "durationDays" INTEGER NOT NULL,
  "templateId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SallaSubscriptionBatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SallaSubscriptionBatch_capacity_check" CHECK ("capacity" BETWEEN 1 AND 100000),
  CONSTRAINT "SallaSubscriptionBatch_duration_check" CHECK ("durationDays" BETWEEN 1 AND 3650),
  CONSTRAINT "SallaSubscriptionBatch_status_check" CHECK ("status" IN ('draft','open','closed','cancelled')),
  CONSTRAINT "SallaSubscriptionBatch_integration_tenant_fkey" FOREIGN KEY ("integrationId","businessId") REFERENCES "WhatsAppCommerceIntegration"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SallaSubscriptionBatch_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SallaSubscriptionBatch_id_business_unique" ON "SallaSubscriptionBatch"("id","businessId");
CREATE UNIQUE INDEX "SallaSubscriptionBatch_product_unique" ON "SallaSubscriptionBatch"("businessId","integrationId","externalProductId","startAt");
CREATE INDEX "SallaSubscriptionBatch_business_status_idx" ON "SallaSubscriptionBatch"("businessId","status","startAt");

CREATE TABLE "SallaSubscriptionEnrollment" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "batchId" TEXT NOT NULL,
  "externalOrderId" TEXT NOT NULL,
  "externalCustomerId" TEXT,
  "phoneE164" TEXT NOT NULL,
  "purchasedAt" TIMESTAMP(3) NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'scheduled',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SallaSubscriptionEnrollment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SallaSubscriptionEnrollment_status_check" CHECK ("status" IN ('scheduled','active','expired','cancelled','refunded')),
  CONSTRAINT "SallaSubscriptionEnrollment_batch_tenant_fkey" FOREIGN KEY ("batchId","businessId") REFERENCES "SallaSubscriptionBatch"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SallaSubscriptionEnrollment_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SallaSubscriptionEnrollment_id_business_unique" ON "SallaSubscriptionEnrollment"("id","businessId");
CREATE UNIQUE INDEX "SallaSubscriptionEnrollment_order_batch_unique" ON "SallaSubscriptionEnrollment"("businessId","batchId","externalOrderId");
CREATE INDEX "SallaSubscriptionEnrollment_activation_idx" ON "SallaSubscriptionEnrollment"("status","startAt");
CREATE INDEX "SallaSubscriptionEnrollment_business_batch_idx" ON "SallaSubscriptionEnrollment"("businessId","batchId","status");

CREATE TABLE "SallaWebhookEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  CONSTRAINT "SallaWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SallaWebhookEvent_status_check" CHECK ("status" IN ('pending','processing','processed','failed')),
  CONSTRAINT "SallaWebhookEvent_integration_tenant_fkey" FOREIGN KEY ("integrationId","businessId") REFERENCES "WhatsAppCommerceIntegration"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "SallaWebhookEvent_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SallaWebhookEvent_id_business_unique" ON "SallaWebhookEvent"("id","businessId");
CREATE UNIQUE INDEX "SallaWebhookEvent_external_unique" ON "SallaWebhookEvent"("businessId","integrationId","externalEventId");
CREATE INDEX "SallaWebhookEvent_pending_idx" ON "SallaWebhookEvent"("status","nextAttemptAt","receivedAt");
CREATE INDEX "SallaWebhookEvent_integration_received_idx" ON "SallaWebhookEvent"("integrationId","receivedAt");
