import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { readSallaSubscriptionReceipt, type SallaSubscriptionReceipt } from "./salla-subscription-receipt";

/** Raw signature and app identity must be verified by the ingress first.
 * Serializes receipt storage with uninstall/disconnect; never grants access. */
export async function captureSallaSubscriptionReceipt(input: {
  businessId: string; integrationId: string; merchantId: string; appId: string;
  eventId: string; connectedAt: Date | null; receipt: SallaSubscriptionReceipt;
  database?: Pick<PrismaClient, "$transaction">;
}): Promise<{ kind: "stored" | "duplicate" | "disconnected" | "replaced" | "conflict" }> {
  const receipt = readSallaSubscriptionReceipt(input.receipt);
  if (!receipt || receipt.merchant !== input.merchantId || receipt.appId !== input.appId) return { kind: "conflict" };
  return (input.database ?? db).$transaction(async tx => {
    const [integration] = await tx.$queryRaw<Array<{ status: string; connectedAt: Date | null }>>(Prisma.sql`
      SELECT "status", "connectedAt" FROM "WhatsAppCommerceIntegration"
      WHERE "id" = ${input.integrationId} AND "businessId" = ${input.businessId}
        AND "provider" = 'salla' AND "externalStoreId" = ${input.merchantId} FOR UPDATE
    `);
    if (!integration || integration.status !== "active") return { kind: "disconnected" };
    if ((integration.connectedAt?.getTime() ?? null) !== (input.connectedAt?.getTime() ?? null)) return { kind: "replaced" };
    const existing = await tx.sallaWebhookEvent.findUnique({ where: { eventId: input.eventId },
      select: { businessId: true, integrationId: true, merchantId: true } });
    if (existing) return { kind: existing.businessId === input.businessId && existing.integrationId === input.integrationId && existing.merchantId === input.merchantId ? "duplicate" : "conflict" };
    await tx.sallaWebhookEvent.create({ data: {
      id: randomUUID(), businessId: input.businessId, integrationId: input.integrationId,
      eventId: input.eventId, eventType: receipt.event, merchantId: input.merchantId,
      // The production inbox CHECK admits 'ignored', not a custom queue state.
      // This reason identifies quarantined receipts without dispatching orders.
      payload: receipt, status: "ignored", lastErrorCode: "SALLA_SUBSCRIPTION_VERIFICATION_REQUIRED",
    } });
    return { kind: "stored" };
  });
}
