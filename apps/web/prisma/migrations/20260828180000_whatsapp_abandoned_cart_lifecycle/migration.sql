CREATE TABLE "WhatsAppAutomationCart" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "sourceEventId" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsAppAutomationCart_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAutomationCart_state_check" CHECK ("state" IN ('abandoned','recovered','completed')),
  CONSTRAINT "WhatsAppAutomationCart_cart_id_check" CHECK (char_length("cartId") BETWEEN 1 AND 120),
  CONSTRAINT "WhatsAppAutomationCart_source_event_check" CHECK (char_length("sourceEventId") BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX "WhatsAppAutomationCart_business_cart_unique" ON "WhatsAppAutomationCart"("businessId","cartId");
CREATE UNIQUE INDEX "WhatsAppAutomationCart_id_business_unique" ON "WhatsAppAutomationCart"("id","businessId");
CREATE INDEX "WhatsAppAutomationCart_business_state_idx" ON "WhatsAppAutomationCart"("businessId","state","occurredAt");
ALTER TABLE "WhatsAppAutomationCart" ADD CONSTRAINT "WhatsAppAutomationCart_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationCart" ADD CONSTRAINT "WhatsAppAutomationCart_contact_tenant_fkey" FOREIGN KEY ("contactId","businessId") REFERENCES "WhatsAppContact"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "WhatsAppAutomationCartEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "apiKeyId" TEXT NOT NULL,
  "cartId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "externalEventId" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "outcome" TEXT NOT NULL,
  "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsAppAutomationCartEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WhatsAppAutomationCartEvent_state_check" CHECK ("state" IN ('abandoned','recovered','completed')),
  CONSTRAINT "WhatsAppAutomationCartEvent_outcome_check" CHECK ("outcome" IN ('applied','stale')),
  CONSTRAINT "WhatsAppAutomationCartEvent_applied_check" CHECK (("outcome" = 'applied' AND "appliedAt" IS NOT NULL) OR ("outcome" = 'stale' AND "appliedAt" IS NULL)),
  CONSTRAINT "WhatsAppAutomationCartEvent_id_check" CHECK (char_length("externalEventId") BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX "WhatsAppAutomationCartEvent_business_event_unique" ON "WhatsAppAutomationCartEvent"("businessId","externalEventId");
CREATE INDEX "WhatsAppAutomationCartEvent_business_cart_idx" ON "WhatsAppAutomationCartEvent"("businessId","cartId","occurredAt");
CREATE INDEX "WhatsAppAutomationCartEvent_key_created_idx" ON "WhatsAppAutomationCartEvent"("apiKeyId","createdAt");
ALTER TABLE "WhatsAppAutomationCartEvent" ADD CONSTRAINT "WhatsAppAutomationCartEvent_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationCartEvent" ADD CONSTRAINT "WhatsAppAutomationCartEvent_key_tenant_fkey" FOREIGN KEY ("apiKeyId","businessId") REFERENCES "WhatsAppAutomationApiKey"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationCartEvent" ADD CONSTRAINT "WhatsAppAutomationCartEvent_cart_tenant_fkey" FOREIGN KEY ("businessId","cartId") REFERENCES "WhatsAppAutomationCart"("businessId","cartId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsAppAutomationCartEvent" ADD CONSTRAINT "WhatsAppAutomationCartEvent_contact_tenant_fkey" FOREIGN KEY ("contactId","businessId") REFERENCES "WhatsAppContact"("id","businessId") ON DELETE RESTRICT ON UPDATE CASCADE;
