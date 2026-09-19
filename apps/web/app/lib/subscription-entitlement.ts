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
            code: { isActive: true, revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          },
        },
      },
    ],
  };
}

export async function hasActiveBusinessSubscription(input: { businessId: string; database?: PrismaClient; now?: Date }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return Boolean(await database.subscription.findFirst({
    where: activeSubscriptionWhere(input.businessId, now),
    select: { id: true },
  }));
}
