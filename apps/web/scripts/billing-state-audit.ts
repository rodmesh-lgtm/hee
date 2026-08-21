import "dotenv/config";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = String(process.env.DATABASE_URL ?? "").trim();
if (!connectionString) throw new Error("DATABASE_URL is required");
const pool = new Pool({ connectionString, max: 2 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

type DriftRow = { businessId: string; detail: string };

async function main() {
  const drifts: DriftRow[] = [];

  const paidWithoutLive = await db.$queryRaw<DriftRow[]>`
    SELECT b."id" AS "businessId", 'paid business plan without matching live subscription' AS detail
    FROM "Business" b
    JOIN "BusinessPlan" p ON p."id"=b."planId" AND p."code" IN ('BUSINESS','PRO')
    WHERE b."deletedAt" IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Subscription" s
        WHERE s."businessId"=b."id" AND s."planId"=b."planId"
          AND s."status" IN ('active','past_due')
      )
  `;
  drifts.push(...paidWithoutLive);

  const activeMismatch = await db.$queryRaw<DriftRow[]>`
    SELECT s."businessId" AS "businessId", 'live subscription plan differs from business entitlement plan' AS detail
    FROM "Subscription" s
    JOIN "Business" b ON b."id"=s."businessId" AND b."deletedAt" IS NULL
    WHERE s."status"='active' AND b."planId" IS DISTINCT FROM s."planId"
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

  const duplicateLive = await db.$queryRaw<DriftRow[]>`
    SELECT s."businessId" AS "businessId", 'multiple live subscriptions exist for one business' AS detail
    FROM "Subscription" s
    WHERE s."status" IN ('active','past_due')
    GROUP BY s."businessId"
    HAVING COUNT(*) > 1
  `;
  drifts.push(...duplicateLive);

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
