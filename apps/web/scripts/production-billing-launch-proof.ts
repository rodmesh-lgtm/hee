import "dotenv/config";

import { Pool } from "pg";
import { assertPaidRehearsalProof, assertRehearsalCandidate, type ProviderPaymentProof, type RehearsalCandidate, type RehearsalProofRow } from "./production-billing-launch-proof-core";

function required(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function arg(name: string) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return String(process.argv[index + 1]).trim();
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function validBillingId(value: string) {
  return /^[0-9a-f-]{36}$/i.test(value);
}

async function providerPayment(id: string): Promise<ProviderPaymentProof> {
  const secret = required("MOYASAR_SECRET_KEY");
  if (!secret.startsWith("sk_live_")) throw new Error("Production rehearsal proof requires a live Moyasar secret key");
  const response = await fetch(`https://api.moyasar.com/v1/payments/${encodeURIComponent(id)}`, {
    headers: { authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}` },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Moyasar payment lookup failed with HTTP ${response.status}`);
  const body = await response.json() as Record<string, unknown>;
  return {
    id: String(body.id ?? ""),
    status: String(body.status ?? ""),
    amount: Number(body.amount),
    currency: String(body.currency ?? ""),
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata as Record<string, unknown> : null,
  };
}

const connectionString = required("DATABASE_URL");
const pool = new Pool({ connectionString, max: 1 });

async function candidate(email: string) {
  if (!validEmail(email)) throw new Error("Rehearsal email is invalid");
  const client = await pool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    const result = await client.query<RehearsalCandidate>(`
      SELECT
        u."id" AS "userId",
        u."email" AS "email",
        u."emailVerifiedAt" AS "emailVerifiedAt",
        u."deletedAt" AS "userDeletedAt",
        b."id" AS "businessId",
        b."deletedAt" AS "businessDeletedAt",
        COALESCE(p."code", 'FREE') AS "planCode",
        (
          SELECT COUNT(*)::int FROM "Subscription" s
          JOIN "BusinessPlan" sp ON sp."id"=s."planId" AND sp."code" IN ('BUSINESS','PRO')
          WHERE s."businessId"=b."id" AND s."status" IN ('active','past_due') AND s."endsAt" > CURRENT_TIMESTAMP
        ) AS "activePaidSubscriptions",
        (
          SELECT COUNT(*)::int FROM "BillingPayment" bp
          WHERE bp."businessId"=b."id" AND bp."status" IN ('created','initiated','authorized')
        ) AS "openBillingPayments"
      FROM "User" u
      JOIN "Business" b ON b."ownerId"=u."id" AND b."deletedAt" IS NULL
      LEFT JOIN "BusinessPlan" p ON p."id"=b."planId"
      WHERE LOWER(u."email")=LOWER($1) AND u."deletedAt" IS NULL
      ORDER BY b."createdAt" ASC
    `, [email]);
    const row = assertRehearsalCandidate(result.rows, email);
    await client.query("ROLLBACK");
    console.log(`production-billing-rehearsal-candidate: PASS business=${row.businessId}`);
  } finally {
    client.release();
  }
}

async function verify(billingId: string, email: string, rehearsalStartedAt: string) {
  if (!validBillingId(billingId)) throw new Error("Billing id is invalid");
  if (!validEmail(email)) throw new Error("Rehearsal email is invalid");
  if (!Number.isFinite(new Date(rehearsalStartedAt).getTime())) throw new Error("Rehearsal start timestamp is invalid");
  const releaseSha = String(process.env.RELEASE_SHA ?? process.env.GITHUB_SHA ?? "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(releaseSha)) throw new Error("RELEASE_SHA/GITHUB_SHA must be an exact 40-character SHA");

  const client = await pool.connect();
  try {
    await client.query("BEGIN TRANSACTION READ ONLY");
    const payment = await client.query<RehearsalProofRow>(`
      SELECT
        bp."id" AS "billingId",
        bp."businessId" AS "businessId",
        bp."planId" AS "planId",
        bp."subscriptionId" AS "subscriptionId",
        bp."providerPaymentId" AS "providerPaymentId",
        bp."kind" AS "kind",
        bp."amount" AS "amount",
        bp."currency" AS "currency",
        bp."status" AS "paymentStatus",
        bp."paidAt" AS "paidAt",
        bp."createdAt" AS "paymentCreatedAt",
        bp."receiptSellerLegalName" AS "receiptSellerLegalName",
        bp."receiptSellerAddress" AS "receiptSellerAddress",
        bp."receiptTaxStatus" AS "receiptTaxStatus",
        bp."receiptNetAmount" AS "receiptNetAmount",
        bp."receiptVatAmount" AS "receiptVatAmount",
        bp."receiptIssuedAt" AS "receiptIssuedAt",
        u."email" AS "ownerEmail",
        u."emailVerifiedAt" AS "ownerEmailVerifiedAt",
        u."deletedAt" AS "ownerDeletedAt",
        b."deletedAt" AS "businessDeletedAt",
        b."planId" AS "businessPlanId",
        p."code" AS "planCode",
        p."isActive" AS "planIsActive",
        s."status" AS "subscriptionStatus",
        s."provider" AS "subscriptionProvider",
        s."providerReference" AS "subscriptionProviderReference",
        s."paymentMethodId" AS "subscriptionPaymentMethodId",
        s."autoRenew" AS "subscriptionAutoRenew",
        s."endsAt" AS "subscriptionEndsAt",
        pm."provider" AS "paymentMethodProvider",
        pm."status" AS "paymentMethodStatus",
        LENGTH(pm."encryptedToken")::int AS "paymentMethodTokenLength",
        c."acceptedAt" AS "consentAcceptedAt",
        c."termsVersion" AS "consentTermsVersion",
        c."privacyVersion" AS "consentPrivacyVersion",
        c."disclosureVersion" AS "consentDisclosureVersion",
        h."lastSucceededAt" AS "heartbeatAt",
        h."releaseSha" AS "heartbeatReleaseSha",
        (
          SELECT COUNT(*)::int FROM "BillingWebhookEvent" e
          WHERE e."provider"='moyasar'
            AND e."billingPaymentId"=bp."id"
            AND e."providerPaymentId"=bp."providerPaymentId"
            AND e."processedAt" IS NOT NULL
            AND e."lastError" IS NULL
        ) AS "successfulWebhookEvents",
        (
          SELECT COUNT(*)::int FROM "BillingWebhookEvent" e
          WHERE e."provider"='moyasar'
            AND e."providerPaymentId"=bp."providerPaymentId"
            AND e."processedAt" IS NULL
        ) AS "pendingWebhookEvents"
      FROM "BillingPayment" bp
      JOIN "Business" b ON b."id"=bp."businessId"
      JOIN "User" u ON u."id"=b."ownerId"
      JOIN "BusinessPlan" p ON p."id"=bp."planId"
      LEFT JOIN "Subscription" s ON s."id"=bp."subscriptionId" AND s."businessId"=bp."businessId"
      LEFT JOIN "BillingPaymentMethod" pm ON pm."id"=s."paymentMethodId" AND pm."businessId"=bp."businessId"
      LEFT JOIN "BillingCheckoutConsent" c ON c."billingPaymentId"=bp."id" AND c."userId"=u."id"
      LEFT JOIN "BillingOperationsHeartbeat" h ON h."id"='billing-operations'
      WHERE bp."id"=$1
      LIMIT 1
    `, [billingId]);
    if (payment.rows.length !== 1) throw new Error("Rehearsal billing payment was not found");
    const row = payment.rows[0];
    if (!row.providerPaymentId) throw new Error("Rehearsal billing payment has no provider payment id");
    const provider = await providerPayment(row.providerPaymentId);
    assertPaidRehearsalProof({ row, provider, expectedEmail: email, rehearsalStartedAt, releaseSha });
    await client.query("ROLLBACK");
    console.log(`production-billing-rehearsal-proof: PASS billing=${billingId} provider=${row.providerPaymentId} release=${releaseSha}`);
  } finally {
    client.release();
  }
}

async function main() {
  if (String(process.env.APP_ENV ?? "").trim().toLowerCase() !== "production") throw new Error("APP_ENV must be production");
  const mode = process.argv[2];
  if (mode === "candidate") await candidate(arg("--email"));
  else if (mode === "verify") await verify(arg("--billing-id"), arg("--email"), arg("--rehearsal-started-at"));
  else throw new Error("Usage: production-billing-launch-proof.ts candidate --email <email> | verify --billing-id <uuid> --email <email> --rehearsal-started-at <iso>");
}

main()
  .catch((error) => {
    console.error("production-billing-launch-proof: FAIL", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
