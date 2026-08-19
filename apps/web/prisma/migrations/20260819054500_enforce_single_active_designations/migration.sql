-- Protect business-level singleton designations at the database layer.
-- These partial unique indexes mirror application invariants and remain safe for
-- inactive historical rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT "businessId" FROM "Subscription"
    WHERE "status" = 'active'
    GROUP BY "businessId" HAVING COUNT(*) > 1
  ) THEN RAISE EXCEPTION 'multiple active subscriptions detected for one business'; END IF;

  IF EXISTS (
    SELECT "businessId" FROM "Branch"
    WHERE "isMain" = true AND "isActive" = true
    GROUP BY "businessId" HAVING COUNT(*) > 1
  ) THEN RAISE EXCEPTION 'multiple active main branches detected for one business'; END IF;

  IF EXISTS (
    SELECT "businessId" FROM "ContactPerson"
    WHERE "isPrimary" = true AND "isActive" = true
    GROUP BY "businessId" HAVING COUNT(*) > 1
  ) THEN RAISE EXCEPTION 'multiple active primary contacts detected for one business'; END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_one_active_per_business"
  ON "Subscription"("businessId") WHERE "status" = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_one_active_main_per_business"
  ON "Branch"("businessId") WHERE "isMain" = true AND "isActive" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ContactPerson_one_active_primary_per_business"
  ON "ContactPerson"("businessId") WHERE "isPrimary" = true AND "isActive" = true;
