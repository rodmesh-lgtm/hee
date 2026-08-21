import "dotenv/config";

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { createMoyasarTokenPayment, decryptProviderToken, fetchMoyasarPayment, type MoyasarPayment } from "../app/lib/moyasar-core";

const MAX_ATTEMPTS = 3;
const FAILURE_RETRY_MS = 24 * 60 * 60 * 1000;
const RECONCILE_RETRY_MS = 15 * 60 * 1000;
const DUE_WINDOW_MS = 72 * 60 * 60 * 1000;

type DueSubscription = {
  id: string;
  businessId: string;
  planId: string;
  status: string;
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
  providerPaymentId: string | null;
  providerGivenId: string;
  amount: number;
  createdAt: Date;
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

async function expireEndedNonRenewingSubscriptions() {
  const rows = await db.$queryRaw<Array<{ id: string; businessId: string; planId: string }>>`
    SELECT s."id", s."businessId", s."planId"
    FROM "Subscription" s
    JOIN "Business" b ON b."id" = s."businessId" AND b."deletedAt" IS NULL
    WHERE s."status" = 'active'
      AND s."autoRenew" = false
      AND s."endsAt" IS NOT NULL
      AND s."endsAt" <= CURRENT_TIMESTAMP
    ORDER BY s."endsAt" ASC
    LIMIT 200
  `;
  if (!rows.length) return 0;

  const free = await db.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
  if (!free) throw new Error("FREE_PLAN_MISSING");
  for (const row of rows) {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-expire:${row.businessId}`}))`;
      const changed = await tx.$executeRaw`
        UPDATE "Subscription"
        SET "status" = 'canceled', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${row.id} AND "status" = 'active' AND "autoRenew" = false AND "endsAt" <= CURRENT_TIMESTAMP
      `;
      if (changed) {
        // Only remove this paid entitlement when the business still points at its plan.
        // A newer payment/upgrade that already changed planId must win the race.
        await tx.business.updateMany({
          where: { id: row.businessId, deletedAt: null, planId: row.planId },
          data: { planId: free.id },
        });
      }
    });
  }
  return rows.length;
}

