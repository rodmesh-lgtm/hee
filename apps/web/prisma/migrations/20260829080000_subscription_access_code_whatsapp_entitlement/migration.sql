ALTER TABLE "SubscriptionAccessCode"
  ADD COLUMN "whatsappMarketingEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Preserve the previous Business/Pro behaviour for already-issued codes while
-- allowing administrators to explicitly grant the add-on for custom plans.
UPDATE "SubscriptionAccessCode" AS code
SET "whatsappMarketingEnabled" = true
FROM "BusinessPlan" AS plan
WHERE code."planId" = plan."id"
  AND UPPER(plan."code") IN ('BUSINESS', 'PRO');
