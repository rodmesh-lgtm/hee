import "dotenv/config";

import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { paidBillingTaxReady, receiptSnapshot } from "../app/lib/billing-tax-core";
import {
  createMoyasarTokenPayment,
  decryptProviderToken,
  fetchMoyasarPayment,
  reverseMoyasarPayment,
  type MoyasarPayment,
} from "../app/lib/moyasar-core";

const MAX_ATTEMPTS = 3;
const FAILURE_RETRY_MS = 24 * 60 * 60 * 1000;
const RECONCILE_RETRY_MS = 15 * 60 * 1000;
const DUE_WINDOW_MS = 0;

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
  const target = new Date(Date.UTC(
    year,
    month + 1,
    1,
    start.getUTCHours(),
    start.getUTCMinutes(),
    start.getUTCSeconds(),
    start.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

const pool = new Pool({ connectionString: required("DATABASE_URL"), max: 4 });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

function businessLockKey(businessId: string) {
  return `billing-business:${businessId}`;
}

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
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessLockKey(row.businessId)}))`;
      const changed = await tx.$executeRaw`
        UPDATE "Subscription"
        SET "status" = 'canceled', "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${row.id}
          AND "status" = 'active'
          AND "autoRenew" = false
          AND "endsAt" <= CURRENT_TIMESTAMP
      `;
      if (changed) {
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
    JOIN "BusinessPlan" p ON p."id" = s."planId" AND p."isActive" = true
    JOIN "BillingPaymentMethod" pm
      ON pm."id" = s."paymentMethodId"
     AND pm."businessId" = s."businessId"
     AND pm."status" = 'active'
    JOIN "Business" b ON b."id" = s."businessId" AND b."deletedAt" IS NULL
    JOIN "User" u ON u."id" = b."ownerId" AND u."deletedAt" IS NULL AND u."emailVerifiedAt" IS NOT NULL
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
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessLockKey(sub.businessId)}))`;
    const eligible = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT s."id"
      FROM "Subscription" s
      JOIN "BillingPaymentMethod" pm
        ON pm."id"=s."paymentMethodId"
       AND pm."businessId"=s."businessId"
       AND pm."status"='active'
      JOIN "Business" b ON b."id"=s."businessId" AND b."deletedAt" IS NULL
      JOIN "User" u ON u."id"=b."ownerId" AND u."deletedAt" IS NULL AND u."emailVerifiedAt" IS NOT NULL
      JOIN "BusinessPlan" p ON p."id"=s."planId" AND p."isActive"=true
      WHERE s."id"=${sub.id}
        AND s."businessId"=${sub.businessId}
        AND s."status" IN ('active','past_due')
        AND s."autoRenew"=true
        AND s."provider"='moyasar'
        AND s."endsAt" IS NOT NULL
        AND s."endsAt" <= CURRENT_TIMESTAMP
      FOR UPDATE OF s
    `;
    if (!eligible[0]) return null;

    const id = randomUUID();
    const providerGivenId = randomUUID();
    const amount = sub.monthlyPrice * 100;
    const rows = await tx.$queryRaw<RenewalAttempt[]>`
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
  });
}

