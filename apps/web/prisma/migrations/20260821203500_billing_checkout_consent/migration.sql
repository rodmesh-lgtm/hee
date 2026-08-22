-- Preserve explicit purchase disclosure acceptance independently from mutable UI state.
-- BillingPayment is a financial record retained for audit; the consent follows the same lifecycle.
CREATE TABLE "BillingCheckoutConsent" (
  "billingPaymentId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "termsVersion" TEXT NOT NULL,
  "privacyVersion" TEXT NOT NULL,
  "disclosureVersion" TEXT NOT NULL,
  "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingCheckoutConsent_pkey" PRIMARY KEY ("billingPaymentId"),
  CONSTRAINT "BillingCheckoutConsent_payment_fkey"
    FOREIGN KEY ("billingPaymentId") REFERENCES "BillingPayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BillingCheckoutConsent_user_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "BillingCheckoutConsent_versions_nonempty" CHECK (
    LENGTH(BTRIM("termsVersion")) > 0
    AND LENGTH(BTRIM("privacyVersion")) > 0
    AND LENGTH(BTRIM("disclosureVersion")) > 0
  )
);

CREATE INDEX "BillingCheckoutConsent_user_idx" ON "BillingCheckoutConsent"("userId", "acceptedAt" DESC);
