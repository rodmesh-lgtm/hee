import "server-only";

import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
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
};

type SubscriptionBillingState = {
  id: string;
  endsAt: Date | null;
  paymentMethodId: string | null;
  autoRenew: boolean;
};

function addMonth(value: Date) {
  const year = value.getUTCFullYear();
  const month = value.getUTCMonth();
  const day = value.getUTCDate();
  const target = new Date(Date.UTC(year, month + 1, 1, value.getUTCHours(), value.getUTCMinutes(), value.getUTCSeconds(), value.getUTCMilliseconds()));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

function proratedUpgradeAmount(input: { currentMonthlySar: number; targetMonthlySar: number; startsAt: Date; endsAt: Date; now: Date }) {
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
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-intent:${businessId}`}))`;
    const business = await tx.business.findFirst({ where: { id: businessId, ownerId: userId, deletedAt: null }, include: { plan: true } });
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

    const open = await tx.$queryRaw<BillingPaymentRow[]>`
      SELECT * FROM "BillingPayment"
      WHERE "businessId" = ${businessId}
        AND "kind" IN ('initial','upgrade')
        AND "status" IN ('created','initiated')
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
      INSERT INTO "BillingPayment" (
        "id", "businessId", "planId", "provider", "providerGivenId", "kind",
        "amount", "currency", "status", "attempt", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${businessId}, ${target.id}, 'moyasar', ${providerGivenId}, ${kind},
        ${amount}, 'SAR', 'created', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
    `;
    const rows = await tx.$queryRaw<BillingPaymentRow[]>`SELECT * FROM "BillingPayment" WHERE "id" = ${id}`;
    return { payment: rows[0], plan: target, currentSubscription };
  });
}

export async function getBillingPaymentById(billingId: string) {
  const rows = await db.$queryRaw<BillingPaymentRow[]>`SELECT * FROM "BillingPayment" WHERE "id" = ${billingId} LIMIT 1`;
  return rows[0] ?? null;
}

export async function getOwnedBillingPayment(userId: string, billingId: string) {
  const rows = await db.$queryRaw<Array<BillingPaymentRow & { planCode: string; planName: string; monthlyPrice: number; ownerId: string }>>`
    SELECT bp.*, p."code" AS "planCode", p."name" AS "planName", p."monthlyPrice", b."ownerId"
    FROM "BillingPayment" bp
    JOIN "Business" b ON b."id" = bp."businessId"
    JOIN "BusinessPlan" p ON p."id" = bp."planId"
    WHERE bp."id" = ${billingId} AND b."ownerId" = ${userId} AND b."deletedAt" IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findBillingPaymentByProviderId(providerPaymentId: string) {
  const rows = await db.$queryRaw<BillingPaymentRow[]>`SELECT * FROM "BillingPayment" WHERE "providerPaymentId" = ${providerPaymentId} LIMIT 1`;
  return rows[0] ?? null;
}

async function savePaymentMethod(tx: Prisma.TransactionClient, billing: BillingPaymentRow, payment: MoyasarPayment) {
  const token = String(payment.source?.token ?? "").trim();
  if (!token) return null;
  const encryptedToken = encryptProviderToken(token);
  const brand = String(payment.source?.company ?? "").slice(0, 32) || null;
  const last4 = maskedLast4(payment.source);
  await tx.$executeRaw`
    UPDATE "BillingPaymentMethod" SET "status" = 'revoked', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "businessId" = ${billing.businessId} AND "provider" = 'moyasar' AND "status" = 'active'
  `;
  const id = randomUUID();
  await tx.$executeRaw`
    INSERT INTO "BillingPaymentMethod" ("id", "businessId", "provider", "encryptedToken", "brand", "last4", "status", "createdAt", "updatedAt")
    VALUES (${id}, ${billing.businessId}, 'moyasar', ${encryptedToken}, ${brand}, ${last4}, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;
  return id;
}

async function activeSubscriptionBillingState(tx: Prisma.TransactionClient, businessId: string) {
  const rows = await tx.$queryRaw<SubscriptionBillingState[]>`
    SELECT "id", "endsAt", "paymentMethodId", "autoRenew"
    FROM "Subscription"
    WHERE "businessId" = ${businessId} AND "status" = 'active'
    ORDER BY "startsAt" DESC LIMIT 1 FOR UPDATE
  `;
  return rows[0] ?? null;
}

export async function activateVerifiedMoyasarPayment(billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-payment:${billingId}`}))`;
    const rows = await tx.$queryRaw<BillingPaymentRow[]>`SELECT * FROM "BillingPayment" WHERE "id" = ${billingId} FOR UPDATE`;
    const billing = rows[0];
    if (!billing) return "missing" as const;
    if (billing.status === "paid") return "already-paid" as const;
    if (billing.provider !== "moyasar") return "wrong-provider" as const;
    if (payment.status !== "paid" || payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;
    if (String(payment.metadata?.hee_billing_id ?? "") !== billing.id || String(payment.metadata?.hee_business_id ?? "") !== billing.businessId) return "mismatch" as const;

    const plan = await tx.businessPlan.findFirst({ where: { id: billing.planId, isActive: true } });
    const business = await tx.business.findFirst({ where: { id: billing.businessId, deletedAt: null } });
    if (!plan || !business) return "missing-target" as const;

    const now = new Date();
    const previous = await activeSubscriptionBillingState(tx, business.id);
    let paymentMethodId: string | null;
    let periodEnd: Date;
    let autoRenew: boolean;

    if (billing.kind === "renewal") {
      if (!previous || (billing.subscriptionId && previous.id !== billing.subscriptionId)) return "stale-renewal" as const;
      paymentMethodId = previous.paymentMethodId;
      autoRenew = Boolean(previous.autoRenew && paymentMethodId);
      const periodBase = previous.endsAt && previous.endsAt > now ? previous.endsAt : now;
      periodEnd = addMonth(periodBase);
    } else {
      paymentMethodId = await savePaymentMethod(tx, billing, payment);
      autoRenew = Boolean(paymentMethodId);
      periodEnd = billing.kind === "upgrade" && previous?.endsAt && previous.endsAt > now ? previous.endsAt : addMonth(now);
    }

    await tx.subscription.updateMany({ where: { businessId: business.id, status: "active" }, data: { status: "replaced", endsAt: now } });
    const subscriptionId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO "Subscription" (
        "id", "businessId", "planId", "status", "startsAt", "endsAt", "createdAt", "updatedAt",
        "autoRenew", "provider", "providerReference", "paymentMethodId"
      ) VALUES (
        ${subscriptionId}, ${business.id}, ${plan.id}, 'active', ${now}, ${periodEnd}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
        ${autoRenew}, 'moyasar', ${payment.id}, ${paymentMethodId}
      )
    `;
    await tx.business.update({ where: { id: business.id }, data: { planId: plan.id } });
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId" = ${payment.id},
          "subscriptionId" = CASE WHEN "kind" = 'renewal' THEN "subscriptionId" ELSE ${subscriptionId} END,
          "status" = 'paid', "paidAt" = CURRENT_TIMESTAMP, "nextRetryAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${billing.id}
    `;
    return "activated" as const;
  });
}

