ALTER TABLE "WhatsAppContact" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "WhatsAppContact_business_deleted_idx" ON "WhatsAppContact" ("businessId", "deletedAt");
ALTER TABLE "WhatsAppContact" ADD CONSTRAINT "WhatsAppContact_deleted_optout_check" CHECK ("deletedAt" IS NULL OR "optedOutAt" IS NOT NULL);
