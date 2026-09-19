-- Capacity-based slots intentionally allow several active bookings at the same
-- branch, date, and time. Concurrency is serialized by the public booking
-- transaction's advisory lock before the current occupancy is counted.
DROP INDEX IF EXISTS "Booking_active_service_slot_unique";

DROP INDEX IF EXISTS "Booking_branchId_bookingDate_bookingTime_idx";

CREATE INDEX "Booking_branch_slot_capacity_lookup_idx"
ON "Booking"("businessId", "branchId", "bookingDate", "bookingTime", "status");
