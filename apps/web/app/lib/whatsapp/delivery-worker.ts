import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "./credential-envelope";
import { assertOutboundEnabled, isRetryableMetaStatus, outboundRateLimit, retryDelayMs, WHATSAPP_DELIVERY_MAX_ATTEMPTS } from "./delivery-domain";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl, type MetaWhatsAppConfig } from "./meta-config";
import { hasActiveWhatsAppMarketingEntitlement } from "./feature-entitlement";

type JsonRecord = Record<string, unknown>;
type ClaimedJob = { id: string; businessId: string; connectionId: string; campaignId: string; recipientId: string; attemptCount: number };
const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const safeText = (value: unknown, limit = 512) => typeof value === "string" ? value.slice(0, limit) : null;

function credentialEnvelope(value: Prisma.JsonValue): WhatsAppCredentialEnvelope {
  const item = record(value);
  if (item?.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string" || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") {
    throw new Error("META_WHATSAPP_CREDENTIAL_ENVELOPE_INVALID");
  }
  return item as WhatsAppCredentialEnvelope;
}

async function claimNext(database: PrismaClient, workerId: string, now: Date) {
  return database.$transaction(async (tx) => {
    await tx.whatsAppDeliveryJob.updateMany({
      where: { status: "processing", leaseExpiresAt: { lt: now } },
      data: {
        status: "delivery_unknown", leaseOwner: null, leaseExpiresAt: null,
        lastErrorCode: "WORKER_LEASE_EXPIRED", lastErrorMessage: "The provider request outcome could not be confirmed",
      },
    });
    const rows = await tx.$queryRaw<ClaimedJob[]>(Prisma.sql`
      SELECT "id", "businessId", "connectionId", "campaignId", "recipientId", "attemptCount"
      FROM "WhatsAppDeliveryJob"
      WHERE "nextAttemptAt" <= ${now}
        AND "status" IN ('queued', 'retry_scheduled') AND "leaseExpiresAt" IS NULL
      ORDER BY "nextAttemptAt", "createdAt"
      FOR UPDATE SKIP LOCKED LIMIT 1
    `);
    const job = rows[0];
    if (!job) return null;
    const leaseExpiresAt = new Date(now.getTime() + 60_000);
    await tx.whatsAppDeliveryJob.update({
      where: { id: job.id },
      data: { status: "processing", leaseOwner: workerId, leaseExpiresAt, attemptCount: { increment: 1 } },
    });
    await tx.whatsAppCampaignRecipient.update({
      where: { id: job.recipientId }, data: { status: "processing", processingAt: now },
    });
    return { ...job, attemptCount: job.attemptCount + 1, leaseExpiresAt };
  });
}

async function acquireRateSlot(database: PrismaClient, job: ClaimedJob, limit: number, now: Date) {
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const rows = await database.$queryRaw<Array<{ sentCount: number }>>(Prisma.sql`
    INSERT INTO "WhatsAppSendRateBucket" ("connectionId", "businessId", "windowStart", "sentCount", "updatedAt")
    VALUES (${job.connectionId}, ${job.businessId}, ${windowStart}, 1, ${now})
    ON CONFLICT ("connectionId", "windowStart") DO UPDATE
      SET "sentCount" = "WhatsAppSendRateBucket"."sentCount" + 1, "updatedAt" = ${now}
      WHERE "WhatsAppSendRateBucket"."businessId" = ${job.businessId}
        AND "WhatsAppSendRateBucket"."sentCount" < ${limit}
    RETURNING "sentCount"
  `);
  return rows.length > 0;
}

async function releaseAs(database: PrismaClient, jobId: string, status: string, data: Prisma.WhatsAppDeliveryJobUpdateInput = {}) {
  await database.whatsAppDeliveryJob.update({ where: { id: jobId }, data: { ...data, status, leaseOwner: null, leaseExpiresAt: null } });
}

