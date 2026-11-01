import "server-only";
import { Prisma } from "@prisma/client";

/** Called inside the account lifecycle transaction, only for verified owned businesses. */
export async function stopAccountBusinessServices(tx: Prisma.TransactionClient, businessId: string, now: Date) {
  const where = { businessId };
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`billing-business:${businessId}`}))`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`whatsapp-connection:${businessId}`}))`;
  await tx.business.update({ where: { id: businessId }, data: { isPublished: false, bookingAvailable: false, acceptOnlineOrders: false } });
  await tx.subscription.updateMany({ where, data: { autoRenew: false } });
  await tx.billingPayment.updateMany({ where: { ...where, kind: "renewal", status: { in: ["created", "failed"] } }, data: { status: "canceled", nextRetryAt: null } });
  await tx.businessMember.updateMany({ where: { ...where, status: "active" }, data: { status: "suspended" } });
  await tx.whatsAppConnection.updateMany({ where, data: { status: "disconnected", disabledAt: now, marketingEnabled: false, bookingEnabled: false, credentialEnvelope: Prisma.JsonNull } });
  await tx.whatsAppEmbeddedSignupSession.updateMany({ where: { ...where, status: { notIn: ["connected", "cancelled", "expired"] } }, data: { status: "cancelled", expiresAt: now, consumedAt: now, credentialEnvelope: Prisma.JsonNull } });
  await tx.whatsAppCommerceIntegration.updateMany({ where, data: { status: "disconnected", disconnectedAt: now, credentialEnvelope: Prisma.JsonNull } });
  await tx.whatsAppCommerceOAuthSession.updateMany({ where: { ...where, status: { in: ["created", "exchanging"] } }, data: { status: "cancelled", expiresAt: now } });
  await tx.whatsAppAutomationApiKey.updateMany({ where: { ...where, status: "active" }, data: { status: "revoked", revokedAt: now } });
  await tx.whatsAppCampaign.updateMany({ where: { ...where, status: { in: ["draft", "snapshotting", "ready", "scheduled", "running", "paused"] } }, data: { status: "cancelled", completedAt: now } });
  await tx.whatsAppAutomation.updateMany({ where: { ...where, status: "active" }, data: { status: "paused", pausedAt: now } });
  const queued = { ...where, status: { in: ["queued", "retry_scheduled"] } };
  const cancelled = { status: "cancelled", lastErrorCode: "ACCOUNT_INACTIVE", leaseOwner: null, leaseExpiresAt: null };
  await tx.whatsAppDeliveryJob.updateMany({ where: queued, data: cancelled });
  await tx.whatsAppAutomationJob.updateMany({ where: queued, data: cancelled });
  await tx.whatsAppReplyJob.updateMany({ where: queued, data: cancelled });
  await tx.whatsAppContactImportBatch.updateMany({ where: { ...where, status: { in: ["queued", "processing"] } }, data: { status: "failed", lastErrorCode: "ACCOUNT_INACTIVE", leaseOwner: null, leaseExpiresAt: null, completedAt: now } });
  await tx.whatsAppContactImport.updateMany({ where: { ...where, status: { in: ["queued", "processing"] } }, data: { status: "failed", completedAt: now, errorSummary: { code: "ACCOUNT_INACTIVE" } } });
  await tx.whatsAppShopifyWebhookSync.updateMany({ where: { ...where, status: { in: ["pending", "retry_scheduled"] } }, data: { status: "failed", lastErrorCode: "ACCOUNT_INACTIVE", leaseOwner: null, leaseExpiresAt: null } });
  await tx.whatsAppCampaignRecipient.updateMany({ where: { ...where, status: { in: ["snapshotted", "queued"] } }, data: { status: "cancelled" } });
  await tx.$executeRaw`UPDATE "SmartReminder" SET "status"='paused', "pausedAt"=${now}, "updatedAt"=${now} WHERE "businessId"=${businessId} AND "status"='scheduled'`;
  await tx.$executeRaw`UPDATE "SmartReminderDelivery" SET "status"='cancelled', "lastErrorCode"='ACCOUNT_INACTIVE', "updatedAt"=${now} WHERE "businessId"=${businessId} AND "status" IN ('queued','retry_scheduled')`;
  await tx.liveViewSession.updateMany({ where: { ...where, endedAt: null }, data: { endedAt: now } });
  await tx.liveViewConnector.updateMany({ where, data: { revokedAt: now, tokenHash: null, pairingHash: null, pairingExpiresAt: null } });
  await tx.liveViewStation.updateMany({ where, data: { enabled: false } });
}
