import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";

type CampaignOperationsDb = Pick<PrismaClient, "$transaction">;

async function lockCampaign(tx: Prisma.TransactionClient, businessId: string, campaignId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "WhatsAppCampaign"
    WHERE "id" = ${campaignId} AND "businessId" = ${businessId}
    FOR UPDATE
  `);
  if (!rows[0]) throw new Error("WHATSAPP_CAMPAIGN_NOT_FOUND");
}

export async function scheduleWhatsAppCampaign(input: {
  businessId: string; campaignId: string; scheduledAt: Date; database?: CampaignOperationsDb; now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  if (!(input.scheduledAt instanceof Date) || Number.isNaN(input.scheduledAt.getTime()) || input.scheduledAt <= now) {
    throw new Error("WHATSAPP_CAMPAIGN_SCHEDULE_INVALID");
  }
  if (input.scheduledAt.getTime() > now.getTime() + 366 * 24 * 60 * 60 * 1_000) throw new Error("WHATSAPP_CAMPAIGN_SCHEDULE_TOO_FAR");
  return database.$transaction(async (tx) => {
    await lockCampaign(tx, input.businessId, input.campaignId);
    const campaign = await tx.whatsAppCampaign.findFirst({ where: { id: input.campaignId, businessId: input.businessId }, select: { status: true } });
    if (campaign?.status !== "ready") throw new Error("WHATSAPP_CAMPAIGN_NOT_READY");
    await tx.whatsAppCampaign.update({ where: { id: input.campaignId }, data: { status: "scheduled", scheduledAt: input.scheduledAt } });
    return { campaignId: input.campaignId, status: "scheduled" as const, scheduledAt: input.scheduledAt };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function pauseWhatsAppCampaign(input: { businessId: string; campaignId: string; database?: CampaignOperationsDb; now?: Date }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    await lockCampaign(tx, input.businessId, input.campaignId);
    const campaign = await tx.whatsAppCampaign.findFirst({ where: { id: input.campaignId, businessId: input.businessId }, select: { status: true } });
    if (campaign?.status === "paused") return { campaignId: input.campaignId, status: "paused" as const, alreadyPaused: true };
    if (campaign?.status !== "running") throw new Error("WHATSAPP_CAMPAIGN_NOT_RUNNING");
    await tx.whatsAppCampaign.update({ where: { id: input.campaignId }, data: { status: "paused", pausedAt: now } });
    return { campaignId: input.campaignId, status: "paused" as const, alreadyPaused: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function resumeWhatsAppCampaign(input: { businessId: string; campaignId: string; database?: CampaignOperationsDb; now?: Date }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    await lockCampaign(tx, input.businessId, input.campaignId);
    const campaign = await tx.whatsAppCampaign.findFirst({ where: { id: input.campaignId, businessId: input.businessId }, select: { status: true } });
    if (campaign?.status !== "paused") throw new Error("WHATSAPP_CAMPAIGN_NOT_PAUSED");
    await tx.whatsAppDeliveryJob.updateMany({
      where: { businessId: input.businessId, campaignId: input.campaignId, status: "retry_scheduled" },
      data: { nextAttemptAt: now, lastErrorCode: null, lastErrorMessage: null },
    });
    await tx.whatsAppCampaign.update({ where: { id: input.campaignId }, data: { status: "running", pausedAt: null } });
    return { campaignId: input.campaignId, status: "running" as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function cancelWhatsAppCampaign(input: { businessId: string; campaignId: string; database?: CampaignOperationsDb; now?: Date }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    await lockCampaign(tx, input.businessId, input.campaignId);
    const campaign = await tx.whatsAppCampaign.findFirst({ where: { id: input.campaignId, businessId: input.businessId }, select: { status: true } });
    if (!campaign || ["completed", "failed"].includes(campaign.status)) throw new Error("WHATSAPP_CAMPAIGN_TERMINAL");
    if (campaign.status === "cancelled") return { campaignId: input.campaignId, status: "cancelled" as const, alreadyCancelled: true };
    await tx.whatsAppDeliveryJob.updateMany({
      where: { businessId: input.businessId, campaignId: input.campaignId, status: { in: ["queued", "retry_scheduled"] } },
      data: { status: "cancelled", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "CAMPAIGN_CANCELLED" },
    });
    await tx.whatsAppCampaignRecipient.updateMany({
      where: { businessId: input.businessId, campaignId: input.campaignId, status: { in: ["snapshotted", "queued"] } },
      data: { status: "cancelled" },
    });
    await tx.whatsAppCampaign.update({ where: { id: input.campaignId }, data: { status: "cancelled", completedAt: now } });
    return { campaignId: input.campaignId, status: "cancelled" as const, alreadyCancelled: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function getWhatsAppCampaignReport(input: { businessId: string; campaignId: string; database?: PrismaClient }) {
  const database = input.database ?? db;
  const campaign = await database.whatsAppCampaign.findFirst({
    where: { id: input.campaignId, businessId: input.businessId },
    select: { id: true, name: true, status: true, totalRecipients: true, snapshotAt: true, startedAt: true, completedAt: true },
  });
  if (!campaign) throw new Error("WHATSAPP_CAMPAIGN_NOT_FOUND");
  const grouped = await database.whatsAppCampaignRecipient.groupBy({
    by: ["status"], where: { businessId: input.businessId, campaignId: input.campaignId }, _count: { _all: true },
  });
  const replyPhones = await database.whatsAppCampaignRecipient.findMany({
    where: { businessId: input.businessId, campaignId: input.campaignId, sentAt: { not: null } },
    select: { phoneE164: true },
  });
  const replies = campaign.startedAt && replyPhones.length > 0
    ? await database.whatsAppConversation.count({
      where: {
        businessId: input.businessId, customerPhoneE164: { in: replyPhones.map((item) => item.phoneE164) },
        messages: { some: { businessId: input.businessId, direction: "inbound", createdAt: { gte: campaign.startedAt } } },
      },
    })
    : 0;
  const counts = Object.fromEntries(grouped.map((item) => [item.status, item._count._all]));
  const total = campaign.totalRecipients;
  const count = (status: string) => counts[status] ?? 0;
  const sent = count("sent") + count("delivered") + count("read");
  const delivered = count("delivered") + count("read");
  return {
    ...campaign, counts,
    recipients: total, sent, delivered, read: count("read"), failed: count("failed"), replies,
    skippedOptOut: count("skipped_opt_out"), cancelled: count("cancelled"),
    rates: {
      sent: total ? sent / total : 0, delivered: total ? delivered / total : 0,
      read: total ? count("read") / total : 0, failed: total ? count("failed") / total : 0,
      replies: total ? replies / total : 0,
    },
  };
}

export async function reconcileWhatsAppCampaignCompletion(input: {
  businessId: string; campaignId: string; database?: CampaignOperationsDb; now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    await lockCampaign(tx, input.businessId, input.campaignId);
    const campaign = await tx.whatsAppCampaign.findFirst({
      where: { id: input.campaignId, businessId: input.businessId }, select: { status: true },
    });
    if (!campaign || !["running", "paused"].includes(campaign.status)) return { completed: false as const };
    const unfinished = await tx.whatsAppCampaignRecipient.count({
      where: { businessId: input.businessId, campaignId: input.campaignId, status: { in: ["snapshotted", "queued", "processing"] } },
    });
    if (unfinished > 0) return { completed: false as const };
    await tx.whatsAppCampaign.update({ where: { id: input.campaignId }, data: { status: "completed", completedAt: now } });
    return { completed: true as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
