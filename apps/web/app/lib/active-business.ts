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

export async function getActiveBusinessWithPlanForUser(userId: string) {
  const requestedId = await requestedBusinessId();
  if (requestedId) {
    const requested = await db.business.findFirst({
      where: { id: requestedId, ownerId: userId, deletedAt: null },
      include: { plan: true },
    });
    if (requested) return requested;
  }

  return db.business.findFirst({
    where: { ownerId: userId, deletedAt: null },
    include: { plan: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}

export async function getOwnedBusinessSummaries(userId: string) {
  return db.business.findMany({
    where: { ownerId: userId, deletedAt: null },
    select: { id: true, name: true, slug: true, isPublished: true, createdAt: true },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
}
