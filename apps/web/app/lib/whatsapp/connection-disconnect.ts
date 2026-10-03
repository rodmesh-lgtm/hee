import "server-only";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";

export async function disconnectWhatsAppConnection(input: { businessId: string; actorUserId: string; connectionId: string; database?: Pick<PrismaClient, "$transaction">; now?: Date }) {
  const now = input.now ?? new Date();
  return (input.database ?? db).$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`whatsapp-connection:${input.businessId}`}))`;
    const connection = await tx.whatsAppConnection.findFirst({ where: { id: input.connectionId, businessId: input.businessId, provider: "meta" }, select: { id: true, phoneNumberId: true, status: true } });
    if (!connection) throw new Error("WHATSAPP_CONNECTION_NOT_FOUND");
    const scope = { businessId: input.businessId, connectionId: connection.id };
    await tx.whatsAppConnection.updateMany({ where: { id: connection.id, businessId: input.businessId }, data: { status: "disconnected", disabledAt: now, marketingEnabled: false, bookingEnabled: false, credentialEnvelope: Prisma.JsonNull, lastErrorCode: null } });
    await tx.whatsAppEmbeddedSignupSession.updateMany({ where: { businessId: input.businessId, status: { not: "connected" }, OR: [{ phoneNumberId: connection.phoneNumberId }, { phoneNumberId: null }] }, data: { status: "cancelled", expiresAt: now, consumedAt: now, credentialEnvelope: Prisma.JsonNull } });
    await tx.whatsAppCampaign.updateMany({ where: { ...scope, status: { in: ["draft", "snapshotting", "ready", "scheduled", "running", "paused"] } }, data: { status: "cancelled", completedAt: now } });
    await tx.whatsAppDeliveryJob.updateMany({ where: { ...scope, status: { in: ["queued", "retry_scheduled"] } }, data: { status: "cancelled", lastErrorCode: "CONNECTION_DISCONNECTED", leaseOwner: null, leaseExpiresAt: null } });
    await tx.whatsAppCampaignRecipient.updateMany({ where: { businessId: input.businessId, campaign: scope, status: { in: ["snapshotted", "queued"] } }, data: { status: "cancelled" } });
    await tx.whatsAppAutomation.updateMany({ where: { ...scope, status: "active" }, data: { status: "paused", pausedAt: now } });
    await tx.whatsAppAutomationJob.updateMany({ where: { ...scope, status: { in: ["queued", "retry_scheduled"] } }, data: { status: "cancelled", lastErrorCode: "CONNECTION_DISCONNECTED", leaseOwner: null, leaseExpiresAt: null } });
    await tx.whatsAppReplyJob.updateMany({ where: { ...scope, status: { in: ["queued", "retry_scheduled"] } }, data: { status: "cancelled", lastErrorCode: "CONNECTION_DISCONNECTED", leaseOwner: null, leaseExpiresAt: null } });
    await tx.$executeRaw(Prisma.sql`UPDATE "SmartReminderDelivery" SET "status" = 'cancelled', "lastErrorCode" = 'CONNECTION_DISCONNECTED', "updatedAt" = ${now} WHERE "businessId" = ${input.businessId} AND "connectionId" = ${connection.id} AND "channel" = 'whatsapp' AND "status" IN ('queued','retry_scheduled')`);
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "connection.disconnect", targetType: "connection", targetId: connection.id, outcome: "success", metadata: { previousStatus: connection.status }, database: tx });
    return { disconnected: true as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000 });
}
