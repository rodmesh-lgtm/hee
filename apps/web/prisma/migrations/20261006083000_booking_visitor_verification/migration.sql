-- Only digests of short-lived visitor credentials are persisted. A grant is
-- tenant-bound and version-bound to one existing appointment, never a new booking.
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_id_business_unique" ON "Booking" ("id", "businessId");
CREATE TABLE "BookingVisitorVerification" (
  "id" TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "bookingUpdatedAt" TIMESTAMP(3) NOT NULL,
  "codeDigest" TEXT NOT NULL CHECK ("codeDigest" ~ '^[0-9a-f]{64}$'),
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending','accepted','failed','verified','consumed','invalidated')),
  "attemptCount" INTEGER NOT NULL DEFAULT 0 CHECK ("attemptCount" BETWEEN 0 AND 5),
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "consentedAt" TIMESTAMPTZ NOT NULL,
  "providerMessageId" TEXT,
  "accessDigest" TEXT UNIQUE CHECK ("accessDigest" IS NULL OR "accessDigest" ~ '^[0-9a-f]{64}$'),
  "accessExpiresAt" TIMESTAMPTZ,
  "verifiedAt" TIMESTAMPTZ,
  "consumedAt" TIMESTAMPTZ,
  "consumedRequestId" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookingVisitorVerification_booking_tenant_fk" FOREIGN KEY ("bookingId", "businessId") REFERENCES "Booking" ("id", "businessId") ON DELETE RESTRICT,
  CONSTRAINT "BookingVisitorVerification_verified_grant_check" CHECK ("status" NOT IN ('verified','consumed') OR ("accessDigest" IS NOT NULL AND "accessExpiresAt" IS NOT NULL AND "verifiedAt" IS NOT NULL)),
  CONSTRAINT "BookingVisitorVerification_consumption_check" CHECK ("status" <> 'consumed' OR "consumedAt" IS NOT NULL AND "consumedRequestId" IS NOT NULL),
  CONSTRAINT "BookingVisitorVerification_expiry_check" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "BookingVisitorVerification_tenant_booking_idx" ON "BookingVisitorVerification" ("businessId", "bookingId", "createdAt");
CREATE INDEX "BookingVisitorVerification_expiry_idx" ON "BookingVisitorVerification" ("expiresAt", "accessExpiresAt");
CREATE OR REPLACE FUNCTION "guard_booking_visitor_verification_identity"() RETURNS trigger AS $$
BEGIN
  IF OLD."businessId" IS DISTINCT FROM NEW."businessId" OR OLD."bookingId" IS DISTINCT FROM NEW."bookingId" OR OLD."bookingUpdatedAt" IS DISTINCT FROM NEW."bookingUpdatedAt" OR OLD."codeDigest" IS DISTINCT FROM NEW."codeDigest" THEN
    RAISE EXCEPTION 'booking verification identity is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "BookingVisitorVerification_identity_immutable" BEFORE UPDATE ON "BookingVisitorVerification" FOR EACH ROW EXECUTE FUNCTION "guard_booking_visitor_verification_identity"();