export async function handleRefundedMoyasarPayment(billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-refund:${billingId}`}))`;
    const rows = await tx.$queryRaw<BillingPaymentRow[]>`SELECT * FROM "BillingPayment" WHERE "id" = ${billingId} FOR UPDATE`;
    const billing = rows[0];
    if (!billing) return "missing" as const;
    if (billing.providerPaymentId && billing.providerPaymentId !== payment.id) return "mismatch" as const;
    if (payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;
    if (String(payment.metadata?.hee_billing_id ?? "") !== billing.id || String(payment.metadata?.hee_business_id ?? "") !== billing.businessId) return "mismatch" as const;

    await tx.$executeRaw`
      UPDATE "BillingPayment" SET "providerPaymentId" = ${payment.id}, "status" = 'refunded', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${billing.id}
    `;
    const active = await activeSubscriptionBillingState(tx, billing.businessId);
    const paidSubscriptionMatches = billing.kind === "renewal" ? active?.id !== undefined : active?.id === billing.subscriptionId;
    if (billing.status === "paid" && active && paidSubscriptionMatches) {
      await tx.$executeRaw`
        UPDATE "Subscription" SET "status" = 'canceled', "autoRenew" = false, "endsAt" = CURRENT_TIMESTAMP, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${active.id} AND "status" = 'active'
      `;
      const free = await tx.businessPlan.findUnique({ where: { code: "FREE" }, select: { id: true } });
      if (!free) throw new Error("FREE_PLAN_MISSING");
      await tx.business.updateMany({ where: { id: billing.businessId, deletedAt: null }, data: { planId: free.id } });
    }
    return "refunded" as const;
  });
}

export async function markBillingPaymentState(billingId: string, payment: MoyasarPayment) {
  if (payment.status === "refunded") return handleRefundedMoyasarPayment(billingId, payment);
  const allowed = new Set(["initiated", "failed", "voided", "authorized"]);
  const status = allowed.has(payment.status) ? payment.status : "failed";
  await db.$executeRaw`
    UPDATE "BillingPayment"
    SET "providerPaymentId" = COALESCE("providerPaymentId", ${payment.id}), "status" = ${status}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${billingId} AND "status" <> 'paid'
  `;
  return status;
}
