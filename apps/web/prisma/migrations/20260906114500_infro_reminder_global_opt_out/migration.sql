-- INFRO REMINDER global opt-out registry.
-- A single INFRO-owned WhatsApp sender serves many workspaces, so STOP must be
-- enforced globally by recipient phone and must never be scoped to one tenant.

CREATE TABLE "InfroReminderWhatsAppOptOut" (
  "phoneE164" TEXT NOT NULL,
  "optedOutAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "source" TEXT NOT NULL,
  "providerMessageId" TEXT,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InfroReminderWhatsAppOptOut_pkey" PRIMARY KEY ("phoneE164"),
  CONSTRAINT "InfroReminderWhatsAppOptOut_phone_check" CHECK ("phoneE164" ~ '^\\+[1-9][0-9]{7,14}$'),
  CONSTRAINT "InfroReminderWhatsAppOptOut_source_check" CHECK ("source" IN ('whatsapp_keyword','admin_compliance'))
);

CREATE INDEX "InfroReminderWhatsAppOptOut_optedOutAt_idx"
  ON "InfroReminderWhatsAppOptOut" ("optedOutAt");
