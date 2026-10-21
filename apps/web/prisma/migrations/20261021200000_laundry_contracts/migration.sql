BEGIN;
CREATE TABLE "LaundryContract" (
 id TEXT PRIMARY KEY,
 "businessId" TEXT NOT NULL REFERENCES "Business"(id) ON DELETE RESTRICT,
 "customerId" TEXT NOT NULL,
 number INTEGER NOT NULL CHECK (number > 0),
 reference TEXT NOT NULL,
 "customerName" TEXT NOT NULL,
 "customerPhone" TEXT NOT NULL,
 "businessName" TEXT NOT NULL,
 title TEXT NOT NULL,
 terms TEXT NOT NULL,
 "startsOn" DATE NOT NULL,
 "endsOn" DATE NOT NULL CHECK ("endsOn" >= "startsOn"),
 amount BIGINT NOT NULL CHECK (amount > 0 AND amount <= 10000000),
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed','cancelled')),
 digest TEXT NOT NULL,
 "createdBy" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
 "signedAt" TIMESTAMPTZ,
 "signerName" TEXT,
 signature JSONB,
 "witnessId" TEXT,
 "cancelledAt" TIMESTAMPTZ,
 "cancelReason" TEXT,
 CHECK (("signedAt" IS NULL AND signature IS NULL AND "signerName" IS NULL AND "witnessId" IS NULL) OR ("signedAt" IS NOT NULL AND signature IS NOT NULL AND "signerName" IS NOT NULL AND "witnessId" IS NOT NULL)),
 CHECK (status <> 'signed' OR "signedAt" IS NOT NULL),
 CHECK ((status='cancelled') = ("cancelledAt" IS NOT NULL AND "cancelReason" IS NOT NULL)),
 UNIQUE ("businessId", id), UNIQUE ("businessId", number), UNIQUE ("businessId", reference),
 FOREIGN KEY ("businessId", "customerId") REFERENCES "LaundryCustomer" ("businessId", id) ON DELETE RESTRICT
);
CREATE FUNCTION protect_laundry_contract() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'LAUNDRY_CONTRACT_IMMUTABLE'; END IF;
 IF (to_jsonb(NEW) - ARRAY['status','signedAt','signerName','signature','witnessId','cancelledAt','cancelReason']) IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['status','signedAt','signerName','signature','witnessId','cancelledAt','cancelReason']) THEN RAISE EXCEPTION 'LAUNDRY_CONTRACT_TERMS_IMMUTABLE'; END IF;
 IF OLD.status='cancelled' OR NEW.status=OLD.status OR NEW.status='draft' THEN RAISE EXCEPTION 'LAUNDRY_CONTRACT_TRANSITION_INVALID'; END IF;
 IF OLD."signedAt" IS NOT NULL AND ROW(NEW."signedAt",NEW."signerName",NEW.signature,NEW."witnessId") IS DISTINCT FROM ROW(OLD."signedAt",OLD."signerName",OLD.signature,OLD."witnessId") THEN RAISE EXCEPTION 'LAUNDRY_CONTRACT_SIGNATURE_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER laundry_contract_immutable BEFORE UPDATE OR DELETE ON "LaundryContract" FOR EACH ROW EXECUTE FUNCTION protect_laundry_contract();
COMMIT;
