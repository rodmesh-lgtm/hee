import "server-only";

import type { PrismaClient } from "@prisma/client";
import { db } from "../db";
import { getPlanEntitlements } from "../plan-entitlements";

export const WHATSAPP_MARKETING_FEATURE = "whatsapp_marketing" as const;
export const WHATSAPP_MARKETING_LABEL = "WhatsApp Marketing" as const;

export function planHasWhatsAppMarketing(code?: string | null) {
  return getPlanEntitlements(code).whatsappMarketing;
}

export async function hasActiveWhatsAppMarketingEntitlement(input: { businessId: string; database?: PrismaClient; now?: Date }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const business = await database.business.findFirst({
    where: { id: input.businessId, deletedAt: null },
    select: {
      subscriptions: {
        where: {
          status: "active",
          OR: [
            { provider: { not: "access_code" }, endsAt: { gt: now } },
            { provider: "access_code", autoRenew: false, endsAt: null, accessGrants: { some: { businessId: input.businessId, revokedAt: null, code: { isActive: true, revokedAt: null } } } },
          ],
        },
        select: {
          plan: { select: { code: true } },
          provider: true,
          accessGrants: {
            where: { businessId: input.businessId, revokedAt: null, code: { isActive: true, revokedAt: null } },
            select: { code: { select: { whatsappMarketingEnabled: true } } },
            take: 1,
          },
        },
        take: 2,
      },
    },
  });
  if (!business) return false;
  return business.subscriptions.some((subscription) =>
    planHasWhatsAppMarketing(subscription.plan.code)
    || (subscription.provider === "access_code" && subscription.accessGrants.some((grant) => grant.code.whatsappMarketingEnabled)),
  );
}

export async function assertActiveWhatsAppMarketingEntitlement(input: { businessId: string; database?: PrismaClient; now?: Date }) {
  if (!await hasActiveWhatsAppMarketingEntitlement(input)) throw new Error("WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED");
}
