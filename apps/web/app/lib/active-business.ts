import "server-only";

import { cookies, headers } from "next/headers";
import { db } from "./db";
import { getEffectiveSubscription } from "./subscription-entitlement";
import { memberCanAccess, type StaffSection } from "./staff-permissions";

export const ACTIVE_BUSINESS_COOKIE = "hee_active_business";
const WORKSPACE_BUSINESS_COOKIE = "infro_workspace_business";

// A navigation preference, never an authorization credential. Every read below
// independently verifies ownership/membership. Share it so canonical integration
// callbacks resolve the same selected business as the customer hub.
export async function syncWorkspaceBusinessPreference(businessId?: string) {
  const host = (await headers()).get("host")?.split(":")[0];
  if (host !== "ir.sa" && host !== "www.ir.sa" && host !== "hub.ir.sa") return;
  const jar = await cookies();
  const value = businessId ?? jar.get(WORKSPACE_BUSINESS_COOKIE)?.value ?? jar.get(ACTIVE_BUSINESS_COOKIE)?.value;
  if (value) jar.set(WORKSPACE_BUSINESS_COOKIE, value, { domain: "ir.sa", path: "/", secure: true, httpOnly: true, sameSite: "lax", maxAge: 365 * 86400 });
}

async function requestedBusinessId() {
  const jar = await cookies();
  const value = (jar.get(WORKSPACE_BUSINESS_COOKIE)?.value ?? jar.get(ACTIVE_BUSINESS_COOKIE)?.value)?.trim();
  return value || null;
}

export async function getActiveBusinessForUser(userId: string, section?: StaffSection) {
  if (section) {
    const business = await getDashboardBusinessForUser(userId);
    return business && (business.ownerId === userId || memberCanAccess(business.members[0]?.permissions, section)) ? business : null;
  }
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
  if (!business) return business;
  const activeEntitlement = await getEffectiveSubscription({ businessId: business.id });
  if (activeEntitlement) return { ...business, plan: activeEntitlement.plan };

  // runtime authorization never trusts Business.planId on its own. Paid provider terms
  // require an unexpired finite period; administrative access-code terms require an
  // active grant whose code has not been revoked. If neither lineage exists, fail closed.
  const freePlan = await db.businessPlan.findUnique({ where: { code: "FREE" } });
  if (!freePlan) throw new Error("FREE_PLAN_MISSING");
  return { ...business, plan: freePlan };
}

export async function getActiveBusinessWithPlanForUser(userId: string, section?: StaffSection) {
  if (section) {
    const allowed = await getActiveBusinessForUser(userId, section);
    if (!allowed) return null;
    return withEffectivePlan(await db.business.findUnique({ where: { id: allowed.id }, include: { plan: true } }));
  }
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

/** Navigation context only. Mutations and section reads must check an explicit section. */
export async function getDashboardBusinessForUser(userId: string) {
  const requestedId = await requestedBusinessId();
  const include = { members: { where: { userId, status: "active" }, select: { id: true, role: true, permissions: true }, take: 1 } } as const;
  const access = { OR: [{ ownerId: userId }, { members: { some: { userId, status: "active" } } }] };
  if (requestedId) {
    const selected = await db.business.findFirst({ where: { id: requestedId, deletedAt: null, ...access }, include });
    if (selected) return selected;
  }
  const owned = await db.business.findFirst({ where: { ownerId: userId, deletedAt: null }, include, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
  return owned ?? db.business.findFirst({ where: { deletedAt: null, members: { some: { userId, status: "active" } } }, include, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
}

export async function getDashboardBusinessSummaries(userId: string) {
  return db.business.findMany({ where: { deletedAt: null, OR: [{ ownerId: userId }, { members: { some: { userId, status: "active" } } }] }, select: { id: true, name: true, slug: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });
}
