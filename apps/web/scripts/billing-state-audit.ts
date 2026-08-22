import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });
const production = String(process.env.APP_ENV ?? "").trim().toLowerCase() === "production";

type DriftRow = { businessId: string; detail: string };

async function main() {
  const drifts: DriftRow[] = [];

  // Homepage and checkout currently advertise these monthly SAR prices. Treat the DB
  // plan catalog as audited financial configuration so an accidental admin/SQL change
  // cannot silently make the charged price differ from the public promise.
  const planPriceDrift = await db.$queryRaw<DriftRow[]>`
    SELECT 'plan:' || p."code" AS "businessId",
           'public plan monthly price differs from the audited customer-facing catalog' AS detail
    FROM "BusinessPlan" p
    WHERE (p."code"='FREE' AND p."monthlyPrice"<>0)
       OR (p."code"='BUSINESS' AND p."monthlyPrice"<>199)
       OR (p."code"='PRO' AND p."monthlyPrice"<>399)
  `;
  drifts.push(...planPriceDrift);

  if (production) {
    const requiredPlans = await db.businessPlan.findMany({
      where: { code: { in: ["FREE", "BUSINESS", "PRO"] }, isActive: true },
      select: { code: true },
    });
    const present = new Set(requiredPlans.map((plan) => plan.code));
    for (const code of ["FREE", "BUSINESS", "PRO"]) {
      if (!present.has(code)) drifts.push({ businessId: `plan:${code}`, detail: "required public plan is missing or inactive" });
    }
  }

  const paidWithoutLive = await db.$queryRaw<DriftRow[]>`
    SELECT b."id" AS "businessId", 'paid business plan without matching unexpired live subscription' AS detail
    FROM "Business" b
    JOIN "BusinessPlan" p ON p."id"=b."planId" AND p."code" IN ('BUSINESS','PRO')
    WHERE b."deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Subscription" s
        WHERE s."businessId"=b."id" AND s."planId"=b."planId"
          AND s."status" IN ('active','past_due')
          AND s."endsAt" > CURRENT_TIMESTAMP
      )
  `;
  drifts.push(...paidWithoutLive);

  const invalidLivePeriod = await db.$queryRaw<DriftRow[]>`
    SELECT s."businessId" AS "businessId",
           CASE
             WHEN s."endsAt" IS NULL THEN 'paid subscription has no finite paid-through date'
             ELSE 'expired subscription is still marked active/past_due'
           END AS detail
    FROM "Subscription" s
    JOIN "BusinessPlan" p ON p."id"=s."planId" AND p."code" IN ('BUSINESS','PRO')
    WHERE s."status" IN ('active','past_due')
      AND (s."endsAt" IS NULL OR s."endsAt" <= CURRENT_TIMESTAMP)
  `;
  drifts.push(...invalidLivePeriod);

  const activeMismatch = await db.$queryRaw<DriftRow[]>`
    SELECT s."businessId" AS "businessId", 'live subscription plan differs from business entitlement plan' AS detail
    FROM "Subscription" s
    JOIN "Business" b ON b."id"=s."businessId" AND b."deletedAt" IS NULL
    WHERE s."status"='active'
      AND s."endsAt" > CURRENT_TIMESTAMP
      AND b."planId" IS DISTINCT FROM s."planId"
  `;
  drifts.push(...activeMismatch);

  const renewableWithoutMethod = await db.$queryRaw<DriftRow[]>`
    SELECT s."businessId" AS "businessId", 'auto-renew subscription lacks an active same-tenant payment method' AS detail
    FROM "Subscription" s
    LEFT JOIN "BillingPaymentMethod" pm
      ON pm."id"=s."paymentMethodId" AND pm."businessId"=s."businessId" AND pm."status"='active'
    WHERE s."status" IN ('active','past_due') AND s."autoRenew"=true AND pm."id" IS NULL
  `;
  drifts.push(...renewableWithoutMethod);

  const paidLineageMismatch = await db.$queryRaw<DriftRow[]>`
    SELECT bp."businessId" AS "businessId", 'paid billing ledger lineage mismatches its subscription/plan' AS detail
    FROM "BillingPayment" bp
    JOIN "Subscription" s ON s."id"=bp."subscriptionId"
    WHERE bp."status"='paid'
      AND (bp."businessId"<>s."businessId" OR bp."planId"<>s."planId")
  `;
  drifts.push(...paidLineageMismatch);

  const paidReceiptMismatch = await db.$queryRaw<DriftRow[]>`
    SELECT bp."businessId" AS "businessId", 'paid billing row lacks a valid immutable receipt snapshot' AS detail
    FROM "BillingPayment" bp
    WHERE bp."status"='paid'
      AND (
        bp."receiptSellerLegalName" IS NULL
        OR bp."receiptSellerAddress" IS NULL
        OR bp."receiptTaxStatus" IS DISTINCT FROM 'not_registered'
        OR bp."receiptNetAmount" IS DISTINCT FROM bp."amount"
        OR bp."receiptVatAmount" IS DISTINCT FROM 0
        OR bp."receiptIssuedAt" IS NULL
      )
  `;
  drifts.push(...paidReceiptMismatch);

  const duplicateLive = await db.$queryRaw<DriftRow[]>`
    SELECT s."businessId" AS "businessId", 'multiple live subscriptions exist for one business' AS detail
    FROM "Subscription" s
    WHERE s."status" IN ('active','past_due')
      AND s."endsAt" > CURRENT_TIMESTAMP
    GROUP BY s."businessId"
    HAVING COUNT(*) > 1
  `;
  drifts.push(...duplicateLive);

  // The scheduled recovery worker independently re-fetches provider-started checkouts
  // when browser callbacks/webhooks are lost. Anything still open after a full day plus
  // operational headroom is no longer a normal customer interaction: it can block a new
  // checkout and may represent an unresolved provider authorization.
  const staleOpenCheckout = await db.$queryRaw<DriftRow[]>`
    SELECT bp."businessId" AS "businessId",
           'provider-started checkout remained open after recovery window' AS detail
    FROM "BillingPayment" bp
    WHERE bp."provider"='moyasar'
      AND bp."kind" IN ('initial','upgrade')
      AND bp."status" IN ('initiated','authorized')
      AND bp."providerPaymentId" IS NOT NULL
      AND bp."createdAt" < CURRENT_TIMESTAMP - INTERVAL '26 hours'
  `;
  drifts.push(...staleOpenCheckout);

  // A fast-ack webhook is safe only if its durable inbox cannot fail silently. Exhausted
  // retries or a processing lease stuck for >15 minutes are operational payment drifts.
  const webhookInboxDrift = await db.$queryRaw<DriftRow[]>`
    SELECT COALESCE(bp."businessId", 'webhook:' || bwe."id") AS "businessId",
           CASE
             WHEN bwe."attempts" >= 12 THEN 'Moyasar webhook exhausted durable retry budget'
             ELSE 'Moyasar webhook processing lease is stuck'
           END AS detail
    FROM "BillingWebhookEvent" bwe
    LEFT JOIN "BillingPayment" bp ON bp."id"=bwe."billingPaymentId"
    WHERE bwe."processedAt" IS NULL
      AND (
        bwe."attempts" >= 12
        OR (bwe."processingStartedAt" IS NOT NULL AND bwe."processingStartedAt" < CURRENT_TIMESTAMP - INTERVAL '15 minutes')
      )
  `;
  drifts.push(...webhookInboxDrift);

  if (drifts.length) {
    const summary = drifts.slice(0, 20).map((row) => `${row.businessId}: ${row.detail}`).join("\n");
    throw new Error(`Billing entitlement drift detected (${drifts.length})\n${summary}`);
  }

  console.log("billing-state-audit: PASS");
}

main()
  .catch((error) => {
    console.error("billing-state-audit: FAIL", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
