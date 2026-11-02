-- Extend shared commerce storage without relaxing legacy lifecycle or tenant constraints.
BEGIN;
ALTER TABLE "WhatsAppCommerceIntegration"
  DROP CONSTRAINT "WhatsAppCommerceIntegration_provider_check",
  DROP CONSTRAINT "WhatsAppCommerceIntegration_status_check",
  DROP CONSTRAINT "WhatsAppCommerceIntegration_lifecycle_check",
  ADD CONSTRAINT "WhatsAppCommerceIntegration_provider_check"
    CHECK ("provider" IN ('salla','zid','shopify','woocommerce','foodics')),
  ADD CONSTRAINT "WhatsAppCommerceIntegration_status_check"
    CHECK ("status" IN ('draft','active','disconnected') OR
      ("provider" IN ('shopify','foodics') AND "status" IN ('authorizing','authorization_review_required','revocation_pending'))),
  ADD CONSTRAINT "WhatsAppCommerceIntegration_lifecycle_check" CHECK (
    ("status" = 'draft' AND "credentialEnvelope" IS NULL AND "connectedAt" IS NULL AND "disconnectedAt" IS NULL)
    OR ("status" = 'active' AND "credentialEnvelope" IS NOT NULL AND "connectedAt" IS NOT NULL AND "disconnectedAt" IS NULL)
    OR ("status" = 'disconnected' AND "credentialEnvelope" IS NULL AND "disconnectedAt" IS NOT NULL)
    OR ("status" IN ('authorizing','authorization_review_required') AND "provider" IN ('shopify','foodics'))
    OR ("status" = 'revocation_pending' AND "provider" IN ('shopify','foodics') AND "credentialEnvelope" IS NOT NULL)
  );
ALTER TABLE "WhatsAppCommerceOAuthSession"
  DROP CONSTRAINT "WhatsAppCommerceOAuthSession_status_check",
  DROP CONSTRAINT "WhatsAppCommerceOAuthSession_lifecycle_check",
  ADD CONSTRAINT "WhatsAppCommerceOAuthSession_status_check" CHECK ("status" IN (
    'created','exchanging','connected','failed','cancelled',
    'retail_shopify_created','retail_shopify_exchanging','retail_foodics_created','retail_foodics_exchanging')),
  ADD CONSTRAINT "WhatsAppCommerceOAuthSession_lifecycle_check" CHECK (
    ("status" IN ('created','exchanging','retail_shopify_created','retail_shopify_exchanging','retail_foodics_created','retail_foodics_exchanging') AND "consumedAt" IS NULL)
    OR ("status" IN ('connected','failed','cancelled') AND "consumedAt" IS NOT NULL)
  );
COMMIT;
