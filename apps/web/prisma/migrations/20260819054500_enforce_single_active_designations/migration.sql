-- Protect business-level singleton designations at the database layer.
-- Normalize deterministic legacy duplicates first, then install partial unique
-- indexes so future application bugs cannot recreate them.

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "businessId"
    ORDER BY "createdAt" DESC, "id" DESC
  ) AS rn
  FROM "Subscription"
  WHERE "status" = 'active'
)
UPDATE "Subscription" s
SET "status" = 'replaced', "endsAt" = COALESCE(s."endsAt", CURRENT_TIMESTAMP)
FROM ranked r
WHERE s."id" = r."id" AND r.rn > 1;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "businessId"
    ORDER BY "sortOrder" ASC, "createdAt" ASC, "id" ASC
  ) AS rn
  FROM "Branch"
  WHERE "isMain" = true AND "isActive" = true
)
UPDATE "Branch" b
SET "isMain" = false
FROM ranked r
WHERE b."id" = r."id" AND r.rn > 1;

WITH ranked AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "businessId"
    ORDER BY "sortOrder" ASC, "createdAt" ASC, "id" ASC
  ) AS rn
  FROM "ContactPerson"
  WHERE "isPrimary" = true AND "isActive" = true
)
UPDATE "ContactPerson" cp
SET "isPrimary" = false
FROM ranked r
WHERE cp."id" = r."id" AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "Subscription_one_active_per_business"
  ON "Subscription"("businessId") WHERE "status" = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS "Branch_one_active_main_per_business"
  ON "Branch"("businessId") WHERE "isMain" = true AND "isActive" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "ContactPerson_one_active_primary_per_business"
  ON "ContactPerson"("businessId") WHERE "isPrimary" = true AND "isActive" = true;
