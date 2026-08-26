-- Paid-plan lifecycle rows are financial/entitlement state. Keep malformed statuses,
-- inverted periods and duplicate active subscriptions out of the database even if an
-- application regression reaches Prisma.

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_status_allowed"
  CHECK ("status" IN ('active', 'trialing', 'past_due', 'canceled', 'replaced', 'incomplete'));

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_period_valid"
  CHECK ("endsAt" IS NULL OR "endsAt" >= "startsAt");

CREATE UNIQUE INDEX "Subscription_one_current_per_business"
  ON "Subscription" ("businessId")
  WHERE "status" IN ('active', 'trialing');
