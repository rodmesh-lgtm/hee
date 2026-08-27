CREATE UNIQUE INDEX "WhatsAppTemplate_id_business_unique" ON "WhatsAppTemplate"("id", "businessId");
CREATE UNIQUE INDEX "WhatsAppTemplate_id_business_connection_unique" ON "WhatsAppTemplate"("id", "businessId", "connectionId");

CREATE TABLE "WhatsAppCampaign" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "audienceDefinition" JSONB NOT NULL,
  "templateSnapshot" JSONB,
  "totalRecipients" INTEGER NOT NULL DEFAULT 0,
  "scheduledAt" TIMESTAMP(3),
  "snapshotAt" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "pausedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppCampaign_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppCampaign_id_business_unique" ON "WhatsAppCampaign"("id", "businessId");
CREATE INDEX "WhatsAppCampaign_business_status_idx" ON "WhatsAppCampaign"("businessId", "status", "createdAt");
CREATE INDEX "WhatsAppCampaign_connection_status_idx" ON "WhatsAppCampaign"("connectionId", "status");
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_connection_tenant_fkey" FOREIGN KEY ("connectionId", "businessId") REFERENCES "WhatsAppConnection"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_template_tenant_fkey" FOREIGN KEY ("templateId", "businessId", "connectionId") REFERENCES "WhatsAppTemplate"("id", "businessId", "connectionId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_status_check" CHECK ("status" IN ('draft', 'snapshotting', 'ready', 'scheduled', 'running', 'paused', 'completed', 'cancelled', 'failed'));
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_recipient_count_check" CHECK ("totalRecipients" >= 0);
ALTER TABLE "WhatsAppCampaign" ADD CONSTRAINT "WhatsAppCampaign_snapshot_state_check" CHECK (
  ("status" IN ('draft', 'snapshotting') AND "snapshotAt" IS NULL) OR
  ("status" IN ('ready', 'scheduled', 'running', 'paused', 'completed') AND "snapshotAt" IS NOT NULL AND "templateSnapshot" IS NOT NULL) OR
  ("status" IN ('cancelled', 'failed'))
);

CREATE TABLE "WhatsAppCampaignRecipient" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "phoneE164" TEXT NOT NULL,
  "displayName" TEXT,
  "templateParameters" JSONB,
  "status" TEXT NOT NULL DEFAULT 'snapshotted',
  "queuedAt" TIMESTAMP(3),
  "processingAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppCampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppCampaignRecipient_campaign_contact_unique" ON "WhatsAppCampaignRecipient"("campaignId", "contactId");
CREATE UNIQUE INDEX "WhatsAppCampaignRecipient_campaign_phone_unique" ON "WhatsAppCampaignRecipient"("campaignId", "phoneE164");
CREATE INDEX "WhatsAppCampaignRecipient_business_status_idx" ON "WhatsAppCampaignRecipient"("businessId", "campaignId", "status");
ALTER TABLE "WhatsAppCampaignRecipient" ADD CONSTRAINT "WhatsAppCampaignRecipient_campaign_tenant_fkey" FOREIGN KEY ("campaignId", "businessId") REFERENCES "WhatsAppCampaign"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppCampaignRecipient" ADD CONSTRAINT "WhatsAppCampaignRecipient_contact_tenant_fkey" FOREIGN KEY ("contactId", "businessId") REFERENCES "WhatsAppContact"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppCampaignRecipient" ADD CONSTRAINT "WhatsAppCampaignRecipient_phone_e164_check" CHECK ("phoneE164" ~ '^\+[1-9][0-9]{7,14}$');
ALTER TABLE "WhatsAppCampaignRecipient" ADD CONSTRAINT "WhatsAppCampaignRecipient_status_check" CHECK ("status" IN ('snapshotted', 'queued', 'processing', 'sent', 'delivered', 'read', 'failed', 'cancelled', 'skipped_opt_out'));

CREATE FUNCTION "prevent_whatsapp_campaign_snapshot_mutation"() RETURNS trigger AS $$
BEGIN
  IF OLD."snapshotAt" IS NOT NULL AND (
    NEW."businessId" IS DISTINCT FROM OLD."businessId" OR
    NEW."connectionId" IS DISTINCT FROM OLD."connectionId" OR
    NEW."templateId" IS DISTINCT FROM OLD."templateId" OR
    NEW."audienceDefinition" IS DISTINCT FROM OLD."audienceDefinition" OR
    NEW."templateSnapshot" IS DISTINCT FROM OLD."templateSnapshot" OR
    NEW."totalRecipients" IS DISTINCT FROM OLD."totalRecipients" OR
    NEW."snapshotAt" IS DISTINCT FROM OLD."snapshotAt"
  ) THEN
    RAISE EXCEPTION 'WhatsApp campaign snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WhatsAppCampaign_snapshot_immutable"
BEFORE UPDATE ON "WhatsAppCampaign"
FOR EACH ROW EXECUTE FUNCTION "prevent_whatsapp_campaign_snapshot_mutation"();

CREATE FUNCTION "prevent_whatsapp_campaign_recipient_snapshot_mutation"() RETURNS trigger AS $$
BEGIN
  IF NEW."businessId" IS DISTINCT FROM OLD."businessId" OR
     NEW."campaignId" IS DISTINCT FROM OLD."campaignId" OR
     NEW."contactId" IS DISTINCT FROM OLD."contactId" OR
     NEW."phoneE164" IS DISTINCT FROM OLD."phoneE164" OR
     NEW."displayName" IS DISTINCT FROM OLD."displayName" OR
     NEW."templateParameters" IS DISTINCT FROM OLD."templateParameters" THEN
    RAISE EXCEPTION 'WhatsApp campaign recipient snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WhatsAppCampaignRecipient_snapshot_immutable"
BEFORE UPDATE ON "WhatsAppCampaignRecipient"
FOR EACH ROW EXECUTE FUNCTION "prevent_whatsapp_campaign_recipient_snapshot_mutation"();
