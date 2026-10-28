import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { sallaUninstallIsStale } from "./salla-lifecycle-domain";

/** The ingress must verify the raw Salla HMAC and app identity before calling. */
export async function applySallaUninstall(input: {
  businessId: string; integrationId: string; merchantId: string; eventId: string;
  appId: string; uninstalledAt: Date; now?: Date; database?: Pick<PrismaClient, "$transaction">;
}) {
  const now = input.now ?? new Date();
  return (input.database ?? db).$transaction(async tx => {
    const rows = await tx.$queryRaw<Array<{ status: string; connectedAt: Date | null }>>(Prisma.sql`
      SELECT "status", "connectedAt" FROM "WhatsAppCommerceIntegration"
      WHERE "id" = ${input.integrationId} AND "businessId" = ${input.businessId}
        AND "provider" = 'salla' AND "externalStoreId" = ${input.merchantId} FOR UPDATE
    `);
    if (!rows[0]) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
    const existing = await tx.sallaWebhookEvent.findUnique({ where: { eventId: input.eventId }, select: { businessId: true, integrationId: true, status: true, lastErrorCode: true } });
    if (existing && (existing.businessId !== input.businessId || existing.integrationId !== input.integrationId)) throw new Error("SALLA_WEBHOOK_IDENTITY_CONFLICT");
    if (existing?.status === "processed" || existing?.lastErrorCode === "SALLA_UNINSTALL_STALE") return { duplicate: true };
    const stale = sallaUninstallIsStale(input.uninstalledAt, rows[0].connectedAt);
    const alreadyDisconnected = rows[0].status === "disconnected";
    if (!stale && !alreadyDisconnected) {
      if (rows[0].status !== "active") throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
      await tx.whatsAppCommerceOAuthSession.updateMany({ where: { businessId: input.businessId, integrationId: input.integrationId, status: { in: ["created", "exchanging"] } },
        data: { status: "cancelled", consumedAt: now, lastErrorCode: "salla_app_uninstalled" } });
      await tx.whatsAppCommerceIntegration.updateMany({ where: { id: input.integrationId, businessId: input.businessId, provider: "salla", status: "active" },
        data: { status: "disconnected", credentialEnvelope: Prisma.DbNull, disconnectedAt: now, lastWebhookAt: now, lastErrorCode: null } });
      await tx.commerceBookingEligibility.updateMany({ where: { businessId: input.businessId, integrationId: input.integrationId, provider: "salla" }, data: { eligible: false } });
      await tx.sallaWebhookEvent.updateMany({ where: { businessId: input.businessId, integrationId: input.integrationId, eventId: { not: input.eventId }, OR: [
        { status: { in: ["pending", "retry_scheduled", "processing"] } },
        { status: "ignored", lastErrorCode: "SALLA_SUBSCRIPTION_VERIFICATION_REQUIRED" },
      ] },
        data: { status: "ignored", processedAt: now, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "SALLA_APP_UNINSTALLED" } });
    }
    const data = { status: stale ? "ignored" : "processed", processedAt: now, leaseOwner: null, leaseExpiresAt: null,
      lastErrorCode: stale ? "SALLA_UNINSTALL_STALE" : null,
      payload: { event: "app.uninstalled", merchant: input.merchantId, data: { id: input.appId, uninstallation_date: input.uninstalledAt.toISOString() } } };
    await tx.sallaWebhookEvent.upsert({ where: { eventId: input.eventId }, update: data, create: {
      id: randomUUID(), businessId: input.businessId, integrationId: input.integrationId,
      eventId: input.eventId, eventType: "app.uninstalled", merchantId: input.merchantId, ...data,
    } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorType: "system", action: "commerce.salla.uninstall",
      targetType: "commerce_integration", targetId: input.integrationId, outcome: "success",
      metadata: { stale, alreadyDisconnected }, database: tx });
    return { duplicate: false, stale, alreadyDisconnected };
  });
}
