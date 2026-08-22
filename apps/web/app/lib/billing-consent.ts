import "server-only";

import { db } from "./db";
import { TERMS_VERSION, PRIVACY_VERSION } from "./legal";

export const BILLING_DISCLOSURE_VERSION = "2026-08-21-v1";

export async function recordBillingCheckoutConsent(input: {
  billingPaymentId: string;
  userId: string;
}) {
  const rows = await db.$queryRaw<Array<{
    billingPaymentId: string;
    termsVersion: string;
    privacyVersion: string;
    disclosureVersion: string;
    acceptedAt: Date;
  }>>`
    WITH eligible AS (
      SELECT bp."id"
      FROM "BillingPayment" bp
      JOIN "Business" b ON b."id" = bp."businessId"
      WHERE bp."id" = ${input.billingPaymentId}
        AND b."ownerId" = ${input.userId}
        AND b."deletedAt" IS NULL
        AND bp."kind" IN ('initial','upgrade')
        AND bp."status" = 'created'
        AND bp."providerPaymentId" IS NULL
        AND bp."createdAt" > CURRENT_TIMESTAMP - INTERVAL '1 hour'
      FOR UPDATE OF bp
    )
    INSERT INTO "BillingCheckoutConsent"
      ("billingPaymentId","userId","termsVersion","privacyVersion","disclosureVersion","acceptedAt")
    SELECT "id", ${input.userId}, ${TERMS_VERSION}, ${PRIVACY_VERSION}, ${BILLING_DISCLOSURE_VERSION}, CURRENT_TIMESTAMP
    FROM eligible
    ON CONFLICT ("billingPaymentId") DO UPDATE
      SET "termsVersion" = EXCLUDED."termsVersion",
          "privacyVersion" = EXCLUDED."privacyVersion",
          "disclosureVersion" = EXCLUDED."disclosureVersion",
          "acceptedAt" = EXCLUDED."acceptedAt"
      WHERE "BillingCheckoutConsent"."userId" = EXCLUDED."userId"
    RETURNING "billingPaymentId","termsVersion","privacyVersion","disclosureVersion","acceptedAt"
  `;
  return rows[0] ?? null;
}

export async function hasBillingCheckoutConsent(billingPaymentId: string) {
  const rows = await db.$queryRaw<Array<{ ok: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM "BillingCheckoutConsent" c
      JOIN "BillingPayment" bp ON bp."id" = c."billingPaymentId"
      JOIN "Business" b ON b."id" = bp."businessId"
      WHERE c."billingPaymentId" = ${billingPaymentId}
        AND c."userId" = b."ownerId"
        AND c."termsVersion" = ${TERMS_VERSION}
        AND c."privacyVersion" = ${PRIVACY_VERSION}
        AND c."disclosureVersion" = ${BILLING_DISCLOSURE_VERSION}
    ) AS ok
  `;
  return Boolean(rows[0]?.ok);
}
