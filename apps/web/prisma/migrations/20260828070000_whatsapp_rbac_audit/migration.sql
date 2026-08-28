CREATE TABLE "BusinessMember" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "userId" TEXT NOT NULL,
  "role" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BusinessMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BusinessMember_business_user_unique" ON "BusinessMember"("businessId", "userId");
CREATE INDEX "BusinessMember_user_status_idx" ON "BusinessMember"("userId", "status");
CREATE INDEX "BusinessMember_business_role_status_idx" ON "BusinessMember"("businessId", "role", "status");
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_role_check" CHECK ("role" IN ('admin','marketer','support','viewer'));
ALTER TABLE "BusinessMember" ADD CONSTRAINT "BusinessMember_status_check" CHECK ("status" IN ('active','suspended','revoked'));

CREATE TABLE "WhatsAppAuditLog" (
  "id" TEXT NOT NULL, "businessId" TEXT NOT NULL, "actorUserId" TEXT,
  "actorType" TEXT NOT NULL DEFAULT 'user', "action" TEXT NOT NULL,
  "targetType" TEXT NOT NULL, "targetId" TEXT, "outcome" TEXT NOT NULL,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppAuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "WhatsAppAuditLog_business_created_idx" ON "WhatsAppAuditLog"("businessId", "createdAt");
CREATE INDEX "WhatsAppAuditLog_business_action_created_idx" ON "WhatsAppAuditLog"("businessId", "action", "createdAt");
CREATE INDEX "WhatsAppAuditLog_actor_created_idx" ON "WhatsAppAuditLog"("actorUserId", "createdAt");
ALTER TABLE "WhatsAppAuditLog" ADD CONSTRAINT "WhatsAppAuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAuditLog" ADD CONSTRAINT "WhatsAppAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAuditLog" ADD CONSTRAINT "WhatsAppAuditLog_actor_type_check" CHECK ("actorType" IN ('user','worker','system'));
ALTER TABLE "WhatsAppAuditLog" ADD CONSTRAINT "WhatsAppAuditLog_outcome_check" CHECK ("outcome" IN ('success','denied','failed','cancelled'));
ALTER TABLE "WhatsAppAuditLog" ADD CONSTRAINT "WhatsAppAuditLog_action_length_check" CHECK (char_length("action") BETWEEN 1 AND 80);
ALTER TABLE "WhatsAppAuditLog" ADD CONSTRAINT "WhatsAppAuditLog_target_type_length_check" CHECK (char_length("targetType") BETWEEN 1 AND 80);

CREATE FUNCTION "reject_whatsapp_audit_mutation"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'WhatsAppAuditLog is append-only';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "WhatsAppAuditLog_no_update" BEFORE UPDATE ON "WhatsAppAuditLog" FOR EACH ROW EXECUTE FUNCTION "reject_whatsapp_audit_mutation"();
CREATE TRIGGER "WhatsAppAuditLog_no_delete" BEFORE DELETE ON "WhatsAppAuditLog" FOR EACH ROW EXECUTE FUNCTION "reject_whatsapp_audit_mutation"();
