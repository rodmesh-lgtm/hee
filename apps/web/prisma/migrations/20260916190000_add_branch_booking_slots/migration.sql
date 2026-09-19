ALTER TABLE "Business"
ADD COLUMN "bookingSlotMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN "bookingCapacity" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "Branch"
ADD COLUMN "bookingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "bookingSlotMinutes" INTEGER NOT NULL DEFAULT 120,
ADD COLUMN "bookingCapacity" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "Booking"
ADD COLUMN "branchId" TEXT,
ADD COLUMN "slotEndTime" TEXT;

CREATE INDEX "Booking_branchId_bookingDate_bookingTime_idx"
ON "Booking"("branchId", "bookingDate", "bookingTime");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_branchId_fkey"
FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Business"
ADD CONSTRAINT "Business_booking_slot_minutes_valid"
CHECK ("bookingSlotMinutes" BETWEEN 15 AND 480 AND "bookingSlotMinutes" % 15 = 0),
ADD CONSTRAINT "Business_booking_capacity_valid"
CHECK ("bookingCapacity" BETWEEN 1 AND 500);

ALTER TABLE "Branch"
ADD CONSTRAINT "Branch_booking_slot_minutes_valid"
CHECK ("bookingSlotMinutes" BETWEEN 15 AND 480 AND "bookingSlotMinutes" % 15 = 0),
ADD CONSTRAINT "Branch_booking_capacity_valid"
CHECK ("bookingCapacity" BETWEEN 1 AND 500);

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_slot_end_time_valid"
CHECK ("slotEndTime" IS NULL OR "slotEndTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
