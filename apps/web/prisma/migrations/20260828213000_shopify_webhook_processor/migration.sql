ALTER TABLE "WhatsAppShopifyWebhookEvent"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "leaseOwner" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3);

ALTER TABLE "WhatsAppShopifyWebhookEvent"
  ADD CONSTRAINT "WhatsAppShopifyWebhookEvent_status_check"
    CHECK ("status" IN ('pending','processing','retry_scheduled','processed','ignored','failed')),
  ADD CONSTRAINT "WhatsAppShopifyWebhookEvent_lease_check"
    CHECK (
      ("status" = 'processing' AND "leaseOwner" IS NOT NULL AND "leaseExpiresAt" IS NOT NULL)
      OR ("status" <> 'processing' AND "leaseOwner" IS NULL AND "leaseExpiresAt" IS NULL)
    ),
  ADD CONSTRAINT "WhatsAppShopifyWebhookEvent_owner_check"
    CHECK ("leaseOwner" IS NULL OR char_length("leaseOwner") BETWEEN 1 AND 100);

DROP INDEX "WhatsAppShopifyWebhookEvent_business_pending_idx";
CREATE INDEX "WhatsAppShopifyWebhookEvent_pending_idx"
  ON "WhatsAppShopifyWebhookEvent"("status","nextAttemptAt","receivedAt");

ALTER TABLE "WhatsAppAutomationCart"
  DROP CONSTRAINT "WhatsAppAutomationCart_state_check",
  DROP CONSTRAINT "WhatsAppAutomationCart_source_event_check",
  ADD CONSTRAINT "WhatsAppAutomationCart_state_check"
    CHECK ("state" IN ('active','abandoned','recovered','completed')),
  ADD CONSTRAINT "WhatsAppAutomationCart_source_event_check"
    CHECK (char_length("sourceEventId") BETWEEN 1 AND 160);

ALTER TABLE "WhatsAppAutomationCartEvent"
  DROP CONSTRAINT "WhatsAppAutomationCartEvent_key_tenant_fkey",
  DROP CONSTRAINT "WhatsAppAutomationCartEvent_state_check",
  DROP CONSTRAINT "WhatsAppAutomationCartEvent_id_check",
  ALTER COLUMN "apiKeyId" DROP NOT NULL,
  ADD COLUMN "integrationId" TEXT,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'tenant.api.cart',
  ADD CONSTRAINT "WhatsAppAutomationCartEvent_state_check"
    CHECK ("state" IN ('active','abandoned','recovered','completed')),
  ADD CONSTRAINT "WhatsAppAutomationCartEvent_id_check"
    CHECK (char_length("externalEventId") BETWEEN 1 AND 160),
  ADD CONSTRAINT "WhatsAppAutomationCartEvent_source_check"
    CHECK (char_length("source") BETWEEN 1 AND 80),
  ADD CONSTRAINT "WhatsAppAutomationCartEvent_actor_check"
    CHECK (
      ("source" = 'tenant.api.cart' AND "apiKeyId" IS NOT NULL AND "integrationId" IS NULL)
      OR ("source" = 'shopify.webhook' AND "apiKeyId" IS NULL AND "integrationId" IS NOT NULL)
    );

ALTER TABLE "WhatsAppAutomationCartEvent"
  ADD CONSTRAINT "WhatsAppAutomationCartEvent_key_tenant_fkey"
    FOREIGN KEY ("apiKeyId","businessId") REFERENCES "WhatsAppAutomationApiKey"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "WhatsAppAutomationCartEvent_integration_tenant_fkey"
    FOREIGN KEY ("integrationId","businessId") REFERENCES "WhatsAppCommerceIntegration"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "WhatsAppAutomationCartEvent_integration_created_idx"
  ON "WhatsAppAutomationCartEvent"("integrationId","createdAt");
