import { Prisma } from "@prisma/client";
import { retryDelayMs, shouldRetryCampaignReceipt } from "./delivery-domain";

// Called inside the webhook transaction. Lock in the same order as campaign
// cancellation/completion so a receipt cannot revive a cancelled campaign.
export async function retryCampaignFailureReceipt(tx: Prisma.TransactionClient, input: {
  businessId: string; jobId: string; campaignId: string; providerMessageId: string;
  errorCode: string | null; now: Date;
}) {
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "WhatsAppCampaign"
    WHERE "id" = ${input.campaignId} AND "businessId" = ${input.businessId} FOR UPDATE`);
  await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "WhatsAppDeliveryJob"
    WHERE "id" = ${input.jobId} AND "businessId" = ${input.businessId} FOR UPDATE`);
  const job = await tx.whatsAppDeliveryJob.findFirst({
    where: { id: input.jobId, businessId: input.businessId, providerMessageId: input.providerMessageId },
    select: { status: true, attemptCount: true, createdAt: true, recipientId: true,
      campaign: { select: { status: true } }, recipient: { select: { status: true } } },
  });
  // Duplicate receipts must not overwrite a scheduled retry or a newer attempt.
  if (!job || job.status === "retry_scheduled" || job.status === "processing") return true;
  if (job.status !== "sent" || !shouldRetryCampaignReceipt({
    ...input, attemptCount: job.attemptCount, createdAt: job.createdAt,
    campaignStatus: job.campaign.status, recipientStatus: job.recipient.status,
  })) return false;
  const updated = await tx.whatsAppDeliveryJob.updateMany({
    where: { id: input.jobId, businessId: input.businessId, status: "sent", providerMessageId: input.providerMessageId },
    data: { status: "retry_scheduled", nextAttemptAt: new Date(input.now.getTime() + retryDelayMs(job.attemptCount)),
      lastErrorCode: input.errorCode, leaseOwner: null, leaseExpiresAt: null },
  });
  if (!updated.count) return true;
  await tx.whatsAppCampaignRecipient.updateMany({
    where: { id: job.recipientId, businessId: input.businessId, status: { in: ["sent", "failed"] } },
    data: { status: "queued", failedAt: null },
  });
  if (job.campaign.status === "completed") await tx.whatsAppCampaign.updateMany({
    where: { id: input.campaignId, businessId: input.businessId, status: "completed" },
    data: { status: "running", completedAt: null },
  });
  return true;
}
