ALTER TABLE "CashierZatcaDevice" ADD COLUMN "renewalToken" TEXT;

ALTER TABLE "CashierZatcaReport" ADD COLUMN "reissuedAt" TIMESTAMPTZ;
CREATE TABLE "CashierZatcaRejectedAttempt" (
  uuid TEXT PRIMARY KEY,
  "businessId" TEXT NOT NULL,
  number INTEGER NOT NULL,
  "attemptSnapshot" JSONB NOT NULL,
  "archivedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY ("businessId", number) REFERENCES "CashierZatcaReport" ("businessId", number)
);
CREATE TRIGGER cashier_zatca_rejected_attempt_immutable
  BEFORE UPDATE OR DELETE ON "CashierZatcaRejectedAttempt"
  FOR EACH ROW EXECUTE FUNCTION cashier_return_immutable();

CREATE OR REPLACE FUNCTION cashier_zatca_artifact_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'CASHIER_ZATCA_ARTIFACT_IMMUTABLE'; END IF;
  IF (NEW."businessId", NEW.number, NEW."deviceId") IS DISTINCT FROM
     (OLD."businessId", OLD.number, OLD."deviceId")
     OR (OLD."clearedXml" IS NOT NULL AND (NEW."clearedXml", NEW."clearedQr", NEW.status) IS DISTINCT FROM (OLD."clearedXml", OLD."clearedQr", OLD.status))
  THEN RAISE EXCEPTION 'CASHIER_ZATCA_ARTIFACT_IMMUTABLE'; END IF;
  IF (NEW.uuid, NEW.icv, NEW.hash, NEW.xml, NEW.qr, NEW.buyer, NEW."reissuedAt") IS DISTINCT FROM
     (OLD.uuid, OLD.icv, OLD.hash, OLD.xml, OLD.qr, OLD.buyer, OLD."reissuedAt")
  THEN
    IF OLD.buyer IS NOT NULL AND NEW.buyer IS NOT NULL AND OLD.status = 'review'
       AND OLD."resultCode" ~ '^CLEARANCE_REJECTED(:|$)' AND OLD."leaseToken" IS NULL
       AND OLD."clearedXml" IS NULL AND NEW.status = 'pending'
       AND NEW."resultCode" IS NULL AND NEW.attempts = 0 AND NEW."leaseToken" IS NULL
       AND NEW."reportedAt" IS NULL AND NEW."reissuedAt" IS NOT NULL
       AND (OLD."reissuedAt" IS NULL OR NEW."reissuedAt" > OLD."reissuedAt")
       AND NEW.uuid <> OLD.uuid AND NEW.icv > OLD.icv AND NEW.hash <> OLD.hash AND NEW.xml <> OLD.xml
    THEN
      INSERT INTO "CashierZatcaRejectedAttempt" (uuid, "businessId", number, "attemptSnapshot")
      VALUES (OLD.uuid, OLD."businessId", OLD.number, to_jsonb(OLD));
    ELSE
      RAISE EXCEPTION 'CASHIER_ZATCA_ARTIFACT_IMMUTABLE';
    END IF;
  END IF;
  RETURN NEW;
END $$;
