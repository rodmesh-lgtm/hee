import "server-only";

import type { PrismaClient } from "@prisma/client";

import { db } from "../db";
import { bookingAudience, bookingOrderRequired } from "./booking-audience";

type EligibilityDatabase = Pick<PrismaClient, "business" | "whatsAppCommerceIntegration" | "commerceBookingEligibility">;

export const BOOKING_COMMERCE_PROVIDERS = ["salla", "zid", "shopify", "woocommerce"] as const;

export async function commerceBookingGate(input: {
  businessId: string;
  phoneE164: string;
  database?: EligibilityDatabase;
}) {
  const database = input.database ?? db;
  const business = await database.business.findFirst({
    where: { id: input.businessId, deletedAt: null }, select: { pageModules: true },
  });
  if (!business) return { required: true as const, eligible: false as const };
  const audience = bookingAudience(business.pageModules);
  if (audience === "everyone") return { required: false as const, eligible: true as const };
  const integration = await database.whatsAppCommerceIntegration.findFirst({
    where: { businessId: input.businessId, provider: { in: [...BOOKING_COMMERCE_PROVIDERS] }, status: "active" },
    select: { id: true },
  });
  if (!bookingOrderRequired(audience, Boolean(integration))) return { required: false as const, eligible: true as const };
  if (!integration) return { required: true as const, eligible: false as const };
  const eligibleOrder = await database.commerceBookingEligibility.findFirst({
    where: {
      businessId: input.businessId,
      phoneE164: input.phoneE164,
      eligible: true,
      provider: { in: [...BOOKING_COMMERCE_PROVIDERS] },
      integration: { businessId: input.businessId, provider: { in: [...BOOKING_COMMERCE_PROVIDERS] }, status: "active" },
    },
    select: { id: true },
  });
  return { required: true as const, eligible: Boolean(eligibleOrder) };
}

/** @deprecated Kept for compatibility with older callers. */
export const sallaBookingGate = commerceBookingGate;
