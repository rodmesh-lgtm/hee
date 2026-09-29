BEGIN;
SET LOCAL lock_timeout = '10s';
CREATE TABLE "SallaCartState" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "externalCartId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SallaCartState_state_check" CHECK ("state" IN ('abandoned','recovered')),
  CONSTRAINT "SallaCartState_cart_check" CHECK ("externalCartId" ~ '^[1-9][0-9]{0,31}$'),
  CONSTRAINT "SallaCartState_integration_tenant_fkey" FOREIGN KEY ("integrationId","businessId")
    REFERENCES "WhatsAppCommerceIntegration"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "SallaCartState_integration_cart_unique" ON "SallaCartState"("integrationId","externalCartId");
CREATE INDEX "SallaCartState_business_state_idx" ON "SallaCartState"("businessId","state");
ALTER TABLE "WhatsAppAutomationCartEvent" DROP CONSTRAINT "WhatsAppAutomationCartEvent_actor_check",
  ADD CONSTRAINT "WhatsAppAutomationCartEvent_actor_check" CHECK (
    ("source" = 'tenant.api.cart' AND "apiKeyId" IS NOT NULL AND "integrationId" IS NULL)
    OR ("source" IN ('shopify.webhook','salla.webhook') AND "apiKeyId" IS NULL AND "integrationId" IS NOT NULL)
  );
COMMIT;
