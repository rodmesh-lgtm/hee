CREATE TABLE "CashierZatcaDevice" (
  "businessId" TEXT NOT NULL REFERENCES "Business"(id),
  "environment" TEXT NOT NULL CHECK ("environment" IN ('simulation', 'production')),
  "id" TEXT NOT NULL UNIQUE,
  "seller" JSONB NOT NULL,
  "credentials" JSONB,
  "expiresAt" TIMESTAMPTZ,
  "onboardingToken" TEXT,
  "leaseUntil" TIMESTAMPTZ,
  "counter" INTEGER NOT NULL DEFAULT 0 CHECK ("counter" >= 0),
  "lastHash" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT FALSE CHECK (NOT "active" OR "environment" = 'production'),
  "testedAt" TIMESTAMPTZ,
  PRIMARY KEY ("businessId", "environment"),
  UNIQUE ("businessId", "id"),
  CHECK (NOT "active" OR ("credentials" IS NOT NULL AND "expiresAt" IS NOT NULL))
);

CREATE TABLE "CashierZatcaReport" (
  "businessId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "deviceId" TEXT NOT NULL,
  "uuid" TEXT NOT NULL UNIQUE,
  "icv" INTEGER NOT NULL CHECK ("icv" > 0),
  "hash" TEXT NOT NULL,
  "xml" TEXT NOT NULL,
  "qr" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'reported', 'review')),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "leaseToken" TEXT,
  "resultCode" TEXT,
  "reportedAt" TIMESTAMPTZ,
  PRIMARY KEY ("businessId", "number"),
  UNIQUE ("deviceId", "icv"),
  FOREIGN KEY ("businessId", "number") REFERENCES "CashierTaxDocument" ("businessId", "number"),
  FOREIGN KEY ("businessId", "deviceId") REFERENCES "CashierZatcaDevice" ("businessId", "id")
);

CREATE INDEX "CashierZatcaReport_due" ON "CashierZatcaReport" ("availableAt") WHERE status = 'pending';

CREATE FUNCTION cashier_zatca_artifact_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'CASHIER_ZATCA_ARTIFACT_IMMUTABLE'; END IF;
  IF (NEW."businessId", NEW."number", NEW."deviceId", NEW."uuid", NEW."icv", NEW."hash", NEW."xml", NEW."qr")
       IS DISTINCT FROM
     (OLD."businessId", OLD."number", OLD."deviceId", OLD."uuid", OLD."icv", OLD."hash", OLD."xml", OLD."qr")
  THEN RAISE EXCEPTION 'CASHIER_ZATCA_ARTIFACT_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER cashier_zatca_artifact_immutable BEFORE UPDATE OR DELETE ON "CashierZatcaReport"
  FOR EACH ROW EXECUTE FUNCTION cashier_zatca_artifact_immutable();
