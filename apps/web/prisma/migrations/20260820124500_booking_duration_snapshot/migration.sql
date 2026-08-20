-- Preserve the duration that applied when each booking was created so later
-- service edits cannot reinterpret historical occupied time ranges.
CREATE TABLE IF NOT EXISTS "BookingDurationSnapshot" (
  "bookingId" TEXT NOT NULL,
  "durationMinutes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingDurationSnapshot_pkey" PRIMARY KEY ("bookingId"),
  CONSTRAINT "BookingDurationSnapshot_booking_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "BookingDurationSnapshot_duration_range" CHECK ("durationMinutes" >= 5 AND "durationMinutes" <= 1440)
);

-- Existing bookings did not store a duration snapshot. Use the service duration
-- when it is sane, otherwise the same safe 30-minute fallback used by the app.
INSERT INTO "BookingDurationSnapshot" ("bookingId", "durationMinutes")
SELECT
  b."id",
  CASE
    WHEN s."durationMinutes" BETWEEN 5 AND 1440 THEN s."durationMinutes"
    ELSE 30
  END
FROM "Booking" b
LEFT JOIN "Service" s ON s."id" = b."serviceId"
ON CONFLICT ("bookingId") DO NOTHING;
