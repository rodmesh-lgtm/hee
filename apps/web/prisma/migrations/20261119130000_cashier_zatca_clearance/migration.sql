ALTER TABLE "CashierZatcaDevice"
  ADD COLUMN scope TEXT NOT NULL DEFAULT 'simplified' CHECK (scope IN ('simplified','standard')),
  DROP CONSTRAINT "CashierZatcaDevice_pkey",
  ADD PRIMARY KEY ("businessId",environment,scope);

ALTER TABLE "CashierZatcaReport"
  ADD COLUMN buyer JSONB,
  ADD COLUMN "clearedXml" TEXT,
  ADD COLUMN "clearedQr" TEXT,
  ADD CHECK (
    (buyer IS NULL AND "clearedXml" IS NULL AND "clearedQr" IS NULL) OR
    (buyer IS NOT NULL AND ((status='reported' AND "clearedXml" IS NOT NULL AND "clearedQr" IS NOT NULL) OR
    (status<>'reported' AND "clearedXml" IS NULL AND "clearedQr" IS NULL)))
  );

CREATE OR REPLACE FUNCTION cashier_zatca_artifact_immutable() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'CASHIER_ZATCA_ARTIFACT_IMMUTABLE'; END IF;
  IF (NEW."businessId", NEW."number", NEW."deviceId", NEW."uuid", NEW."icv", NEW."hash", NEW."xml", NEW."qr", NEW.buyer)
       IS DISTINCT FROM
     (OLD."businessId", OLD."number", OLD."deviceId", OLD."uuid", OLD."icv", OLD."hash", OLD."xml", OLD."qr", OLD.buyer)
     OR (OLD."clearedXml" IS NOT NULL AND (NEW."clearedXml", NEW."clearedQr", NEW.status) IS DISTINCT FROM (OLD."clearedXml", OLD."clearedQr", OLD.status))
  THEN RAISE EXCEPTION 'CASHIER_ZATCA_ARTIFACT_IMMUTABLE'; END IF;
  RETURN NEW;
END $$;