export async function processNextWhatsAppDelivery(input: {
  database?: PrismaClient;
  workerId?: string;
  now?: Date;
  fetcher?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  config?: MetaWhatsAppConfig;
} = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  assertOutboundEnabled(env);
  const job = await claimNext(database, input.workerId ?? randomUUID(), now);
  if (!job) return { processed: false as const };
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: job.businessId, database, now })) {
    await database.$transaction([
      database.whatsAppDeliveryJob.update({ where: { id: job.id }, data: { status: "cancelled", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED" } }),
      database.whatsAppCampaignRecipient.update({ where: { id: job.recipientId }, data: { status: "cancelled" } }),
    ]);
    return { processed: true as const, result: "entitlement_required" as const, jobId: job.id };
  }

  const context = await database.whatsAppDeliveryJob.findFirst({
    where: { id: job.id, businessId: job.businessId, campaignId: job.campaignId, connectionId: job.connectionId },
    select: {
      id: true,
      campaign: { select: { status: true, templateSnapshot: true } },
      recipient: { select: { id: true, phoneE164: true, displayName: true, templateParameters: true, contact: { select: { optedOutAt: true } } } },
      connection: { select: { provider: true, status: true, phoneNumberId: true, credentialEnvelope: true } },
    },
  });
  if (!context) throw new Error("WHATSAPP_DELIVERY_CONTEXT_MISSING");
  if (context.campaign.status === "paused") {
    await releaseAs(database, job.id, "retry_scheduled", { nextAttemptAt: new Date(now.getTime() + 60_000) });
    return { processed: true as const, result: "paused" as const, jobId: job.id };
  }
  if (context.campaign.status !== "running" || context.connection.status !== "connected" || context.connection.provider !== "meta") {
    await releaseAs(database, job.id, "cancelled", { lastErrorCode: "CAMPAIGN_OR_CONNECTION_NOT_ACTIVE" });
    await database.whatsAppCampaignRecipient.update({ where: { id: job.recipientId }, data: { status: "cancelled" } });
    return { processed: true as const, result: "cancelled" as const, jobId: job.id };
  }
  const consent = await database.whatsAppConsent.findFirst({
    where: { businessId: job.businessId, phoneE164: context.recipient.phoneE164, revokedAt: null, consentedAt: { lte: now } }, select: { id: true },
  });
  if (context.recipient.contact.optedOutAt || !consent) {
    await database.$transaction([
      database.whatsAppDeliveryJob.update({ where: { id: job.id }, data: { status: "cancelled", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "OPT_OUT_OR_CONSENT_REVOKED" } }),
      database.whatsAppCampaignRecipient.update({ where: { id: job.recipientId }, data: { status: "skipped_opt_out" } }),
    ]);
    return { processed: true as const, result: "skipped_opt_out" as const, jobId: job.id };
  }
  if (!await acquireRateSlot(database, job, outboundRateLimit(env), now)) {
    const nextMinute = new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000);
    await releaseAs(database, job.id, "retry_scheduled", { nextAttemptAt: nextMinute, lastErrorCode: "LOCAL_RATE_LIMIT" });
    return { processed: true as const, result: "rate_limited" as const, jobId: job.id };
  }

  const template = record(context.campaign.templateSnapshot);
  if (!template || typeof template.name !== "string" || typeof template.language !== "string") {
    await releaseAs(database, job.id, "failed", { lastErrorCode: "TEMPLATE_SNAPSHOT_INVALID", lastErrorMessage: "Campaign template snapshot is incomplete" });
    return { processed: true as const, result: "failed" as const, jobId: job.id };
  }
  let config: MetaWhatsAppConfig;
  let accessToken: string;
  try {
    config = input.config ?? getMetaWhatsAppConfig(env);
    accessToken = decryptWhatsAppCredential({ envelope: credentialEnvelope(context.connection.credentialEnvelope), encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: job.businessId });
  } catch {
    await releaseAs(database, job.id, "failed", { lastErrorCode: "OUTBOUND_CONFIGURATION_INVALID", lastErrorMessage: "Outbound credentials or configuration are unavailable" });
    return { processed: true as const, result: "failed" as const, jobId: job.id };
  }
  const templatePayload: JsonRecord = { name: template.name, language: { code: template.language } };
  if (Array.isArray(context.recipient.templateParameters)) templatePayload.components = context.recipient.templateParameters;

  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(metaWhatsAppGraphUrl(config, `${context.connection.phoneNumberId}/messages`), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: context.recipient.phoneE164, type: "template", template: templatePayload }),
    });
  } catch {
    await releaseAs(database, job.id, "delivery_unknown", { lastErrorCode: "META_NETWORK_OUTCOME_UNKNOWN", lastErrorMessage: "Request outcome could not be confirmed" });
    return { processed: true as const, result: "delivery_unknown" as const, jobId: job.id };
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = record(record(payload)?.error);
    const code = safeText(error?.code) ?? `HTTP_${response.status}`;
    const message = safeText(error?.message) ?? "Meta rejected the request";
    const retryable = isRetryableMetaStatus(response.status) && job.attemptCount < WHATSAPP_DELIVERY_MAX_ATTEMPTS;
    if (retryable) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await releaseAs(database, job.id, "retry_scheduled", { nextAttemptAt: new Date(now.getTime() + retryDelayMs(job.attemptCount, Number.isFinite(retryAfter) ? retryAfter : null)), lastErrorCode: code, lastErrorMessage: message });
      return { processed: true as const, result: "retry_scheduled" as const, jobId: job.id };
    }
    await database.$transaction([
      database.whatsAppDeliveryJob.update({ where: { id: job.id }, data: { status: "failed", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: code, lastErrorMessage: message } }),
      database.whatsAppCampaignRecipient.update({ where: { id: job.recipientId }, data: { status: "failed", failedAt: now } }),
    ]);
    return { processed: true as const, result: "failed" as const, jobId: job.id };
  }
  const providerMessageId = safeText(Array.isArray(record(payload)?.messages) ? record((record(payload)?.messages as unknown[])[0])?.id : null, 256);
  if (!providerMessageId) {
    await releaseAs(database, job.id, "delivery_unknown", { lastErrorCode: "META_SUCCESS_RESPONSE_INVALID", lastErrorMessage: "Provider message id was missing" });
    return { processed: true as const, result: "delivery_unknown" as const, jobId: job.id };
  }
  await database.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.upsert({
      where: { businessId_phoneNumberId_customerPhoneE164: { businessId: job.businessId, phoneNumberId: context.connection.phoneNumberId, customerPhoneE164: context.recipient.phoneE164 } },
      create: { id: randomUUID(), businessId: job.businessId, phoneNumberId: context.connection.phoneNumberId, customerPhoneE164: context.recipient.phoneE164, customerDisplayName: context.recipient.displayName, lastMessageAt: now, lastOutboundAt: now },
      update: { customerDisplayName: context.recipient.displayName, lastMessageAt: now, lastOutboundAt: now }, select: { id: true },
    });
    await tx.whatsAppMessage.upsert({
      where: { provider_providerMessageId: { provider: "meta", providerMessageId } },
      create: { id: randomUUID(), businessId: job.businessId, conversationId: conversation.id, provider: "meta", providerMessageId, direction: "outbound", messageType: "template", status: "sent", sentAt: now },
      update: {},
    });
    await tx.whatsAppDeliveryJob.update({ where: { id: job.id }, data: { status: "sent", providerMessageId, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null, lastErrorMessage: null } });
    await tx.whatsAppCampaignRecipient.update({ where: { id: job.recipientId }, data: { status: "sent", sentAt: now } });
  });
  return { processed: true as const, result: "sent" as const, jobId: job.id, providerMessageId };
}
