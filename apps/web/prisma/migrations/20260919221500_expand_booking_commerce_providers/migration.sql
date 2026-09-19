ALTER TABLE "WhatsAppCommerceIntegration"
  DROP CONSTRAINT IF EXISTS "WhatsAppCommerceIntegration_provider_check";

ALTER TABLE "WhatsAppCommerceIntegration"
  ADD CONSTRAINT "WhatsAppCommerceIntegration_provider_check"
  CHECK ("provider" IN ('salla','zid','shopify','woocommerce'));

ALTER TABLE "CommerceBookingEligibility"
  DROP CONSTRAINT IF EXISTS "CommerceBookingEligibility_provider_check";

ALTER TABLE "CommerceBookingEligibility"
  ADD CONSTRAINT "CommerceBookingEligibility_provider_check"
  CHECK ("provider" IN ('salla','zid','shopify','woocommerce'));
