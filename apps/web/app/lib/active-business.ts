import "server-only";

import { cookies } from "next/headers";
import { db } from "./db";

export const ACTIVE_BUSINESS_COOKIE = "hee_active_business";

async function requestedBusinessId() {
  const jar = await cookies();
  const value = jar.get(ACTIVE_BUSINESS_COOKIE)?.value?.trim();
  return value || null;
}

export async function getActiveBusinessForUser(userId: string) {
  const requestedId = await requestedBusinessId();
  if (requestedId) {
    const requested = await db.business.findFirst({
      where: { id: requestedId, ownerId: userId, deletedAt: null },
    });
    if (requested) return requested;
  }

  return db.business.findFirst({
    where: { ownerId: userId, deletedAt: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

async function withEffectivePlan<T extends { id: string; plan: { id: string; code: string } | null }>(business: T | null) {
  if (!business?.plan || business.plan.code === "FREE") return business;

  const now = new Date();
  const activePaidEntitlement = await db.subscription.findFirst({
    where: {
      businessId: business.id,
      planId: business.plan.id,
      status: "active",
      endsAt: { gt: now },
    },
    select: { id: true },
  });
  if (activePaidEntitlement) return business;

  // Billing workers reconcile the persisted Business.planId, but runtime authorization
  // must not depend on a worker being healthy at the exact expiry second. Fail closed
  // to FREE in memory so premium writes stop immediately if the paid period has ended.
  const freePlan = await db.businessPlan.findUnique({ where: { code: "FREE" } });
  if (!freePlan) throw new Error("FREE_PLAN_MISSING");
  return { ...business, plan: freePlan };
}

export async function getActiveBusinessWithPlanForUser(userId: string) {
  const requestedId = await requestedBusinessId();
  if (requestedId) {
    const requested = await db.business.findFirst({
      where: { id: requestedId, ownerId: userId, deletedAt: null },
      include: { plan: true },
    });
    if (requested) return withEffectivePlan(requested);
  }

  const first = await db.business.findFirst({
    where: { ownerId: userId, deletedAt: null },
    include: { plan: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return withEffectivePlan(first);
}

export async function getOwnedBusinessSummaries(userId: string) {
  return db.business.findMany({
    where: { ownerId: userId, deletedAt: null },
    select: { id: true, name: true, slug: true, isPublished: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}
