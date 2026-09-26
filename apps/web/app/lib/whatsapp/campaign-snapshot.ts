import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { boundedTemplateParameters, parseCampaignAudience } from "./campaign-domain";
import { campaignTemplateFields, resolveCampaignComposition, type Composition } from "./campaign-composition";
import type { CampaignSendPolicy } from "./campaign-send-policy";

type CampaignDb = Pick<PrismaClient, "$transaction">;
type Candidate = { id: string; phoneE164: string; displayName: string | null; email?: string | null; attributes?: unknown };

export async function snapshotWhatsAppCampaign(input: {
  businessId: string;
  campaignId: string;
  parametersByContactId?: Record<string, unknown>;
  composition?: Composition;
  sendPolicy?: CampaignSendPolicy | null;
  database?: CampaignDb;
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
      select: {
        id: true, businessId: true, connectionId: true, status: true,
        audienceDefinition: true, snapshotAt: true, totalRecipients: true,
        connection: { select: { provider: true, status: true, disabledAt: true } },
        template: { select: {
          id: true, connectionId: true, provider: true, providerTemplateId: true, name: true, language: true,
          category: true, status: true, providerStatus: true,
          parameterFormat: true, components: true, lastSyncedAt: true,
        } },
      },
    });
    if (!campaign) throw new Error("WHATSAPP_CAMPAIGN_NOT_FOUND");
    if (campaign.status === "ready" && campaign.snapshotAt) {
      return { campaignId: campaign.id, totalRecipients: campaign.totalRecipients, alreadySnapshotted: true as const };
    }
    if (campaign.status !== "draft") throw new Error("WHATSAPP_CAMPAIGN_NOT_DRAFT");
    if (campaign.connection.provider !== "meta" || campaign.connection.status !== "connected" || campaign.connection.disabledAt) {
      throw new Error("WHATSAPP_CAMPAIGN_CONNECTION_NOT_READY");
    }
    if (campaign.template.provider !== "meta" || campaign.template.connectionId !== campaign.connectionId) {
      throw new Error("WHATSAPP_CAMPAIGN_TEMPLATE_CONNECTION_MISMATCH");
    }
    if (campaign.template.status !== "approved" || campaign.template.category === "unknown") {
      throw new Error("WHATSAPP_CAMPAIGN_TEMPLATE_NOT_APPROVED");
    }
    const audience = parseCampaignAudience(campaign.audienceDefinition);
    if (!audience) throw new Error("WHATSAPP_CAMPAIGN_AUDIENCE_INVALID");

    await tx.whatsAppCampaign.update({ where: { id: campaign.id }, data: { status: "snapshotting" } });
    let candidates: Candidate[];
    if (audience.kind === "contacts") {
      candidates = await tx.whatsAppContact.findMany({
        where: { businessId: input.businessId, id: { in: audience.contactIds }, optedOutAt: null },
        select: { id: true, phoneE164: true, displayName: true, email: true, attributes: true },
      });
    } else {
      const segment = await tx.whatsAppSegment.findFirst({
        where: { id: audience.segmentId, businessId: input.businessId, kind: "static" },
        select: { id: true },
      });
      if (!segment) throw new Error("WHATSAPP_CAMPAIGN_STATIC_SEGMENT_NOT_FOUND");
      const memberships = await tx.whatsAppSegmentMembership.findMany({
        where: { businessId: input.businessId, segmentId: segment.id, contact: { optedOutAt: null } },
        select: { contact: { select: { id: true, phoneE164: true, displayName: true, email: true, attributes: true } } },
        take: 10_001,
      });
      if (memberships.length > 10_000) throw new Error("WHATSAPP_CAMPAIGN_AUDIENCE_TOO_LARGE");
      candidates = memberships.map((membership) => membership.contact);
    }
    if (candidates.length === 0) throw new Error("WHATSAPP_CAMPAIGN_NO_ELIGIBLE_RECIPIENTS");

    const consents = await tx.whatsAppConsent.findMany({
      where: {
        businessId: input.businessId,
        phoneE164: { in: candidates.map((contact) => contact.phoneE164) },
        revokedAt: null,
        source: { not: "booking" },
        consentedAt: { lte: now },
      },
      select: { phoneE164: true },
    });
    const consentedPhones = new Set(consents.map((consent) => consent.phoneE164));
    const eligible = candidates.filter((contact) => consentedPhones.has(contact.phoneE164));
    if (eligible.length === 0) throw new Error("WHATSAPP_CAMPAIGN_NO_ELIGIBLE_RECIPIENTS");

    if (input.composition?.mediaUrl?.startsWith("https://ir.sa/api/whatsapp/campaign-media/")) {
      const mediaId = new URL(input.composition.mediaUrl).pathname.split("/").at(-1)!;
      const kind = campaignTemplateFields(campaign.template.components).media;
      const mimeTypes = kind === "image" ? ["image/jpeg", "image/png"] : kind === "video" ? ["video/mp4"] : ["application/pdf"];
      const asset = await tx.storedObject.findFirst({ where: { id: mediaId, folder: `campaign-media/${input.businessId}`, mimeType: { in: mimeTypes } }, select: { id: true } });
      if (!asset) throw new Error("WHATSAPP_CAMPAIGN_MEDIA_INVALID");
    }

    const recipientRows = eligible.map((contact) => {
      const recipientId = randomUUID();
      const rawParameters = input.composition ? resolveCampaignComposition(campaign.template.components, input.composition, contact).components : input.parametersByContactId?.[contact.id];
      if (input.composition?.trackingDestination) {
        const components = campaign.template.components;
        const buttons = Array.isArray(components) ? components.find((c) => c && typeof c === "object" && !Array.isArray(c) && c.type === "BUTTONS") : null;
        const buttonList = buttons && typeof buttons === "object" && !Array.isArray(buttons) && Array.isArray(buttons.buttons) ? buttons.buttons : [];
        const index = buttonList.findIndex((b) => b && typeof b === "object" && !Array.isArray(b) && b.type === "URL" && b.url === "https://ir.sa/api/whatsapp/campaign-link/{{1}}");
        if (index < 0 || !Array.isArray(rawParameters)) throw new Error("WHATSAPP_CAMPAIGN_TRACKING_INVALID");
        const button = rawParameters.find((c) => c.type === "button" && c.index === String(index));
        if (!button) throw new Error("WHATSAPP_CAMPAIGN_TRACKING_INVALID");
        button.parameters = [{ type: "text", text: recipientId }];
      }
      const templateParameters = boundedTemplateParameters(rawParameters);
      if (rawParameters != null && templateParameters == null) throw new Error("WHATSAPP_CAMPAIGN_TEMPLATE_PARAMETERS_INVALID");
      return {
        id: recipientId, businessId: input.businessId, campaignId: campaign.id,
        contactId: contact.id, phoneE164: contact.phoneE164, displayName: contact.displayName,
        templateParameters: templateParameters as Prisma.InputJsonValue | undefined,
      };
    });
    await tx.whatsAppCampaignRecipient.createMany({ data: recipientRows });

    const templateSnapshot = {
      sendPolicy: input.sendPolicy ?? null,
      trackingDestination: input.composition?.trackingDestination ?? null,
      mediaUrl: input.composition?.mediaUrl ?? null,
      id: campaign.template.id,
      providerTemplateId: campaign.template.providerTemplateId,
      name: campaign.template.name,
      language: campaign.template.language,
      category: campaign.template.category,
      providerStatus: campaign.template.providerStatus,
      parameterFormat: campaign.template.parameterFormat,
      components: campaign.template.components,
      lastSyncedAt: campaign.template.lastSyncedAt.toISOString(),
    };
    await tx.whatsAppCampaign.update({
      where: { id: campaign.id },
      data: {
        status: "ready",
        templateSnapshot: templateSnapshot as Prisma.InputJsonValue,
        totalRecipients: recipientRows.length,
        snapshotAt: now,
      },
    });
    return {
      campaignId: campaign.id,
      totalRecipients: recipientRows.length,
      excludedRecipients: candidates.length - recipientRows.length,
      alreadySnapshotted: false as const,
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
