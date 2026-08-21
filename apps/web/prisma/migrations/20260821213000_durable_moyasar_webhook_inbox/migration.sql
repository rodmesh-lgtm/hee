-- Moyasar requires webhook endpoints to acknowledge quickly before complex processing.
-- Persist only the external payment identifier and retry metadata; never store raw card/payment payloads.
ALTER TABLE "BillingWebhookEvent"
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT;

ALTER TABLE "BillingWebhookEvent"
  ADD CONSTRAINT "BillingWebhookEvent_attempts_nonnegative" CHECK ("attempts" >= 0 AND "attempts" <= 100),
  ADD CONSTRAINT "BillingWebhookEvent_provider_payment_length" CHECK (
    "providerPaymentId" IS NULL OR LENGTH("providerPaymentId") BETWEEN 8 AND 128
  );

CREATE INDEX "BillingWebhookEvent_pending_idx"
  ON "BillingWebhookEvent"("createdAt" ASC)
  WHERE "processedAt" IS NULL;
