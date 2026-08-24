import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";

export function normalizeAccessCode(raw: unknown) {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z0-9-]{8,64}$/.test(value)) return null;
  return value;
}

export function accessCodeHash(code: string) {
  return createHash("sha256").update(`hee-subscription-access-v1:${code}`).digest("hex");
}

export async function redeemSubscriptionAccessCode(userId: string, businessId: string, rawCode: unknown) {
  const code = normalizeAccessCode(rawCode);
  if (!code) return "invalid" as const;
  const hash = accessCodeHash(code);

  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`subscription-access:${hash}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-business:${businessId}`}))`;

    const business = await tx.business.findFirst({ where: { id: businessId, ownerId: userId, deletedAt: null }, select: { id: true } });
    if (!business) return "missing-business" as const;

    const rows = await tx.$queryRaw<Array<{ id:string; planId:string; isActive:boolean; maxRedemptions:number|null; redemptionCount:number; expiresAt:Date|null }>>`
      SELECT "id","planId","isActive","maxRedemptions","redemptionCount","expiresAt"
      FROM "SubscriptionAccessCode" WHERE "codeHash"=${hash} LIMIT 1 FOR UPDATE
    `;
    const access = rows[0];
    const now = new Date();
    if (!access || !access.isActive || (access.expiresAt && access.expiresAt <= now)) return "invalid" as const;
    if (access.maxRedemptions !== null && access.redemptionCount >= access.maxRedemptions) return "exhausted" as const;

    const plan = await tx.businessPlan.findFirst({ where: { id: access.planId, isActive: true }, select: { id: true } });
    if (!plan) return "unavailable" as const;
    const prior = await tx.subscriptionAccessGrant.findUnique({ where: { codeId_businessId: { codeId: access.id, businessId } }, select: { revokedAt: true } });
    if (prior && !prior.revokedAt) return "already-active" as const;
    if (prior?.revokedAt) return "revoked" as const;

    await tx.subscription.updateMany({ where: { businessId, status: { in: ["active", "past_due"] } }, data: { status: "replaced", autoRenew: false } });
    const subscription = await tx.subscription.create({ data: { businessId, planId: plan.id, status: "active", provider: "access_code", providerReference: access.id, autoRenew: false, endsAt: null } });
    await tx.business.update({ where: { id: businessId }, data: { planId: plan.id } });
    await tx.subscriptionAccessGrant.create({ data: { codeId: access.id, businessId, planId: plan.id, subscriptionId: subscription.id, redeemedByUserId: userId } });
    await tx.subscriptionAccessCode.update({ where: { id: access.id }, data: { redemptionCount: { increment: 1 } } });
    await tx.analyticsEvent.create({ data: { businessId, eventType: "subscription_access_code_redeemed", metadata: { codeId: access.id, planId: plan.id } } });
    return "activated" as const;
  });
}
