-- Administrative access-code entitlements and customer-funded checkout are mutually
-- exclusive lifecycle sources. The application serializes both on billing-business:<id>;
-- this database guard is the final fail-closed boundary for any future write path.
CREATE OR REPLACE FUNCTION prevent_paid_checkout_over_access_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW."kind" IN ('initial', 'upgrade')
     AND NEW."status" IN ('created', 'initiated', 'authorized')
     AND EXISTS (
       SELECT 1
       FROM "Subscription" s
       JOIN "SubscriptionAccessGrant" g
         ON g."subscriptionId" = s."id"
        AND g."businessId" = s."businessId"
        AND g."planId" = s."planId"
       JOIN "SubscriptionAccessCode" c
         ON c."id" = g."codeId"
        AND c."id" = s."providerReference"
        AND c."planId" = s."planId"
       WHERE s."businessId" = NEW."businessId"
         AND s."provider" = 'access_code'
         AND s."status" = 'active'
         AND s."endsAt" IS NULL
         AND s."autoRenew" = false
         AND s."paymentMethodId" IS NULL
         AND g."revokedAt" IS NULL
         AND c."isActive" = true
         AND c."revokedAt" IS NULL
     )
  THEN
    RAISE EXCEPTION 'paid checkout cannot start while an access-code entitlement is active'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS "BillingPayment_no_checkout_over_access_code" ON "BillingPayment";
CREATE TRIGGER "BillingPayment_no_checkout_over_access_code"
BEFORE INSERT OR UPDATE OF "businessId", "kind", "status" ON "BillingPayment"
FOR EACH ROW
EXECUTE FUNCTION prevent_paid_checkout_over_access_code();
