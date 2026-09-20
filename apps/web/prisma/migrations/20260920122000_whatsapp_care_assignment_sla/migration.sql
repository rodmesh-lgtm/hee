ALTER TABLE "WhatsAppConversation"
  ADD COLUMN "assignedToUserId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN "slaDueAt" TIMESTAMP(3),
  ADD COLUMN "slaRespondedAt" TIMESTAMP(3);

ALTER TABLE "WhatsAppConversation"
  ADD CONSTRAINT "WhatsAppConversation_priority_check"
  CHECK ("priority" IN ('low', 'normal', 'high', 'urgent'));

ALTER TABLE "WhatsAppConversation"
  ADD CONSTRAINT "WhatsAppConversation_assignedToUserId_fkey"
  FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "WhatsAppConversation_business_priority_sla_idx"
  ON "WhatsAppConversation"("businessId", "priority", "slaDueAt");
CREATE INDEX "WhatsAppConversation_business_assignee_message_idx"
  ON "WhatsAppConversation"("businessId", "assignedToUserId", "lastMessageAt" DESC);

UPDATE "WhatsAppConversation"
SET
  "slaDueAt" = CASE
    WHEN "lastInboundAt" IS NOT NULL AND ("lastOutboundAt" IS NULL OR "lastInboundAt" > "lastOutboundAt")
      THEN "lastInboundAt" + INTERVAL '4 hours'
    ELSE NULL
  END,
  "slaRespondedAt" = CASE
    WHEN "lastInboundAt" IS NOT NULL AND "lastOutboundAt" >= "lastInboundAt" THEN "lastOutboundAt"
    ELSE NULL
  END;

CREATE OR REPLACE FUNCTION "validate_whatsapp_conversation_assignee"()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."assignedToUserId" IS NULL THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM "Business" b
    WHERE b."id" = NEW."businessId"
      AND b."deletedAt" IS NULL
      AND b."ownerId" = NEW."assignedToUserId"
  ) OR EXISTS (
    SELECT 1 FROM "BusinessMember" bm
    WHERE bm."businessId" = NEW."businessId"
      AND bm."userId" = NEW."assignedToUserId"
      AND bm."status" = 'active'
      AND bm."role" IN ('admin', 'support')
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'WHATSAPP_ASSIGNEE_NOT_ACTIVE_TENANT_CARE_MEMBER' USING ERRCODE = '23514';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "WhatsAppConversation_assignee_tenant_guard"
BEFORE INSERT OR UPDATE OF "businessId", "assignedToUserId" ON "WhatsAppConversation"
FOR EACH ROW EXECUTE FUNCTION "validate_whatsapp_conversation_assignee"();

CREATE OR REPLACE FUNCTION "clear_ineligible_whatsapp_conversation_assignee"()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD."status" = 'active' AND OLD."role" IN ('admin', 'support')
    AND (NEW."status" <> 'active' OR NEW."role" NOT IN ('admin', 'support')) THEN
    UPDATE "WhatsAppConversation"
    SET "assignedToUserId" = NULL, "assignedAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "businessId" = OLD."businessId" AND "assignedToUserId" = OLD."userId";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "BusinessMember_clear_ineligible_whatsapp_assignee"
AFTER UPDATE OF "status", "role" ON "BusinessMember"
FOR EACH ROW EXECUTE FUNCTION "clear_ineligible_whatsapp_conversation_assignee"();
