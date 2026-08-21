-- Provider-backed subscription billing. These tables deliberately keep card data out of HEE:
-- only encrypted provider tokens and masked metadata are stored locally.

CREATE TABLE "BillingPaymentMethod" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'moyasar',
  "encryptedToken" TEXT NOT NULL,
  "brand" TEXT,
  "last4" TEXT,
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPaymentMethod_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPaymentMethod_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BillingPaymentMethod_status_allowed" CHECK ("status" IN ('active','revoked'))
);

CREATE INDEX "BillingPaymentMethod_business_idx" ON "BillingPaymentMethod"("businessId");
CREATE UNIQUE INDEX "BillingPaymentMethod_one_active_provider" ON "BillingPaymentMethod"("businessId", "provider") WHERE "status" = 'active';
CREATE UNIQUE INDEX "BillingPaymentMethod_id_business_unique" ON "BillingPaymentMethod"("id", "businessId");

CREATE TABLE "BillingPayment" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'moyasar',
  "providerPaymentId" TEXT,
  "providerGivenId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'initial',
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'SAR',
  "status" TEXT NOT NULL DEFAULT 'created',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "nextRetryAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  -- Immutable receipt snapshot captured when a payment is first activated. Historical
  -- receipts must not change when seller environment/configuration changes later.
  "receiptSellerLegalName" TEXT,
  "receiptSellerAddress" TEXT,
  "receiptTaxStatus" TEXT,
  "receiptNetAmount" INTEGER,
  "receiptVatAmount" INTEGER,
  "receiptIssuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BillingPayment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingPayment_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BillingPayment_plan_fkey" FOREIGN KEY ("planId") REFERENCES "BusinessPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BillingPayment_subscription_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "BillingPayment_amount_positive" CHECK ("amount" >= 100),
  CONSTRAINT "BillingPayment_currency_sar" CHECK ("currency" = 'SAR'),
  CONSTRAINT "BillingPayment_kind_allowed" CHECK ("kind" IN ('initial','renewal','upgrade')),
  CONSTRAINT "BillingPayment_status_allowed" CHECK ("status" IN ('created','initiated','paid','failed','refunded','voided','authorized','canceled')),
  CONSTRAINT "BillingPayment_attempt_positive" CHECK ("attempt" >= 1 AND "attempt" <= 10),
  CONSTRAINT "BillingPayment_receipt_tax_status_allowed" CHECK ("receiptTaxStatus" IS NULL OR "receiptTaxStatus" IN ('not_registered')),
  CONSTRAINT "BillingPayment_receipt_amounts_valid" CHECK (
    ("receiptNetAmount" IS NULL AND "receiptVatAmount" IS NULL AND "receiptIssuedAt" IS NULL)
    OR ("receiptNetAmount" = "amount" AND "receiptVatAmount" = 0 AND "receiptIssuedAt" IS NOT NULL)
  )
);

CREATE UNIQUE INDEX "BillingPayment_provider_payment_unique" ON "BillingPayment"("providerPaymentId") WHERE "providerPaymentId" IS NOT NULL;
CREATE UNIQUE INDEX "BillingPayment_provider_given_unique" ON "BillingPayment"("providerGivenId");
CREATE UNIQUE INDEX "BillingPayment_one_open_checkout_per_business" ON "BillingPayment"("businessId") WHERE "kind" IN ('initial','upgrade') AND "status" IN ('created','initiated','authorized');
CREATE UNIQUE INDEX "BillingPayment_renewal_attempt_unique" ON "BillingPayment"("subscriptionId", "attempt") WHERE "kind" = 'renewal' AND "subscriptionId" IS NOT NULL;
CREATE INDEX "BillingPayment_business_created_idx" ON "BillingPayment"("businessId", "createdAt" DESC);
CREATE INDEX "BillingPayment_retry_idx" ON "BillingPayment"("status", "nextRetryAt") WHERE "nextRetryAt" IS NOT NULL;

CREATE TABLE "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'moyasar',
  "providerEventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "billingPaymentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "BillingWebhookEvent_payment_fkey" FOREIGN KEY ("billingPaymentId") REFERENCES "BillingPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "BillingWebhookEvent_provider_event_unique" ON "BillingWebhookEvent"("provider", "providerEventId");
CREATE INDEX "BillingWebhookEvent_created_idx" ON "BillingWebhookEvent"("createdAt" DESC);

-- `provider` already exists in the initial Subscription schema. Keep that historical
-- column and add only the provider-backed lifecycle fields introduced by this migration.
ALTER TABLE "Subscription"
  ADD COLUMN "autoRenew" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "providerReference" TEXT,
  ADD COLUMN "paymentMethodId" TEXT;

CREATE UNIQUE INDEX "Subscription_id_business_unique" ON "Subscription"("id", "businessId");
CREATE UNIQUE INDEX "Subscription_one_live_per_business" ON "Subscription"("businessId") WHERE "status" IN ('active','past_due');

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_payment_method_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "BillingPaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Subscription_payment_method_business_fkey" FOREIGN KEY ("paymentMethodId", "businessId") REFERENCES "BillingPaymentMethod"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingPayment"
  ADD CONSTRAINT "BillingPayment_subscription_business_fkey" FOREIGN KEY ("subscriptionId", "businessId") REFERENCES "Subscription"("id", "businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Subscription_payment_method_idx" ON "Subscription"("paymentMethodId");
CREATE INDEX "Subscription_renewal_due_idx" ON "Subscription"("status", "endsAt") WHERE "autoRenew" = true;
