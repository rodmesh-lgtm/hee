import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";

export function activeSubscriptionWhere(businessId: string, now = new Date()): Prisma.SubscriptionWhereInput {
  return {
    businessId,
    status: "active",
    startsAt: { lte: now },
    OR: [
      { provider: { not: "access_code" }, endsAt: { gt: now } },
      {
        provider: "access_code",
        autoRenew: false,
        endsAt: null,
        accessGrants: {
          some: {
            businessId,
            revokedAt: null,
            // Expiration limits redemption, not an already issued grant.
            code: { isActive: true, revokedAt: null },
          },
        },
      },
    ],
  };
}

export async function getEffectiveSubscription(input: { businessId: string; database?: PrismaClient | Prisma.TransactionClient; now?: Date; paidPlansOnly?: boolean }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const subscriptions = await database.subscription.findMany({
    where: {
      ...activeSubscriptionWhere(input.businessId, now),
      ...(input.paidPlansOnly === false ? {} : { plan: { code: { in: ["BUSINESS", "PRO"] } } }),
    },
    include: {
      plan: true,
      accessGrants: {
        where: { businessId: input.businessId, revokedAt: null, code: { isActive: true, revokedAt: null } },
        include: { code: true },
      },
    },
    orderBy: [{ startsAt: "desc" }, { id: "desc" }],
  });
  return subscriptions.find((subscription) => subscription.provider !== "access_code"
    || subscription.accessGrants.some((grant) => grant.planId === subscription.planId && grant.code.planId === subscription.planId)) ?? null;
}

export async function hasActiveBusinessSubscription(input: { businessId: string; database?: PrismaClient; now?: Date }) {
  // Booking/transaction eligibility historically accepts a valid internal term;
  // it must not be confused with unlocking the paid-plan feature catalog.
  return Boolean(await getEffectiveSubscription({ ...input, paidPlansOnly: false }));
}
