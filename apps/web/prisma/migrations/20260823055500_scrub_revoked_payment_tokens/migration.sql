-- Revoked provider tokens have no legitimate charging purpose. Keep masked display metadata
-- for billing history, but replace the reusable encrypted credential itself with a fixed
-- tombstone as soon as a payment method is revoked. This reduces the value of historical
-- database rows and makes every revocation path fail closed without duplicating application
-- cleanup logic across checkout, cancellation, refund and renewal workers.

UPDATE "BillingPaymentMethod"
SET "encryptedToken" = 'revoked',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "status" = 'revoked'
  AND "encryptedToken" <> 'revoked';

CREATE OR REPLACE FUNCTION "hee_scrub_revoked_billing_token"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."status" = 'revoked' THEN
    NEW."encryptedToken" := 'revoked';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "BillingPaymentMethod_scrub_revoked_token" ON "BillingPaymentMethod";
CREATE TRIGGER "BillingPaymentMethod_scrub_revoked_token"
BEFORE INSERT OR UPDATE ON "BillingPaymentMethod"
FOR EACH ROW
EXECUTE FUNCTION "hee_scrub_revoked_billing_token"();
