-- Booking-enabled businesses need an initial schedule before the public flow
-- can present slots. Create an editable 08:00-18:00 baseline only when the
-- business has never configured any working-hours row.
INSERT INTO "WorkingHours" (
  "id",
  "businessId",
  "dayOfWeek",
  "opensAt",
  "closesAt",
  "secondOpensAt",
  "secondClosesAt",
  "isClosed",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  business."id",
  day."dayOfWeek",
  '08:00',
  '18:00',
  NULL,
  NULL,
  false,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Business" AS business
CROSS JOIN generate_series(0, 6) AS day("dayOfWeek")
WHERE business."bookingAvailable" = true
  AND business."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "WorkingHours" AS configured
    WHERE configured."businessId" = business."id"
  )
  AND EXISTS (
    SELECT 1
    FROM "Service" AS service
    WHERE service."businessId" = business."id"
      AND service."isActive" = true
      AND service."bookingEnabled" = true
      AND service."deletedAt" IS NULL
  )
ON CONFLICT ("businessId", "dayOfWeek") DO NOTHING;
