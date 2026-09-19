ALTER TABLE "WhatsAppConnection"
  ADD COLUMN "marketingEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "WhatsAppEmbeddedSignupSession"
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'marketing';

DROP INDEX IF EXISTS "WhatsAppConnection_business_provider_unique";
DROP INDEX IF EXISTS "WhatsAppConnection_provider_waba_unique";

CREATE INDEX "WhatsAppConnection_business_marketing_idx"
  ON "WhatsAppConnection"("businessId", "provider", "marketingEnabled");
CREATE INDEX "WhatsAppConnection_business_booking_idx"
  ON "WhatsAppConnection"("businessId", "provider", "bookingEnabled");
CREATE INDEX "WhatsAppConnection_provider_waba_idx"
  ON "WhatsAppConnection"("provider", "wabaId");
CREATE INDEX "WhatsAppEmbeddedSignupSession_business_purpose_idx"
  ON "WhatsAppEmbeddedSignupSession"("businessId", "purpose", "createdAt");

CREATE UNIQUE INDEX "WhatsAppConnection_one_marketing_number_per_business"
  ON "WhatsAppConnection"("businessId", "provider")
  WHERE "marketingEnabled" = true;

CREATE UNIQUE INDEX "WhatsAppConnection_one_booking_number_per_business"
  ON "WhatsAppConnection"("businessId", "provider")
  WHERE "bookingEnabled" = true;
