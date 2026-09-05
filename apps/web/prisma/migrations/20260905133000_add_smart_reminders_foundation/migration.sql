-- INFRO Smart Reminders persistence foundation.
-- The tables are tenant-scoped and deliberately reuse the existing Meta connection/template trust boundary.

CREATE TABLE "SmartReminder" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientPhoneE164" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "nextOccurrenceAt" TIMESTAMP(3),
    "recurrenceType" TEXT NOT NULL DEFAULT 'once',
    "recurrenceConfig" JSONB,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "pausedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SmartReminder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SmartReminder_title_check" CHECK (char_length("title") BETWEEN 1 AND 160),
    CONSTRAINT "SmartReminder_body_check" CHECK (char_length("body") BETWEEN 1 AND 2000),
    CONSTRAINT "SmartReminder_timezone_check" CHECK (char_length("timezone") BETWEEN 1 AND 64),
    CONSTRAINT "SmartReminder_recipient_check" CHECK ("recipientPhoneE164" ~ '^\\+[1-9][0-9]{7,14}$'),
    CONSTRAINT "SmartReminder_recurrence_check" CHECK ("recurrenceType" IN ('once','daily','weekly','monthly')),
    CONSTRAINT "SmartReminder_status_check" CHECK ("status" IN ('scheduled','paused','completed','cancelled'))
);

CREATE TABLE "SmartReminderDelivery" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "reminderId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "occurrenceAt" TIMESTAMP(3) NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseOwner" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "providerMessageId" TEXT,
    "lastErrorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),

    CONSTRAINT "SmartReminderDelivery_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SmartReminderDelivery_status_check" CHECK ("status" IN ('queued','processing','retry_scheduled','sent','failed','delivery_unknown','cancelled')),
    CONSTRAINT "SmartReminderDelivery_attempt_check" CHECK ("attemptCount" >= 0)
);

CREATE UNIQUE INDEX "SmartReminder_id_business_unique" ON "SmartReminder"("id", "businessId");
CREATE UNIQUE INDEX "SmartReminder_id_business_connection_unique" ON "SmartReminder"("id", "businessId", "connectionId");
CREATE INDEX "SmartReminder_business_status_next_idx" ON "SmartReminder"("businessId", "status", "nextOccurrenceAt");
CREATE INDEX "SmartReminder_business_created_idx" ON "SmartReminder"("businessId", "createdAt");
CREATE INDEX "SmartReminder_connection_status_idx" ON "SmartReminder"("connectionId", "status");

CREATE UNIQUE INDEX "SmartReminderDelivery_idempotency_unique" ON "SmartReminderDelivery"("idempotencyKey");
CREATE UNIQUE INDEX "SmartReminderDelivery_provider_message_unique" ON "SmartReminderDelivery"("providerMessageId");
CREATE UNIQUE INDEX "SmartReminderDelivery_occurrence_unique" ON "SmartReminderDelivery"("businessId", "reminderId", "occurrenceAt");
CREATE INDEX "SmartReminderDelivery_ready_idx" ON "SmartReminderDelivery"("status", "nextAttemptAt");
CREATE INDEX "SmartReminderDelivery_tenant_status_idx" ON "SmartReminderDelivery"("businessId", "status", "createdAt");
CREATE INDEX "SmartReminderDelivery_lease_idx" ON "SmartReminderDelivery"("leaseExpiresAt");

ALTER TABLE "SmartReminder"
  ADD CONSTRAINT "SmartReminder_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminder_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminder_connection_tenant_fkey" FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppConnection"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminder_template_tenant_connection_fkey" FOREIGN KEY ("templateId", "businessId", "connectionId") REFERENCES "WhatsAppTemplate"("id", "businessId", "connectionId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SmartReminderDelivery"
  ADD CONSTRAINT "SmartReminderDelivery_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminderDelivery_reminder_tenant_connection_fkey" FOREIGN KEY ("reminderId", "businessId", "connectionId") REFERENCES "SmartReminder"("id", "businessId", "connectionId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminderDelivery_connection_tenant_fkey" FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppConnection"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "SmartReminderDelivery_template_tenant_connection_fkey" FOREIGN KEY ("templateId", "businessId", "connectionId") REFERENCES "WhatsAppTemplate"("id", "businessId", "connectionId") ON DELETE RESTRICT ON UPDATE CASCADE;
