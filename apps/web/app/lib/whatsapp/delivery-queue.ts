import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { decideWhatsAppCampaignCanary } from "./campaign-canary-domain";
import { deliveryIdempotencyKey } from "./delivery-domain";

type QueueDb = Pick<PrismaClient, "$transaction">;

export async function enqueueWhatsAppCampaign(input: {
  businessId: string;
  campaignId: string;
  database?: QueueDb;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "WhatsAppCampaign"
      WHERE "id" = ${input.campaignId} AND "businessId" = ${input.businessId}
      FOR UPDATE
    `);
    if (!locked[0]) throw new Error("WHATSAPP_CAMPAIGN_NOT_FOUND");
    const campaign = await tx.whatsAppCampaign.findFirst({
      where: { id: input.campaignId, businessId: input.businessId },
      select: { id: true, connectionId: true, status: true, scheduledAt: true },
    });
    if (!campaign) throw new Error("WHATSAPP_CAMPAIGN_NOT_FOUND");
    if (campaign.status === "scheduled" && campaign.scheduledAt && campaign.scheduledAt > now) {
      throw new Error("WHATSAPP_CAMPAIGN_NOT_DUE");
    }
    if (!["ready", "scheduled", "running"].includes(campaign.status)) {
      throw new Error("WHATSAPP_CAMPAIGN_NOT_QUEUEABLE");
    }

    const [verifiedDelivery, priorCurrentAttempt] = await Promise.all([
      tx.whatsAppCampaignRecipient.findFirst({
        where: { businessId: input.businessId, status: { in: ["delivered", "read"] } },
        select: { id: true },
      }),
      tx.whatsAppCampaignRecipient.findFirst({
        where: {
          businessId: input.businessId,
          campaignId: campaign.id,
          status: { in: ["queued", "processing", "sent", "failed", "cancelled"] },
        },
        select: { id: true, status: true },
      }),
    ]);
    const canary = decideWhatsAppCampaignCanary({
      hasVerifiedDelivery: Boolean(verifiedDelivery),
      hasPriorCurrentAttempt: Boolean(priorCurrentAttempt),
    });
    if (canary.state === "awaiting_delivery") {
      const remainingSnapshot = await tx.whatsAppCampaignRecipient.count({
        where: { businessId: input.businessId, campaignId: campaign.id, status: "snapshotted" },
      });
      return {
        campaignId: campaign.id,
        queued: 0,
        skippedOptOut: 0,
        canaryState: "awaiting_delivery" as const,
        remainingSnapshot,
      };
    }

    const recipients = await tx.whatsAppCampaignRecipient.findMany({
      where: { businessId: input.businessId, campaignId: campaign.id, status: "snapshotted" },
      select: { id: true, contactId: true, phoneE164: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });
    const contacts = await tx.whatsAppContact.findMany({
      where: { businessId: input.businessId, id: { in: recipients.map((item) => item.contactId) }, optedOutAt: null },
      select: { id: true },
    });
    const consents = await tx.whatsAppConsent.findMany({
      where: { businessId: input.businessId, phoneE164: { in: recipients.map((item) => item.phoneE164) }, revokedAt: null, consentedAt: { lte: now } },
      select: { phoneE164: true },
    });
    const allowedContacts = new Set(contacts.map((item) => item.id));
    const allowedPhones = new Set(consents.map((item) => item.phoneE164));
    const eligible = recipients.filter((item) => allowedContacts.has(item.contactId) && allowedPhones.has(item.phoneE164));
    const skipped = recipients.filter((item) => !allowedContacts.has(item.contactId) || !allowedPhones.has(item.phoneE164));
    if (skipped.length) await tx.whatsAppCampaignRecipient.updateMany({
      where: { businessId: input.businessId, campaignId: campaign.id, id: { in: skipped.map((item) => item.id) }, status: "snapshotted" },
      data: { status: "skipped_opt_out" },
    });

    const queueEligible = canary.queueLimit == null ? eligible : eligible.slice(0, canary.queueLimit);
    if (queueEligible.length) {
      await tx.whatsAppDeliveryJob.createMany({ data: queueEligible.map((recipient) => ({
        id: randomUUID(), businessId: input.businessId, connectionId: campaign.connectionId,
        campaignId: campaign.id, recipientId: recipient.id,
        idempotencyKey: deliveryIdempotencyKey(input.businessId, campaign.id, recipient.id), nextAttemptAt: now,
      })), skipDuplicates: true });
      await tx.whatsAppCampaignRecipient.updateMany({
        where: { businessId: input.businessId, campaignId: campaign.id, id: { in: queueEligible.map((item) => item.id) }, status: "snapshotted" },
        data: { status: "queued", queuedAt: now },
      });
    }
    if (queueEligible.length > 0) {
      await tx.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: "running", startedAt: now, pausedAt: null } });
    } else if (campaign.status !== "running") {
      await tx.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: "completed", completedAt: now } });
    }
    return {
      campaignId: campaign.id,
      queued: queueEligible.length,
      skippedOptOut: skipped.length,
      canaryState: canary.state === "canary" && queueEligible.length > 0 ? "queued" as const : "verified" as const,
      remainingSnapshot: Math.max(0, eligible.length - queueEligible.length),
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
