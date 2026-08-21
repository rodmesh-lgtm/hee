import "dotenv/config";

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createMoyasarTokenPayment, decryptProviderToken, type MoyasarPayment } from "../app/lib/moyasar-core";

const MAX_ATTEMPTS = 3;
const RETRY_MS = 24 * 60 * 60 * 1000;
const DUE_WINDOW_MS = 72 * 60 * 60 * 1000;

type DueSubscription = {
  id: string;
  businessId: string;
  planId: string;
  endsAt: Date;
  monthlyPrice: number;
  encryptedToken: string;
  paymentMethodId: string;
};

type RenewalAttempt = {
  id: string;
  attempt: number;
  status: string;
  nextRetryAt: Date | null;
};

function required(name: string) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name}_MISSING`);
  return value;
}

function addMonth(value: Date) {
  const start = new Date(value);
  const year = start.getUTCFullYear();
  const month = start.getUTCMonth();
  const day = start.getUTCDate();
  const target = new Date(Date.UTC(year, month + 1, 1, start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

const pool = new Pool({ connectionString: required("DATABASE_URL"), max: 4 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

async function dueSubscriptions() {
  const horizon = new Date(Date.now() + DUE_WINDOW_MS);
  return db.$queryRaw<DueSubscription[]>`
    SELECT s."id", s."businessId", s."planId", s."endsAt", p."monthlyPrice",
           pm."encryptedToken", pm."id" AS "paymentMethodId"
    FROM "Subscription" s
    JOIN "BusinessPlan" p ON p."id" = s."planId"
    JOIN "BillingPaymentMethod" pm ON pm."id" = s."paymentMethodId" AND pm."status" = 'active'
    JOIN "Business" b ON b."id" = s."businessId" AND b."deletedAt" IS NULL
    WHERE s."status" = 'active'
      AND s."autoRenew" = true
      AND s."provider" = 'moyasar'
      AND s."endsAt" IS NOT NULL
      AND s."endsAt" <= ${horizon}
    ORDER BY s."endsAt" ASC
    LIMIT 100
  `;
}

async function latestAttempt(subscriptionId: string) {
  const rows = await db.$queryRaw<RenewalAttempt[]>`
    SELECT "id", "attempt", "status", "nextRetryAt"
    FROM "BillingPayment"
    WHERE "subscriptionId" = ${subscriptionId} AND "kind" = 'renewal'
    ORDER BY "attempt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function createAttempt(sub: DueSubscription, attempt: number) {
  const id = randomUUID();
  const givenId = randomUUID();
  const amount = sub.monthlyPrice * 100;
  const rows = await db.$queryRaw<Array<{ id: string }>>`
    INSERT INTO "BillingPayment" (
      "id", "businessId", "planId", "subscriptionId", "provider", "providerGivenId",
      "kind", "amount", "currency", "status", "attempt", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${sub.businessId}, ${sub.planId}, ${sub.id}, 'moyasar', ${givenId},
      'renewal', ${amount}, 'SAR', 'created', ${attempt}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT DO NOTHING
    RETURNING "id"
  `;
  return rows.length ? { id, givenId, amount } : null;
}

async function markFailed(billingId: string, providerId: string | null, attempt: number) {
  const nextRetryAt = attempt < MAX_ATTEMPTS ? new Date(Date.now() + RETRY_MS) : null;
  await db.$executeRaw`
    UPDATE "BillingPayment"
    SET "providerPaymentId" = COALESCE(${providerId}, "providerPaymentId"), "status" = 'failed',
        "nextRetryAt" = ${nextRetryAt}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${billingId} AND "status" <> 'paid'
  `;
}

