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

function addMonth(value: Date) {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
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
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-intent:${businessId}`}))`;
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

    const rows = await tx.$queryRaw<BillingPaymentRow[]>`
      SELECT * FROM "BillingPayment" WHERE "id" = ${id}
    `;
    return { payment: rows[0], plan: target, currentSubscription };
  });
}

export async function getOwnedBillingPayment(userId: string, billingId: string) {
  const rows = await db.$queryRaw<Array<BillingPaymentRow & { planCode: string; planName: string; monthlyPrice: number; ownerId: string }>>`
    SELECT bp.*, p."code" AS "planCode", p."name" AS "planName", p."monthlyPrice", b."ownerId"
    FROM "BillingPayment" bp
    JOIN "Business" b ON b."id" = bp."businessId"
    JOIN "BusinessPlan" p ON p."id" = bp."planId"
    WHERE bp."id" = ${billingId}
      AND b."ownerId" = ${userId}
      AND b."deletedAt" IS NULL
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findBillingPaymentByProviderId(providerPaymentId: string) {
  const rows = await db.$queryRaw<BillingPaymentRow[]>`
    SELECT * FROM "BillingPayment" WHERE "providerPaymentId" = ${providerPaymentId} LIMIT 1
  `;
  return rows[0] ?? null;
}

async function savePaymentMethod(tx: Prisma.TransactionClient, billing: BillingPaymentRow, payment: MoyasarPayment) {
  const token = String(payment.source?.token ?? "").trim();
  if (!token) return null;
  const encryptedToken = encryptProviderToken(token);
  const brand = String(payment.source?.company ?? "").slice(0, 32) || null;
  const last4 = maskedLast4(payment.source);

  await tx.$executeRaw`
    UPDATE "BillingPaymentMethod"
    SET "status" = 'revoked', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "businessId" = ${billing.businessId} AND "provider" = 'moyasar' AND "status" = 'active'
  `;
  const id = randomUUID();
  await tx.$executeRaw`
    INSERT INTO "BillingPaymentMethod" (
      "id", "businessId", "provider", "encryptedToken", "brand", "last4", "status", "createdAt", "updatedAt"
    ) VALUES (
      ${id}, ${billing.businessId}, 'moyasar', ${encryptedToken}, ${brand}, ${last4}, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    )
  `;
  return id;
}

export async function activateVerifiedMoyasarPayment(billingId: string, payment: MoyasarPayment) {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-payment:${billingId}`}))`;
    const rows = await tx.$queryRaw<BillingPaymentRow[]>`
      SELECT * FROM "BillingPayment" WHERE "id" = ${billingId} FOR UPDATE
    `;
    const billing = rows[0];
    if (!billing) return "missing" as const;
    if (billing.status === "paid") return "already-paid" as const;
    if (billing.provider !== "moyasar") return "wrong-provider" as const;
    if (payment.status !== "paid" || payment.amount !== billing.amount || payment.currency !== billing.currency) return "mismatch" as const;

    const metadataBillingId = String(payment.metadata?.hee_billing_id ?? "");
    const metadataBusinessId = String(payment.metadata?.hee_business_id ?? "");
    if (metadataBillingId && metadataBillingId !== billing.id) return "mismatch" as const;
    if (metadataBusinessId && metadataBusinessId !== billing.businessId) return "mismatch" as const;

    const plan = await tx.businessPlan.findFirst({ where: { id: billing.planId, isActive: true } });
    const business = await tx.business.findFirst({ where: { id: billing.businessId, deletedAt: null }, include: { plan: true } });
    if (!plan || !business) return "missing-target" as const;

    const now = new Date();
    const previousSubscription = await tx.subscription.findFirst({
      where: { businessId: business.id, status: "active" },
      orderBy: { startsAt: "desc" },
    });
    const periodEnd = billing.kind === "upgrade" && previousSubscription?.endsAt && previousSubscription.endsAt > now
      ? previousSubscription.endsAt
      : addMonth(now);

    const paymentMethodId = await savePaymentMethod(tx, billing, payment);

    await tx.subscription.updateMany({
      where: { businessId: business.id, status: "active" },
      data: { status: "replaced", endsAt: now },
    });

    const subscriptionId = randomUUID();
    await tx.$executeRaw`
      INSERT INTO "Subscription" (
        "id", "businessId", "planId", "status", "startsAt", "endsAt", "createdAt", "updatedAt",
        "autoRenew", "provider", "providerReference", "paymentMethodId"
      ) VALUES (
        ${subscriptionId}, ${business.id}, ${plan.id}, 'active', ${now}, ${periodEnd}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
        ${Boolean(paymentMethodId)}, 'moyasar', ${payment.id}, ${paymentMethodId}
      )
    `;

    await tx.business.update({ where: { id: business.id }, data: { planId: plan.id } });
    await tx.$executeRaw`
      UPDATE "BillingPayment"
      SET "providerPaymentId" = ${payment.id}, "subscriptionId" = ${subscriptionId}, "status" = 'paid',
          "paidAt" = CURRENT_TIMESTAMP, "nextRetryAt" = NULL, "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = ${billing.id}
    `;
    return "activated" as const;
  });
}

export async function markBillingPaymentState(billingId: string, payment: MoyasarPayment) {
  const allowed = new Set(["initiated", "failed", "refunded", "voided", "authorized"]);
  const status = allowed.has(payment.status) ? payment.status : "failed";
  await db.$executeRaw`
    UPDATE "BillingPayment"
    SET "providerPaymentId" = COALESCE("providerPaymentId", ${payment.id}),
        "status" = ${status}, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = ${billingId} AND "status" <> 'paid'
  `;
}
