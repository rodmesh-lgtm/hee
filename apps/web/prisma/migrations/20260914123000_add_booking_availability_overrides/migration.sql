CREATE TABLE "BookingAvailabilityOverride" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "date" TEXT NOT NULL,
  "isClosed" BOOLEAN NOT NULL DEFAULT false,
  "opensAt" TEXT,
  "closesAt" TEXT,
  "secondOpensAt" TEXT,
  "secondClosesAt" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingAvailabilityOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingAvailabilityOverride_business_date_unique"
ON "BookingAvailabilityOverride"("businessId", "date");

CREATE INDEX "BookingAvailabilityOverride_business_date_idx"
ON "BookingAvailabilityOverride"("businessId", "date");

ALTER TABLE "BookingAvailabilityOverride"
ADD CONSTRAINT "BookingAvailabilityOverride_businessId_fkey"
FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BookingAvailabilityOverride"
ADD CONSTRAINT "BookingAvailabilityOverride_date_valid"
CHECK (
  "date" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
  AND to_char(to_date("date", 'YYYY-MM-DD'), 'YYYY-MM-DD') = "date"
);

ALTER TABLE "BookingAvailabilityOverride"
ADD CONSTRAINT "BookingAvailabilityOverride_times_valid"
CHECK (
  ("opensAt" IS NULL OR "opensAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  AND ("closesAt" IS NULL OR "closesAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  AND ("secondOpensAt" IS NULL OR "secondOpensAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
  AND ("secondClosesAt" IS NULL OR "secondClosesAt" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$')
);

ALTER TABLE "BookingAvailabilityOverride"
ADD CONSTRAINT "BookingAvailabilityOverride_state_complete"
CHECK (
  (
    "isClosed" = true
    AND "opensAt" IS NULL
    AND "closesAt" IS NULL
    AND "secondOpensAt" IS NULL
    AND "secondClosesAt" IS NULL
  )
  OR
  (
    "isClosed" = false
    AND "opensAt" IS NOT NULL
    AND "closesAt" IS NOT NULL
    AND (
      ("secondOpensAt" IS NULL AND "secondClosesAt" IS NULL)
      OR
      ("secondOpensAt" IS NOT NULL AND "secondClosesAt" IS NOT NULL)
    )
  )
);

ALTER TABLE "BookingAvailabilityOverride"
ADD CONSTRAINT "BookingAvailabilityOverride_note_bounded"
CHECK ("note" IS NULL OR char_length("note") <= 240);
