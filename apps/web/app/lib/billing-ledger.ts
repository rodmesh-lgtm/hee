import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { receiptSnapshot } from "./billing-tax";
import { encryptProviderToken, maskedLast4, type MoyasarPayment } from "./moyasar";
import { getPlanRank, normalizePlanCode } from "./plan-entitlements";

export type BillingPaymentRow = {
  id: string;
  businessId: string;
  planId: string;
  subscriptionId: string | null;
  provider: string;
  providerPaymentId: string | null;
  providerGivenId: string;
  kind: "initial" | "renewal" | "upgrade";
  amount: number;
  currency: string;
  status: string;
  attempt: number;
  nextRetryAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  receiptSellerLegalName: string | null;
  receiptSellerAddress: string | null;
  receiptTaxStatus: string | null;
  receiptNetAmount: number | null;
  receiptVatAmount: number | null;
  receiptIssuedAt: Date | null;
};

type SubscriptionBillingState = {
  id: string;
  planId: string;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  paymentMethodId: string | null;
  autoRenew: boolean;
};

const ABANDONED_CHECKOUT_MS = 60 * 60 * 1000;

function billingBusinessLockKey(businessId: string) {
  return `billing-business:${businessId}`;
}

function addMonth(value: Date) {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  const target = new Date(Date.UTC(
    year,
    month + 1,
    1,
    value.getUTCHours(),
    value.getUTCMinutes(),
    value.getUTCSeconds(),
    value.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

function proratedUpgradeAmount(input: {
  currentMonthlySar: number;
  targetMonthlySar: number;
  startsAt: Date;
  endsAt: Date;
  now: Date;
}) {
  const deltaHalalas = Math.max(0, input.targetMonthlySar - input.currentMonthlySar) * 100;
  if (!deltaHalalas) return 0;
  const periodMs = Math.max(1, input.endsAt.getTime() - input.startsAt.getTime());
  const remainingMs = Math.max(0, input.endsAt.getTime() - input.now.getTime());
  return Math.max(100, Math.round(deltaHalalas * Math.min(1, remainingMs / periodMs)));
}

export async function createBillingIntent(userId: string, businessId: string, requestedCode: string) {
  const requestedPlan = normalizePlanCode(requestedCode);
  if (requestedPlan === "FREE") throw new Error("INVALID_PAID_PLAN");

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${billingBusinessLockKey(businessId)}))`;
    const business = await tx.business.findFirst({
      where: { id: businessId, ownerId: userId, deletedAt: null },
      include: { plan: true },
    });
    if (!business) throw new Error("BUSINESS_NOT_FOUND");

    const currentCode = normalizePlanCode(business.plan?.code);
    if (getPlanRank(requestedPlan) <= getPlanRank(currentCode)) throw new Error("PLAN_NOT_AN_UPGRADE");

    const target = await tx.businessPlan.findUnique({ where: { code: requestedPlan } });
    if (!target?.isActive || target.monthlyPrice <= 0) throw new Error("PLAN_UNAVAILABLE");

    const now = new Date();
    const currentSubscription = await tx.subscription.findFirst({
      where: { businessId, status: "active", endsAt: { gt: now } },
      include: { plan: true },
      orderBy: { startsAt: "desc" },
    });

    const abandonedBefore = new Date(now.getTime() - ABANDONED_CHECKOUT_MS);
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "status"='canceled', "updatedAt"=CURRENT_TIMESTAMP
      WHERE "businessId"=${businessId}
        AND "kind" IN ('initial','upgrade')
        AND "status"='created'
        AND "providerPaymentId" IS NULL
        AND "createdAt" <= ${abandonedBefore}
    `;

    const open = await tx.$queryRaw<BillingPaymentRow[]>`
      SELECT *
      FROM "BillingPayment"
      WHERE "businessId"=${businessId}
        AND "kind" IN ('initial','upgrade')
        AND "status" IN ('created','initiated','authorized')
      ORDER BY "createdAt" DESC
      LIMIT 1
      FOR UPDATE
    `;
    if (open[0]) {
      if (open[0].planId !== target.id) throw new Error("OTHER_CHECKOUT_PENDING");
      return { payment: open[0], plan: target, currentSubscription };
    }

    let amount = target.monthlyPrice * 100;
    let kind: BillingPaymentRow["kind"] = "initial";
    if (currentSubscription?.endsAt && currentCode !== "FREE") {
      const prorated = proratedUpgradeAmount({
        currentMonthlySar: currentSubscription.plan.monthlyPrice,
        targetMonthlySar: target.monthlyPrice,
        startsAt: currentSubscription.startsAt,
        endsAt: currentSubscription.endsAt,
        now,
      });
      if (prorated > 0) amount = prorated;
      kind = "upgrade";
    }

    const id = randomUUID();
    const providerGivenId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO "BillingPayment"
        ("id","businessId","planId","provider","providerGivenId","kind","amount","currency","status","attempt","createdAt","updatedAt")
      VALUES
        (${id},${businessId},${target.id},'moyasar',${providerGivenId},${kind},${amount},'SAR','created',1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
    `;
    const rows = await tx.$queryRaw<BillingPaymentRow[]>`SELECT * FROM "BillingPayment" WHERE "id"=${id}`;
    return { payment: rows[0], plan: target, currentSubscription };
  });
}

export async function getBillingPaymentById(billingId: string) {
  const rows = await db.$queryRaw<BillingPaymentRow[]>`
    SELECT * FROM "BillingPayment" WHERE "id"=${billingId} LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function getOwnedBillingPayment(userId: string, billingId: string) {
  const rows = await db.$queryRaw<Array<BillingPaymentRow & {
    planCode: string;
    planName: string;
    monthlyPrice: number;
    ownerId: string;
  }>>`
    SELECT bp.*, p."code" AS "planCode", p."name" AS "planName", p."monthlyPrice", b."ownerId"
    FROM "BillingPayment" bp
    JOIN "Business" b ON b."id"=bp."businessId"
    JOIN "BusinessPlan" p ON p."id"=bp."planId"
    WHERE bp."id"=${billingId} AND b."ownerId"=${userId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findBillingPaymentByProviderId(providerPaymentId: string) {
  const rows = await db.$queryRaw<BillingPaymentRow[]>`
    SELECT * FROM "BillingPayment" WHERE "providerPaymentId"=${providerPaymentId} LIMIT 1
  `;
  return rows[0] ?? null;
}

async function savePaymentMethod(
  tx: Prisma.TransactionClient,
  billing: BillingPaymentRow,
  payment: MoyasarPayment,
) {
  const token = String(payment.source?.token ?? "").trim();
  if (!token) return null;

  const encryptedToken = encryptProviderToken(token);
  const brand = String(payment.source?.company ?? "").slice(0, 32) || null;
  const last4 = maskedLast4(payment.source);

  await tx.$executeRaw`
    UPDATE "BillingPaymentMethod"
    SET "status"='revoked', "updatedAt"=CURRENT_TIMESTAMP
    WHERE "businessId"=${billing.businessId} AND "provider"='moyasar' AND "status"='active'
  `;

  const id = randomUUID();
  await tx.$executeRaw`
    INSERT INTO "BillingPaymentMethod"
      ("id","businessId","provider","encryptedToken","brand","last4","status","createdAt","updatedAt")
    VALUES
      (${id},${billing.businessId},'moyasar',${encryptedToken},${brand},${last4},'active',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
  `;
  return id;
}

async function activeSubscriptionBillingState(tx: Prisma.TransactionClient, businessId: string) {
  const rows = await tx.$queryRaw<SubscriptionBillingState[]>`
    SELECT "id","planId","status","startsAt","endsAt","paymentMethodId","autoRenew"
    FROM "Subscription"
    WHERE "businessId"=${businessId} AND "status"='active'
    ORDER BY "startsAt" DESC
    LIMIT 1
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

async function renewableSubscriptionBillingState(
  tx: Prisma.TransactionClient,
  businessId: string,
  subscriptionId: string,
) {
  const rows = await tx.$queryRaw<SubscriptionBillingState[]>`
    SELECT "id","planId","status","startsAt","endsAt","paymentMethodId","autoRenew"
    FROM "Subscription"
    WHERE "id"=${subscriptionId}
      AND "businessId"=${businessId}
      AND "status" IN ('active','past_due')
    LIMIT 1
    FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function activateVerifiedMoyasarPayment(billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    const identity = await tx.$queryRaw<Array<{ businessId: string }>>`
      SELECT "businessId" FROM "BillingPayment" WHERE "id"=${billingId} LIMIT 1
    `;
    if (!identity[0]) return "missing" as const;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${billingBusinessLockKey(identity[0].businessId)}))`;
    const rows = await tx.$queryRaw<BillingPaymentRow[]>`
      SELECT * FROM "BillingPayment" WHERE "id"=${billingId} FOR UPDATE
    `;
    const billing = rows[0];
    if (!billing) return "missing" as const;
    if (billing.provider !== "moyasar") return "wrong-provider" as const;
    if (payment.status !== "paid" || payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;
    if (String(payment.metadata?.hee_billing_id ?? "") !== billing.id || String(payment.metadata?.hee_business_id ?? "") !== billing.businessId) return "mismatch" as const;
    if (billing.providerPaymentId && billing.providerPaymentId !== payment.id) return "provider-payment-mismatch" as const;
    if (billing.status === "paid") return "already-paid" as const;
    if (["refunded", "voided", "canceled"].includes(billing.status)) return "terminal-state" as const;

    // Re-prove the complete paid target after taking the business billing lock. Row locks
    // keep a concurrent soft-delete, email-verification reset or plan disable from racing
    // between this eligibility decision and the entitlement/ledger commit below.
    const eligibleTargets = await tx.$queryRaw<Array<{ businessId: string; planId: string }>>`
      SELECT b."id" AS "businessId", p."id" AS "planId"
      FROM "Business" b
      JOIN "User" u ON u."id" = b."ownerId"
      JOIN "BusinessPlan" p ON p."id" = ${billing.planId} AND p."isActive" = true
      WHERE b."id" = ${billing.businessId}
        AND b."deletedAt" IS NULL
        AND u."deletedAt" IS NULL
        AND u."emailVerifiedAt" IS NOT NULL
      FOR KEY SHARE OF b, u, p
    `;
    const target = eligibleTargets[0];
    if (!target) return "ineligible-target" as const;

    const now = new Date();
    const active = await activeSubscriptionBillingState(tx, target.businessId);
    let paymentMethodId: string | null;
    let periodEnd: Date;
    let autoRenew: boolean;

    if (billing.kind === "renewal") {
      // Renewal requests are claimed as `initiated` before leaving HEE for Moyasar.
      // If the owner cancels while that provider request is in flight, the already-paid
      // period must still be granted, but the *next* period must not auto-renew.
      if (billing.status === "created" || !billing.subscriptionId) return "stale-renewal" as const;
      const baseSubscription = await renewableSubscriptionBillingState(tx, target.businessId, billing.subscriptionId);
      if (!baseSubscription) return "stale-renewal" as const;

      paymentMethodId = baseSubscription.paymentMethodId;
      autoRenew = Boolean(baseSubscription.autoRenew && paymentMethodId);
      const periodBase = baseSubscription.endsAt && baseSubscription.endsAt > now ? baseSubscription.endsAt : now;
      periodEnd = addMonth(periodBase);
    } else {
      paymentMethodId = await savePaymentMethod(tx, billing, payment);
      autoRenew = Boolean(paymentMethodId);
      periodEnd = billing.kind === "upgrade" && active?.endsAt && active.endsAt > now
        ? active.endsAt
        : addMonth(now);
    }

    const receipt = receiptSnapshot(billing.id, billing.amount);

    await tx.$executeRaw`
      UPDATE "Subscription"
      SET "status"='replaced', "autoRenew"=false, "updatedAt"=CURRENT_TIMESTAMP
      WHERE "businessId"=${target.businessId} AND "status" IN ('active','past_due')
    `;

    const subscriptionId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO "Subscription"
        ("id","businessId","planId","status","startsAt","endsAt","createdAt","updatedAt","autoRenew","provider","providerReference","paymentMethodId")
      VALUES
        (${subscriptionId},${target.businessId},${target.planId},'active',${now},${periodEnd},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,${autoRenew},'moyasar',${payment.id},${paymentMethodId})
    `;

    await tx.business.update({ where: { id: target.businessId }, data: { planId: target.planId } });
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId"=${payment.id},
          "subscriptionId"=${subscriptionId},
          "status"='paid',
          "paidAt"=CURRENT_TIMESTAMP,
          "nextRetryAt"=NULL,
          "receiptSellerLegalName"=${receipt.sellerLegalName},
          "receiptSellerAddress"=${receipt.sellerAddress},
          "receiptTaxStatus"=${receipt.taxStatus},
          "receiptNetAmount"=${receipt.netAmount},
          "receiptVatAmount"=${receipt.vatAmount},
          "receiptIssuedAt"=${receipt.issuedAt},
          "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${billing.id} AND "status" IN ('created','initiated','authorized','failed')
    `;

    return "activated" as const;
  });
}

export async function handleRefundedMoyasarPayment(billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    const identity = await tx.$queryRaw<Array<{ businessId: string }>>`
      SELECT "businessId" FROM "BillingPayment" WHERE "id"=${billingId} LIMIT 1
    `;
    if (!identity[0]) return "missing" as const;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${billingBusinessLockKey(identity[0].businessId)}))`;
    const rows = await tx.$queryRaw<BillingPaymentRow[]>`
      SELECT * FROM "BillingPayment" WHERE "id"=${billingId} FOR UPDATE
    `;
    const billing = rows[0];
    if (!billing) return "missing" as const;
    if (payment.status !== "refunded") return "wrong-status" as const;
    if (billing.providerPaymentId && billing.providerPaymentId !== payment.id) return "mismatch" as const;
    if (payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;
    if (String(payment.metadata?.hee_billing_id ?? "") !== billing.id || String(payment.metadata?.hee_business_id ?? "") !== billing.businessId) return "mismatch" as const;

    const active = await activeSubscriptionBillingState(tx, billing.businessId);
    const paidSubscriptionMatches = Boolean(active && billing.subscriptionId && active.id === billing.subscriptionId);

    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId"=${payment.id}, "status"='refunded', "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${billing.id}
    `;

    if (billing.status === "paid" && active && paidSubscriptionMatches) {
      const now = new Date();
      await tx.$executeRaw`
        UPDATE "Subscription"
        SET "status"='canceled', "autoRenew"=false,
            "endsAt"=LEAST(COALESCE("endsAt",CURRENT_TIMESTAMP),CURRENT_TIMESTAMP),
            "updatedAt"=CURRENT_TIMESTAMP
        WHERE "id"=${active.id} AND "status"='active'
      `;

      const prior = await tx.$queryRaw<Array<{ id: string; planId: string }>>`
        SELECT s."id", s."planId"
        FROM "Subscription" s
        JOIN "BillingPayment" bp
          ON bp."subscriptionId"=s."id"
         AND bp."businessId"=s."businessId"
         AND bp."status"='paid'
        WHERE s."businessId"=${billing.businessId}
          AND s."status"='replaced'
          AND s."endsAt">${now}
          AND s."id"<>${active.id}
        ORDER BY s."startsAt" DESC
        LIMIT 1
        FOR UPDATE OF s
      `;

      if (prior[0]) {
        await tx.$executeRaw`
          UPDATE "Subscription"
          SET "status"='active', "autoRenew"=false, "updatedAt"=CURRENT_TIMESTAMP
          WHERE "id"=${prior[0].id} AND "status"='replaced'
        `;
        await tx.business.updateMany({
          where: { id: billing.businessId, deletedAt: null },
          data: { planId: prior[0].planId },
        });
      } else {
        const free = await tx.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
        if (!free) throw new Error("FREE_PLAN_MISSING");
        await tx.business.updateMany({
          where: { id: billing.businessId, deletedAt: null },
          data: { planId: free.id },
        });
      }
    }

    return "refunded" as const;
  });
}

export async function markBillingPaymentState(billingId: string, payment: MoyasarPayment) {
  if (payment.status === "refunded") return handleRefundedMoyasarPayment(billingId, payment);

  const allowed = new Set(["initiated", "failed", "voided", "authorized"]);
  const status = allowed.has(payment.status) ? payment.status : "failed";

  return db.$transaction(async (tx) => {
    const identity = await tx.$queryRaw<Array<{ businessId: string }>>`
      SELECT "businessId" FROM "BillingPayment" WHERE "id"=${billingId} LIMIT 1
    `;
    if (!identity[0]) return status;

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${billingBusinessLockKey(identity[0].businessId)}))`;
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId"=COALESCE("providerPaymentId",${payment.id}),
          "status"=${status},
          "updatedAt"=CURRENT_TIMESTAMP
      WHERE "id"=${billingId} AND "status" IN ('created','initiated','authorized','failed')
    `;
    return status;
  });
}
