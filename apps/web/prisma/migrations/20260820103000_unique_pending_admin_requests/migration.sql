-- A business may have at most one pending request of each administrative workflow.
-- Reconcile any historical duplicates first while preserving every event in the audit log.

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "businessId", "eventType"
      ORDER BY "createdAt" DESC, "id" DESC
    ) AS rn
  FROM "AnalyticsEvent"
  WHERE "eventType" IN ('plan_upgrade_requested', 'verification_requested')
    AND COALESCE("metadata"->>'status', 'pending') = 'pending'
)
UPDATE "AnalyticsEvent" AS event
SET "metadata" = COALESCE(event."metadata", '{}'::jsonb)
  || jsonb_build_object(
    'status', 'obsolete',
    'reason', 'duplicate_reconciled_by_migration',
    'reconciledAt', CURRENT_TIMESTAMP::text
  )
FROM ranked
WHERE event."id" = ranked."id"
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsEvent_one_pending_upgrade_per_business"
ON "AnalyticsEvent" ("businessId")
WHERE "eventType" = 'plan_upgrade_requested'
  AND COALESCE("metadata"->>'status', 'pending') = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS "AnalyticsEvent_one_pending_verification_per_business"
ON "AnalyticsEvent" ("businessId")
WHERE "eventType" = 'verification_requested'
  AND COALESCE("metadata"->>'status', 'pending') = 'pending';
