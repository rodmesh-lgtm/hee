-- Businesses that already enabled public booking before service-level booking
-- controls were introduced can otherwise remain stuck at "booking setup".
-- Preserve explicit per-service choices whenever at least one active service is
-- already bookable; only repair businesses that currently have none.
UPDATE "Service" AS service
SET
  "bookingEnabled" = true,
  "updatedAt" = CURRENT_TIMESTAMP
FROM "Business" AS business
WHERE service."businessId" = business."id"
  AND business."bookingAvailable" = true
  AND business."deletedAt" IS NULL
  AND service."isActive" = true
  AND service."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "Service" AS bookable
    WHERE bookable."businessId" = business."id"
      AND bookable."isActive" = true
      AND bookable."bookingEnabled" = true
      AND bookable."deletedAt" IS NULL
  );