async function dueSubscriptions() {
  const horizon = new Date(Date.now() + DUE_WINDOW_MS);
  return db.$queryRaw<DueSubscription[]>`
    SELECT s."id", s."businessId", s."planId", s."status", s."endsAt", p."monthlyPrice",
           pm."encryptedToken", pm."id" AS "paymentMethodId"
    FROM "Subscription" s
    JOIN "BusinessPlan" p ON p."id" = s."planId"
    JOIN "BillingPaymentMethod" pm ON pm."id" = s."paymentMethodId" AND pm."status" = 'active'
    JOIN "Business" b ON b."id" = s."businessId" AND b."deletedAt" IS NULL
    WHERE s."status" IN ('active','past_due')
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
    SELECT "id", "attempt", "status", "nextRetryAt", "providerPaymentId", "providerGivenId", "amount", "createdAt"
    FROM "BillingPayment"
    WHERE "subscriptionId" = ${subscriptionId} AND "kind" = 'renewal'
    ORDER BY "attempt" DESC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function createAttempt(sub: DueSubscription, attempt: number) {
  const id = randomUUID();
  const providerGivenId = randomUUID();
  const amount = sub.monthlyPrice * 100;
  const rows = await db.$queryRaw<RenewalAttempt[]>`
    INSERT INTO "BillingPayment" (
      "id", "businessId", "planId", "subscriptionId", "provider", "providerGivenId",
      "kind", "amount", "currency", "status", "attempt", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${sub.businessId}, ${sub.planId}, ${sub.id}, 'moyasar', ${providerGivenId},
      'renewal', ${amount}, 'SAR', 'created', ${attempt}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
    ON CONFLICT DO NOTHING
    RETURNING "id", "attempt", "status", "nextRetryAt", "providerPaymentId", "providerGivenId", "amount", "createdAt"
  `;
  return rows[0] ?? null;
}

async function setAttemptState(billingId: string, status: string, providerId: string | null, nextRetryAt: Date | null) {
  await db.$executeRaw`
    UPDATE "BillingPayment"
    SET "providerPaymentId" = COALESCE(${providerId}, "providerPaymentId"), "status" = ${status},
        "nextRetryAt" = ${nextRetryAt}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${billingId} AND "status" <> 'paid'
  `;
}

async function markFailed(billingId: string, providerId: string | null, attempt: number) {
  const nextRetryAt = attempt < MAX_ATTEMPTS ? new Date(Date.now() + FAILURE_RETRY_MS) : null;
  await setAttemptState(billingId, "failed", providerId, nextRetryAt);
}

async function markAmbiguous(billingId: string, providerId: string | null) {
  await setAttemptState(billingId, "initiated", providerId, new Date(Date.now() + RECONCILE_RETRY_MS));
}

async function markPastDue(sub: DueSubscription) {
  if (sub.endsAt.getTime() > Date.now()) return;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`renewal-past-due:${sub.businessId}`}))`;
    const changed = await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'past_due', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id} AND "status" = 'active'
    `;
    if (changed) {
      const free = await tx.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
      if (!free) throw new Error("FREE_PLAN_MISSING");
      await tx.business.updateMany({ where: { id: sub.businessId, deletedAt: null, planId: sub.planId }, data: { planId: free.id } });
    }
  });
}

async function activateRenewal(sub: DueSubscription, billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`renewal-activate:${sub.id}`}))`;
    const billingRows = await tx.$queryRaw<Array<{ status: string; amount: number; currency: string; providerPaymentId: string | null }>>`
      SELECT "status", "amount", "currency", "providerPaymentId" FROM "BillingPayment" WHERE "id" = ${billingId} FOR UPDATE
    `;
    const billing = billingRows[0];
    if (!billing) return "missing" as const;
    if (billing.providerPaymentId && billing.providerPaymentId !== payment.id) return "provider-payment-mismatch" as const;
    if (billing.status === "paid") return "already-paid" as const;
    if (payment.status !== "paid" || payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;
    if (String(payment.metadata?.hee_billing_id ?? "") !== billingId || String(payment.metadata?.hee_business_id ?? "") !== sub.businessId) return "mismatch" as const;

    const currentRows = await tx.$queryRaw<Array<{ id: string; status: string; endsAt: Date }>>`
      SELECT "id", "status", "endsAt" FROM "Subscription"
      WHERE "id" = ${sub.id} AND "businessId" = ${sub.businessId} AND "status" IN ('active','past_due')
      FOR UPDATE
    `;
    const current = currentRows[0];
    if (!current) return "stale" as const;

    const now = new Date();
    const nextEnd = addMonth(current.endsAt > now ? current.endsAt : now);
    await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'replaced', "endsAt" = ${now}, "autoRenew" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id} AND "status" IN ('active','past_due')
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
    await tx.business.updateMany({ where: { id: sub.businessId, deletedAt: null }, data: { planId: sub.planId } });
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId" = ${payment.id}, "subscriptionId" = ${newSubscriptionId},
          "status" = 'paid', "paidAt" = CURRENT_TIMESTAMP, "nextRetryAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
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
    await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'canceled', "autoRenew" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id} AND "status" IN ('active','past_due')
    `;
    await tx.business.updateMany({ where: { id: sub.businessId, deletedAt: null, planId: sub.planId }, data: { planId: free.id } });
  });
}

async function resolveProviderState(sub: DueSubscription, billing: RenewalAttempt, payment: MoyasarPayment) {
  if (payment.status === "paid") {
    const result = await activateRenewal(sub, billing.id, payment);
    if (result !== "activated" && result !== "already-paid") throw new Error(`ACTIVATION_${result}`);
    return "done" as const;
  }
  if (payment.status === "failed" || payment.status === "voided" || payment.status === "refunded") {
    await markFailed(billing.id, payment.id, billing.attempt);
    if (billing.attempt >= MAX_ATTEMPTS) await expireAfterFailedRenewal(sub);
    return "done" as const;
  }

  await setAttemptState(billing.id, payment.status === "authorized" ? "authorized" : "initiated", payment.id, new Date(Date.now() + RECONCILE_RETRY_MS));
  await markPastDue(sub);
  return "pending" as const;
}

async function submitAttempt(sub: DueSubscription, billing: RenewalAttempt) {
  try {
    const payment = await createMoyasarTokenPayment({
      givenId: billing.providerGivenId,
      token: decryptProviderToken(sub.encryptedToken),
      amount: billing.amount,
      description: "HEE subscription renewal",
      callbackUrl: "https://hee.sa/dashboard/billing/manage",
      metadata: { hee_billing_id: billing.id, hee_business_id: sub.businessId },
    });
    return await resolveProviderState(sub, billing, payment);
  } catch (error) {
    console.error("[billing-renewal] provider_request_ambiguous", {
      subscriptionId: sub.id,
      attempt: billing.attempt,
      error: error instanceof Error ? error.message : "unknown",
    });
    await markAmbiguous(billing.id, billing.providerPaymentId);
    await markPastDue(sub);
    return "pending" as const;
  }
}

async function processSubscription(sub: DueSubscription) {
  let latest = await latestAttempt(sub.id);
  if (latest?.status === "paid") return;

  if (latest && ["initiated", "authorized"].includes(latest.status)) {
    if (latest.nextRetryAt && latest.nextRetryAt.getTime() > Date.now()) {
      await markPastDue(sub);
      return;
    }
    if (latest.providerPaymentId) {
      try {
        const payment = await fetchMoyasarPayment(latest.providerPaymentId);
        const resolved = await resolveProviderState(sub, latest, payment);
        if (resolved === "done" || resolved === "pending") return;
      } catch (error) {
        console.error("[billing-renewal] reconciliation_failed", {
          subscriptionId: sub.id,
          attempt: latest.attempt,
          error: error instanceof Error ? error.message : "unknown",
        });
        await markAmbiguous(latest.id, latest.providerPaymentId);
        await markPastDue(sub);
        return;
      }
    } else {
      await submitAttempt(sub, latest);
      return;
    }
  }

  if (latest?.status === "created") {
    await submitAttempt(sub, latest);
    return;
  }

  if (latest?.status === "failed") {
    if (latest.attempt >= MAX_ATTEMPTS) {
      await expireAfterFailedRenewal(sub);
      return;
    }
    if (latest.nextRetryAt && latest.nextRetryAt.getTime() > Date.now()) {
      await markPastDue(sub);
      return;
    }
  }

  const attempt = latest ? latest.attempt + 1 : 1;
  latest = await createAttempt(sub, attempt);
  if (!latest) return;
  await submitAttempt(sub, latest);
}

async function main() {
  if (String(process.env.BILLING_RENEWAL_ENABLED ?? "").trim().toLowerCase() !== "true") throw new Error("BILLING_RENEWAL_ENABLED must be true");
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") throw new Error("PAYMENT_PROVIDER must be moyasar");
  required("MOYASAR_SECRET_KEY");
  required("BILLING_TOKEN_ENCRYPTION_KEY");

  const expired = await expireEndedNonRenewingSubscriptions();
  const due = await dueSubscriptions();
  for (const sub of due) await processSubscription(sub);
  console.log(`billing-renewal-worker: PASS (${expired} ended subscriptions expired, ${due.length} renewable subscriptions checked)`);
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
