-- Harden public order/booking writes without destructively rewriting historical data.
-- Existing string fields remain for backward compatibility, but new writes are constrained
-- to normalized values and double-booking is blocked at the database boundary.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Order" WHERE "status" NOT IN ('pending','confirmed','processing','completed','cancelled')) THEN
    RAISE EXCEPTION 'unsupported historical Order.status detected';
  END IF;
  IF EXISTS (SELECT 1 FROM "Booking" WHERE "status" NOT IN ('pending','confirmed','completed','cancelled','no_show')) THEN
    RAISE EXCEPTION 'unsupported historical Booking.status detected';
  END IF;
END;
$$;

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_status_allowed";
ALTER TABLE "Order" ADD CONSTRAINT "Order_status_allowed"
  CHECK ("status" IN ('pending','confirmed','processing','completed','cancelled'));

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_status_allowed";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_status_allowed"
  CHECK ("status" IN ('pending','confirmed','completed','cancelled','no_show'));

ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_type_allowed";
ALTER TABLE "Order" ADD CONSTRAINT "Order_type_allowed"
  CHECK ("orderType" IN ('استلام','pickup','delivery','request'));

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_quantity_positive";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_quantity_positive" CHECK ("quantity" > 0 AND "quantity" <= 1000);
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_amounts_nonnegative";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_amounts_nonnegative" CHECK ("unitPrice" >= 0 AND "total" >= 0);
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_total_nonnegative";
ALTER TABLE "Order" ADD CONSTRAINT "Order_total_nonnegative" CHECK ("total" >= 0);

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_date_shape";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_date_shape" CHECK ("bookingDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$');
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_time_shape";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_time_shape" CHECK ("bookingTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');

CREATE UNIQUE INDEX IF NOT EXISTS "Booking_active_service_slot_unique"
ON "Booking" ("businessId", "serviceId", "bookingDate", "bookingTime")
WHERE "serviceId" IS NOT NULL AND "status" IN ('pending','confirmed');

CREATE INDEX IF NOT EXISTS "Booking_business_date_time_idx"
ON "Booking" ("businessId", "bookingDate", "bookingTime");

CREATE TABLE IF NOT EXISTS "PublicSubmission" (
  "businessId" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "targetId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicSubmission_pkey" PRIMARY KEY ("businessId", "scope", "idempotencyKey"),
  CONSTRAINT "PublicSubmission_business_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PublicSubmission_createdAt_idx" ON "PublicSubmission" ("createdAt");
