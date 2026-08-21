-- Reject impossible Gregorian calendar dates at the database boundary as well as in the API.
-- Keep the existing YYYY-MM-DD shape constraint and add semantic calendar validation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "Booking"
    WHERE CASE
      WHEN "bookingDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN to_char(to_date("bookingDate", 'FXYYYY-MM-DD'), 'YYYY-MM-DD') <> "bookingDate"
      ELSE TRUE
    END
  ) THEN
    RAISE EXCEPTION 'invalid historical Booking.bookingDate detected';
  END IF;
END;
$$;

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_date_calendar_valid";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_date_calendar_valid"
  CHECK (
    CASE
      WHEN "bookingDate" ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN to_char(to_date("bookingDate", 'FXYYYY-MM-DD'), 'YYYY-MM-DD') = "bookingDate"
      ELSE FALSE
    END
  );