async function claimAttemptForProviderSubmission(sub: DueSubscription, billing: RenewalAttempt) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessLockKey(sub.businessId)}))`;

    // This is the cancellation and account-eligibility boundary. A cancellation, owner
    // deletion/unverification, business deletion or plan disable that wins before this
    // lock prevents a new provider request. Once provider submission wins, any settled
    // payment that later loses its entitlement target is reversed during reconciliation.
    const eligible = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT s."id"
      FROM "Subscription" s
      JOIN "BillingPaymentMethod" pm
        ON pm."id"=s."paymentMethodId"
       AND pm."businessId"=s."businessId"
       AND pm."status"='active'
      JOIN "Business" b ON b."id"=s."businessId" AND b."deletedAt" IS NULL
      JOIN "User" u ON u."id"=b."ownerId" AND u."deletedAt" IS NULL AND u."emailVerifiedAt" IS NOT NULL
      JOIN "BusinessPlan" p ON p."id"=s."planId" AND p."isActive"=true
      WHERE s."id"=${sub.id}
        AND s."businessId"=${sub.businessId}
        AND s."status" IN ('active','past_due')
        AND s."autoRenew"=true
        AND s."provider"='moyasar'
        AND s."endsAt" IS NOT NULL
        AND s."endsAt" <= CURRENT_TIMESTAMP
      FOR UPDATE OF s, b, u, p
    `;
    if (!eligible[0]) return false;

    const claimed = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "BillingPayment"
      SET "status"='initiated',
          "providerPaymentId"=COALESCE("providerPaymentId","providerGivenId"),
          "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${billing.id}
        AND "businessId"=${sub.businessId}
        AND "subscriptionId"=${sub.id}
        AND "kind"='renewal'
        AND "status" IN ('created','initiated')
      RETURNING "id"
    `;
    return Boolean(claimed[0]);
  });
}

async function setAttemptState(
  billingId: string,
  status: string,
  providerId: string | null,
  nextRetryAt: Date | null,
) {
  await db.$transaction(async (tx) => {
    const identity = await tx.$queryRaw<Array<{ businessId: string }>>`
      SELECT "businessId" FROM "BillingPayment" WHERE "id"=${billingId} LIMIT 1
    `;
    if (!identity[0]) return;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessLockKey(identity[0].businessId)}))`;
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId" = COALESCE(${providerId}, "providerPaymentId"),
          "status" = ${status},
          "nextRetryAt" = ${nextRetryAt},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${billingId}
        AND "status" IN ('created','initiated','authorized','failed')
    `;
  });
}

async function markFailed(billingId: string, providerId: string | null, attempt: number) {
  const nextRetryAt = attempt < MAX_ATTEMPTS ? new Date(Date.now() + FAILURE_RETRY_MS) : null;
  await setAttemptState(billingId, "failed", providerId, nextRetryAt);
}

async function markAmbiguous(billingId: string, providerId: string) {
  await setAttemptState(billingId, "initiated", providerId, new Date(Date.now() + RECONCILE_RETRY_MS));
}

async function markPastDue(sub: DueSubscription) {
  if (sub.endsAt.getTime() > Date.now()) return;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessLockKey(sub.businessId)}))`;
    const changed = await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'past_due', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id}
        AND "status" = 'active'
        AND "autoRenew"=true
        AND "endsAt" <= CURRENT_TIMESTAMP
    `;
    if (changed) {
      const free = await tx.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
      if (!free) throw new Error("FREE_PLAN_MISSING");
      await tx.business.updateMany({
        where: { id: sub.businessId, deletedAt: null, planId: sub.planId },
        data: { planId: free.id },
      });
    }
  });
}

async function activateRenewal(sub: DueSubscription, billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessLockKey(sub.businessId)}))`;
    const billingRows = await tx.$queryRaw<Array<{
      status: string;
      amount: number;
      currency: string;
      providerPaymentId: string | null;
      subscriptionId: string | null;
      kind: string;
    }>>`
      SELECT "status", "amount", "currency", "providerPaymentId", "subscriptionId", "kind"
      FROM "BillingPayment"
      WHERE "id" = ${billingId} AND "businessId"=${sub.businessId}
      FOR UPDATE
    `;
    const billing = billingRows[0];
    if (!billing) return "missing" as const;
    if (billing.kind !== "renewal" || billing.subscriptionId !== sub.id) return "mismatch" as const;
    if (billing.providerPaymentId && billing.providerPaymentId !== payment.id) return "provider-payment-mismatch" as const;
    if (billing.status === "paid") return "already-paid" as const;
    if (["refunded", "voided", "canceled"].includes(billing.status)) return "terminal-state" as const;
    if (billing.status === "created") return "unclaimed" as const;
    if (payment.status !== "paid" || payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;
    if (String(payment.metadata?.hee_billing_id ?? "") !== billingId || String(payment.metadata?.hee_business_id ?? "") !== sub.businessId) return "mismatch" as const;

    const eligibleTargets = await tx.$queryRaw<Array<{ businessId: string; planId: string }>>`
      SELECT b."id" AS "businessId", p."id" AS "planId"
      FROM "Business" b
      JOIN "User" u ON u."id"=b."ownerId"
      JOIN "BusinessPlan" p ON p."id"=${sub.planId} AND p."isActive"=true
      WHERE b."id"=${sub.businessId}
        AND b."deletedAt" IS NULL
        AND u."deletedAt" IS NULL
        AND u."emailVerifiedAt" IS NOT NULL
      FOR KEY SHARE OF b, u, p
    `;
    if (!eligibleTargets[0]) return "ineligible-target" as const;

    const currentRows = await tx.$queryRaw<Array<{
      id: string;
      status: string;
      endsAt: Date;
      autoRenew: boolean;
      paymentMethodId: string | null;
      methodStatus: string | null;
    }>>`
      SELECT s."id", s."status", s."endsAt", s."autoRenew", s."paymentMethodId", pm."status" AS "methodStatus"
      FROM "Subscription" s
      LEFT JOIN "BillingPaymentMethod" pm
        ON pm."id"=s."paymentMethodId" AND pm."businessId"=s."businessId"
      WHERE s."id" = ${sub.id}
        AND s."businessId" = ${sub.businessId}
        AND s."status" IN ('active','past_due')
      FOR UPDATE OF s
    `;
    const current = currentRows[0];
    if (!current) return "stale" as const;

    const now = new Date();
    const nextEnd = addMonth(current.endsAt > now ? current.endsAt : now);
    const nextAutoRenew = Boolean(current.autoRenew && current.paymentMethodId && current.methodStatus === "active");
    const receipt = receiptSnapshot(billingId, billing.amount);

    await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'replaced', "autoRenew" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id}
        AND "status" IN ('active','past_due')
    `;

    const newSubscriptionId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO "Subscription" (
        "id", "businessId", "planId", "status", "startsAt", "endsAt", "createdAt", "updatedAt",
        "autoRenew", "provider", "providerReference", "paymentMethodId"
      ) VALUES (
        ${newSubscriptionId}, ${sub.businessId}, ${sub.planId}, 'active', ${now}, ${nextEnd}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
        ${nextAutoRenew}, 'moyasar', ${payment.id}, ${current.paymentMethodId}
      )
    `;

    await tx.business.updateMany({
      where: { id: sub.businessId, deletedAt: null },
      data: { planId: sub.planId },
    });

    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId" = ${payment.id},
          "subscriptionId" = ${newSubscriptionId},
          "status" = 'paid',
          "paidAt" = CURRENT_TIMESTAMP,
          "nextRetryAt" = NULL,
          "receiptSellerLegalName"=${receipt.sellerLegalName},
          "receiptSellerAddress"=${receipt.sellerAddress},
          "receiptTaxStatus"=${receipt.taxStatus},
          "receiptNetAmount"=${receipt.netAmount},
          "receiptVatAmount"=${receipt.vatAmount},
          "receiptIssuedAt"=${receipt.issuedAt},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${billingId}
        AND "status" IN ('initiated','authorized','failed')
    `;
    return "activated" as const;
  });
}

async function expireAfterFailedRenewal(sub: DueSubscription) {
  if (sub.endsAt.getTime() > Date.now()) return;
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${businessLockKey(sub.businessId)}))`;
    const free = await tx.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
    if (!free) throw new Error("FREE_PLAN_MISSING");
    const changed = await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status" = 'canceled', "autoRenew" = false, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${sub.id}
        AND "status" IN ('active','past_due')
        AND "endsAt" <= CURRENT_TIMESTAMP
    `;
    if (changed) {
      await tx.business.updateMany({
        where: { id: sub.businessId, deletedAt: null, planId: sub.planId },
        data: { planId: free.id },
      });
    }
  });
}

async function reverseUnactivatableRenewal(billing: RenewalAttempt, payment: MoyasarPayment, reason: string) {
  console.error("[billing-renewal] settled_payment_not_activatable", {
    billingId: billing.id,
    providerPaymentId: payment.id,
    reason,
  });
  const reversed = await reverseMoyasarPayment(payment.id);
  if (reversed.status !== "refunded" && reversed.status !== "voided") {
    throw new Error(`REVERSAL_UNRESOLVED_${reversed.status}`);
  }
  await setAttemptState(billing.id, reversed.status, reversed.id, null);
}

async function resolveProviderState(sub: DueSubscription, billing: RenewalAttempt, payment: MoyasarPayment) {
  if (payment.status === "paid") {
    const result = await activateRenewal(sub, billing.id, payment);
    if (result === "activated" || result === "already-paid") return "done" as const;

    // These states are terminal entitlement failures after a payment that is already
    // known to belong to this renewal. Keeping it would charge the customer without a
    // valid paid period, so reverse it. Structural mismatches remain operator-visible
    // errors rather than refunding a payment whose identity cannot be proven safely.
    if (["ineligible-target", "stale", "terminal-state", "unclaimed"].includes(result)) {
      await reverseUnactivatableRenewal(billing, payment, result);
      return "done" as const;
    }
    throw new Error(`ACTIVATION_${result}`);
  }

  if (payment.status === "failed" || payment.status === "voided" || payment.status === "refunded") {
    await markFailed(billing.id, payment.id, billing.attempt);
    if (billing.attempt >= MAX_ATTEMPTS) await expireAfterFailedRenewal(sub);
    return "done" as const;
  }

  await setAttemptState(
    billing.id,
    payment.status === "authorized" ? "authorized" : "initiated",
    payment.id,
    new Date(Date.now() + RECONCILE_RETRY_MS),
  );
  await markPastDue(sub);
  return "pending" as const;
}

async function submitAttempt(sub: DueSubscription, billing: RenewalAttempt) {
  const claimed = await claimAttemptForProviderSubmission(sub, billing);
  if (!claimed) return "stale" as const;

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
    // Moyasar documents `given_id` as the created payment ID and as its idempotency
    // key. Persisting it here lets a later run fetch/retry the exact same operation
    // without ever inventing a second charge.
    await markAmbiguous(billing.id, billing.providerGivenId);
    await markPastDue(sub);
    return "pending" as const;
  }
}

async function processSubscription(sub: DueSubscription) {
  const latest = await latestAttempt(sub.id);
  if (latest?.status === "paid") return;

  if (latest && ["initiated", "authorized"].includes(latest.status)) {
    if (latest.nextRetryAt && latest.nextRetryAt.getTime() > Date.now()) {
      await markPastDue(sub);
      return;
    }

    const providerPaymentId = latest.providerPaymentId || latest.providerGivenId;
    try {
      const payment = await fetchMoyasarPayment(providerPaymentId);
      const resolved = await resolveProviderState(sub, latest, payment);
      if (resolved === "done" || resolved === "pending") return;
    } catch (error) {
      console.error("[billing-renewal] reconciliation_failed", {
        subscriptionId: sub.id,
        attempt: latest.attempt,
        error: error instanceof Error ? error.message : "unknown",
      });
      // Retrying POST with the exact same given_id is provider-supported idempotent
      // recovery. claimAttemptForProviderSubmission re-checks cancellation and account
      // eligibility before another provider call can occur.
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
  const nextAttempt = await createAttempt(sub, attempt);
  if (!nextAttempt) return;
  await submitAttempt(sub, nextAttempt);
}

async function main() {
  if (String(process.env.BILLING_RENEWAL_ENABLED ?? "").trim().toLowerCase() !== "true") {
    throw new Error("BILLING_RENEWAL_ENABLED must be true");
  }
  if (String(process.env.PAYMENT_PROVIDER ?? "").trim().toLowerCase() !== "moyasar") {
    throw new Error("PAYMENT_PROVIDER must be moyasar");
  }
  required("MOYASAR_SECRET_KEY");
  required("BILLING_TOKEN_ENCRYPTION_KEY");
  if (!paidBillingTaxReady()) throw new Error("BILLING_TAX_CONFIGURATION_NOT_READY");

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