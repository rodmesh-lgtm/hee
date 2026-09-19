import "server-only";

import type { PrismaClient } from "@prisma/client";

import { db } from "../db";

type EligibilityDatabase = Pick<PrismaClient, "whatsAppCommerceIntegration" | "commerceBookingEligibility">;

export async function sallaBookingGate(input: {
  businessId: string;
  phoneE164: string;
  database?: EligibilityDatabase;
}) {
  const database = input.database ?? db;
  const integration = await database.whatsAppCommerceIntegration.findFirst({
    where: { businessId: input.businessId, provider: "salla", status: "active" },
    select: { id: true },
  });
  if (!integration) return { required: false as const, eligible: true as const };
  const eligibleOrder = await database.commerceBookingEligibility.findFirst({
    where: {
      businessId: input.businessId,
      phoneE164: input.phoneE164,
      eligible: true,
      provider: "salla",
      integration: { provider: "salla", status: "active" },
    },
    select: { id: true },
  });
  return { required: true as const, eligible: Boolean(eligibleOrder) };
}