async function activateRenewal(sub: DueSubscription, billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`renewal-activate:${sub.id}`}))`;
    const billingRows = await tx.$queryRaw<Array<{ status: string; amount: number; currency: string }>>`
      SELECT "status", "amount", "currency" FROM "BillingPayment" WHERE "id" = ${billingId} FOR UPDATE
    `;
    const billing = billingRows[0];
    if (!billing) return "missing" as const;
    if (billing.status === "paid") return "already-paid" as const;
    if (payment.status !== "paid" || payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;
    if (String(payment.metadata?.hee_billing_id ?? "") !== billingId || String(payment.metadata?.hee_business_id ?? "") !== sub.businessId) return "mismatch" as const;

    const currentRows = await tx.$queryRaw<Array<{ id: string; status: string }>>`
      SELECT "id", "status" FROM "Subscription" WHERE "id" = ${sub.id} FOR UPDATE
    `;
    if (currentRows[0]?.status !== "active") return "stale" as const;

    const now = new Date();
    const nextEnd = addMonth(sub.endsAt > now ? sub.endsAt : now);
    await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'replaced', "endsAt" = ${now}, "autoRenew" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id} AND "status" = 'active'
    `;
    const newSubscriptionId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO "Subscription" (
        "id", "businessId", "planId", "status", "startsAt", "endsAt", "createdAt", "updatedAt",
        "autoRenew", "provider", "providerReference", "paymentMethodId"
      ) VALUES (
        ${newSubscriptionId}, ${sub.businessId}, ${sub.planId}, 'active', ${now}, ${nextEnd}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
        true, 'moyasar', ${payment.id}, ${sub.paymentMethodId}
      )
    `;
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId" = ${payment.id}, "status" = 'paid', "paidAt" = CURRENT_TIMESTAMP,
          "nextRetryAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${billingId}
    `;
    return "activated" as const;
  });
}

async function expireAfterFailedRenewal(sub: DueSubscription) {
  if (sub.endsAt.getTime() > Date.now()) return;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`renewal-expire:${sub.businessId}`}))`;
    const free = await tx.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
    if (!free) throw new Error("FREE_PLAN_MISSING");
    const changed = await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'canceled', "autoRenew" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id} AND "status" = 'active'
    `;
    if (changed) {
      await tx.business.updateMany({
        where: { id: sub.businessId, deletedAt: null, planId: sub.planId },
        data: { planId: free.id },
      });
    }
  });
}

async function processSubscription(sub: DueSubscription) {
  const latest = await latestAttempt(sub.id);
  if (latest?.status === "paid" || latest?.status === "initiated") return;
  if (latest?.status === "failed") {
    if (latest.attempt >= MAX_ATTEMPTS) {
      await expireAfterFailedRenewal(sub);
      return;
    }
    if (latest.nextRetryAt && latest.nextRetryAt.getTime() > Date.now()) return;
  }

  const attempt = latest ? latest.attempt + 1 : 1;
  const billing = await createAttempt(sub, attempt);
  if (!billing) return; // another worker won the unique renewal-attempt race

  let providerId: string | null = null;
  try {
    const payment = await createMoyasarTokenPayment({
      givenId: billing.givenId,
      token: decryptProviderToken(sub.encryptedToken),
      amount: billing.amount,
      description: "HEE subscription renewal",
      callbackUrl: "https://hee.sa/dashboard/settings",
      metadata: {
        hee_billing_id: billing.id,
        hee_business_id: sub.businessId,
      },
    });
    providerId = payment.id;
    if (payment.status === "paid") {
      const result = await activateRenewal(sub, billing.id, payment);
      if (result !== "activated" && result !== "already-paid") throw new Error(`ACTIVATION_${result}`);
      return;
    }
    await markFailed(billing.id, providerId, attempt);
    if (attempt >= MAX_ATTEMPTS) await expireAfterFailedRenewal(sub);
  } catch (error) {
    console.error("[billing-renewal] attempt_failed", {
      subscriptionId: sub.id,
      attempt,
      error: error instanceof Error ? error.message : "unknown",
    });
    await markFailed(billing.id, providerId, attempt);
    if (attempt >= MAX_ATTEMPTS) await expireAfterFailedRenewal(sub);
  }
}

async function main() {
  if (String(process.env.BILLING_RENEWAL_ENABLED ?? "").trim().toLowerCase() !== "true") throw new Error("BILLING_RENEWAL_ENABLED must be true");
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") throw new Error("PAYMENT_PROVIDER must be moyasar");
  required("MOYASAR_SECRET_KEY");
  required("BILLING_TOKEN_ENCRYPTION_KEY");

  const due = await dueSubscriptions();
  for (const sub of due) await processSubscription(sub);
  console.log(`billing-renewal-worker: PASS (${due.length} subscriptions checked)`);
}

main()
  .catch((error) => {
    console.error("billing-renewal-worker: FAIL", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    await pool.end();
  });
