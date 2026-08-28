CREATE TABLE "WhatsAppAutomation" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "triggerType" TEXT NOT NULL,
  "triggerConfig" JSONB NOT NULL,
  "actionType" TEXT NOT NULL DEFAULT 'send_template',
  "actionConfig" JSONB NOT NULL,
  "cooldownMinutes" INTEGER NOT NULL DEFAULT 1440,
  "createdByUserId" TEXT NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppAutomation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAutomation_status_check" CHECK ("status" IN ('draft','active','paused','archived')),
  CONSTRAINT "WhatsAppAutomation_trigger_check" CHECK ("triggerType" IN ('welcome','appointment_reminder','follow_up','order_update','inactive_customer','abandoned_cart','api_event')),
  CONSTRAINT "WhatsAppAutomation_action_check" CHECK ("actionType" = 'send_template'),
  CONSTRAINT "WhatsAppAutomation_cooldown_check" CHECK ("cooldownMinutes" BETWEEN 0 AND 525600)
);

CREATE UNIQUE INDEX "WhatsAppAutomation_id_business_unique" ON "WhatsAppAutomation"("id","businessId");
CREATE UNIQUE INDEX "WhatsAppAutomation_id_business_connection_unique" ON "WhatsAppAutomation"("id","businessId","connectionId");
CREATE INDEX "WhatsAppAutomation_business_trigger_idx" ON "WhatsAppAutomation"("businessId","status","triggerType");
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_connection_tenant_fkey" FOREIGN KEY ("connectionId","businessId") REFERENCES "WhatsAppConnection"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomation" ADD CONSTRAINT "WhatsAppAutomation_created_by_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppAutomationEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "automationId" TEXT,
  "source" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "triggerType" TEXT NOT NULL,
  "subjectType" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "contactId" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "processingErrorCode" TEXT,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppAutomationEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAutomationEvent_status_check" CHECK ("status" IN ('pending','processing','processed','retry_scheduled','failed')),
  CONSTRAINT "WhatsAppAutomationEvent_attempt_check" CHECK ("attemptCount" BETWEEN 0 AND 8)
);
CREATE UNIQUE INDEX "WhatsAppAutomationEvent_tenant_source_event_unique" ON "WhatsAppAutomationEvent"("businessId","source","externalEventId");
CREATE UNIQUE INDEX "WhatsAppAutomationEvent_id_business_unique" ON "WhatsAppAutomationEvent"("id","businessId");
CREATE INDEX "WhatsAppAutomationEvent_ready_idx" ON "WhatsAppAutomationEvent"("status","nextAttemptAt");
CREATE INDEX "WhatsAppAutomationEvent_tenant_trigger_idx" ON "WhatsAppAutomationEvent"("businessId","triggerType","occurredAt");
CREATE INDEX "WhatsAppAutomationEvent_lease_idx" ON "WhatsAppAutomationEvent"("leaseExpiresAt");
ALTER TABLE "WhatsAppAutomationEvent" ADD CONSTRAINT "WhatsAppAutomationEvent_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationEvent" ADD CONSTRAINT "WhatsAppAutomationEvent_automation_tenant_fkey" FOREIGN KEY ("automationId","businessId") REFERENCES "WhatsAppAutomation"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppAutomationRun" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "skipReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "WhatsAppAutomationRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAutomationRun_status_check" CHECK ("status" IN ('queued','skipped','completed','failed'))
);
CREATE UNIQUE INDEX "WhatsAppAutomationRun_automation_event_unique" ON "WhatsAppAutomationRun"("automationId","eventId");
CREATE UNIQUE INDEX "WhatsAppAutomationRun_id_business_unique" ON "WhatsAppAutomationRun"("id","businessId");
CREATE UNIQUE INDEX "WhatsAppAutomationRun_id_business_automation_unique" ON "WhatsAppAutomationRun"("id","businessId","automationId");
CREATE UNIQUE INDEX "WhatsAppAutomationRun_idempotency_unique" ON "WhatsAppAutomationRun"("idempotencyKey");
CREATE INDEX "WhatsAppAutomationRun_cooldown_idx" ON "WhatsAppAutomationRun"("businessId","automationId","contactId","createdAt");
ALTER TABLE "WhatsAppAutomationRun" ADD CONSTRAINT "WhatsAppAutomationRun_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationRun" ADD CONSTRAINT "WhatsAppAutomationRun_automation_tenant_fkey" FOREIGN KEY ("automationId","businessId") REFERENCES "WhatsAppAutomation"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationRun" ADD CONSTRAINT "WhatsAppAutomationRun_event_tenant_fkey" FOREIGN KEY ("eventId","businessId") REFERENCES "WhatsAppAutomationEvent"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationRun" ADD CONSTRAINT "WhatsAppAutomationRun_contact_tenant_fkey" FOREIGN KEY ("contactId","businessId") REFERENCES "WhatsAppContact"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppAutomationJob" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "templateParameters" JSONB,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseOwner" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "providerMessageId" TEXT,
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppAutomationJob_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAutomationJob_status_check" CHECK ("status" IN ('queued','processing','retry_scheduled','sent','failed','cancelled','delivery_unknown')),
  CONSTRAINT "WhatsAppAutomationJob_attempt_check" CHECK ("attemptCount" BETWEEN 0 AND 8)
);
CREATE UNIQUE INDEX "WhatsAppAutomationJob_runId_key" ON "WhatsAppAutomationJob"("runId");
CREATE UNIQUE INDEX "WhatsAppAutomationJob_run_tenant_unique" ON "WhatsAppAutomationJob"("runId","businessId","automationId");
CREATE UNIQUE INDEX "WhatsAppAutomationJob_idempotencyKey_key" ON "WhatsAppAutomationJob"("idempotencyKey");
CREATE UNIQUE INDEX "WhatsAppAutomationJob_providerMessageId_key" ON "WhatsAppAutomationJob"("providerMessageId");
CREATE INDEX "WhatsAppAutomationJob_ready_idx" ON "WhatsAppAutomationJob"("status","nextAttemptAt");
CREATE INDEX "WhatsAppAutomationJob_tenant_status_idx" ON "WhatsAppAutomationJob"("businessId","automationId","status");
CREATE INDEX "WhatsAppAutomationJob_lease_idx" ON "WhatsAppAutomationJob"("leaseExpiresAt");
ALTER TABLE "WhatsAppAutomationJob" ADD CONSTRAINT "WhatsAppAutomationJob_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationJob" ADD CONSTRAINT "WhatsAppAutomationJob_automation_tenant_fkey" FOREIGN KEY ("automationId","businessId","connectionId") REFERENCES "WhatsAppAutomation"("id","businessId","connectionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationJob" ADD CONSTRAINT "WhatsAppAutomationJob_run_tenant_fkey" FOREIGN KEY ("runId","businessId","automationId") REFERENCES "WhatsAppAutomationRun"("id","businessId","automationId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationJob" ADD CONSTRAINT "WhatsAppAutomationJob_connection_tenant_fkey" FOREIGN KEY ("connectionId","businessId") REFERENCES "WhatsAppConnection"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationJob" ADD CONSTRAINT "WhatsAppAutomationJob_contact_tenant_fkey" FOREIGN KEY ("contactId","businessId") REFERENCES "WhatsAppContact"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationJob" ADD CONSTRAINT "WhatsAppAutomationJob_template_tenant_fkey" FOREIGN KEY ("templateId","businessId","connectionId") REFERENCES "WhatsAppTemplate"("id","businessId","connectionId") ON DELETE RESTRICT ON UPDATE CASCADE;
