import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "./credential-envelope";
import { assertOutboundEnabled, isRetryableMetaStatus, outboundRateLimit, retryDelayMs } from "./delivery-domain";
import { hasActiveWhatsAppMarketingEntitlement } from "./feature-entitlement";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl, type MetaWhatsAppConfig } from "./meta-config";

const MAX_ATTEMPTS = 8;
type JsonRecord = Record<string, unknown>;
type ClaimedJob = { id: string; businessId: string; automationId: string; runId: string; connectionId: string; attemptCount: number };
const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const safeText = (value: unknown, limit = 256) => typeof value === "string" ? value.slice(0, limit) : null;

function credentialEnvelope(value: Prisma.JsonValue): WhatsAppCredentialEnvelope {
  const item = record(value);
  if (item?.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string" || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") {
    throw new Error("META_WHATSAPP_CREDENTIAL_ENVELOPE_INVALID");
  }
  return item as WhatsAppCredentialEnvelope;
}

async function claimNext(database: PrismaClient, workerId: string, now: Date) {
  return database.$transaction(async (tx) => {
    const expired = await tx.whatsAppAutomationJob.findMany({
      where: { status: "processing", leaseExpiresAt: { lt: now } },
      select: { id: true, runId: true }, take: 500,
    });
    if (expired.length > 0) {
      await tx.whatsAppAutomationJob.updateMany({
        where: { id: { in: expired.map((item) => item.id) }, status: "processing", leaseExpiresAt: { lt: now } },
        data: { status: "delivery_unknown", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "WORKER_LEASE_EXPIRED" },
      });
      await tx.whatsAppAutomationRun.updateMany({
        where: { id: { in: expired.map((item) => item.runId) }, status: "queued" },
        data: { status: "failed", completedAt: now },
      });
    }
    const rows = await tx.$queryRaw<ClaimedJob[]>(Prisma.sql`
      SELECT "id", "businessId", "automationId", "runId", "connectionId", "attemptCount"
      FROM "WhatsAppAutomationJob"
      WHERE "status" IN ('queued','retry_scheduled')
        AND "nextAttemptAt" <= ${now} AND "leaseExpiresAt" IS NULL
      ORDER BY "nextAttemptAt", "createdAt"
      FOR UPDATE SKIP LOCKED LIMIT 1
    `);
    const job = rows[0];
    if (!job) return null;
    await tx.whatsAppAutomationJob.update({
      where: { id: job.id },
      data: { status: "processing", leaseOwner: workerId.slice(0, 100), leaseExpiresAt: new Date(now.getTime() + 60_000), attemptCount: { increment: 1 } },
    });
    return { ...job, attemptCount: job.attemptCount + 1 };
  });
}

async function releaseAs(database: PrismaClient, job: ClaimedJob, status: string, now: Date, lastErrorCode?: string, nextAttemptAt?: Date) {
  await database.$transaction([
    database.whatsAppAutomationJob.update({
      where: { id: job.id },
      data: { status, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: lastErrorCode ?? null, ...(nextAttemptAt ? { nextAttemptAt } : {}) },
    }),
    ...(["failed", "cancelled", "delivery_unknown"].includes(status)
      ? [database.whatsAppAutomationRun.update({ where: { id: job.runId }, data: { status: "failed", completedAt: now } })]
      : []),
  ]);
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

export async function processNextWhatsAppAutomationDelivery(input: {
  database?: PrismaClient; workerId?: string; now?: Date; fetcher?: typeof fetch;
  env?: NodeJS.ProcessEnv; config?: MetaWhatsAppConfig;
} = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  assertOutboundEnabled(env);
  const job = await claimNext(database, input.workerId ?? `automation-delivery-${randomUUID()}`, now);
  if (!job) return { processed: false as const };

  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: job.businessId, database, now })) {
    await releaseAs(database, job, "cancelled", now, "WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED");
    return { processed: true as const, result: "entitlement_required" as const, jobId: job.id };
  }

  const context = await database.whatsAppAutomationJob.findFirst({
    where: { id: job.id, businessId: job.businessId, automationId: job.automationId, runId: job.runId, connectionId: job.connectionId },
    select: {
      templateParameters: true,
      automation: { select: { status: true } },
      contact: { select: { phoneE164: true, displayName: true, optedOutAt: true } },
      template: { select: { provider: true, status: true, name: true, language: true } },
      connection: { select: { provider: true, status: true, phoneNumberId: true, credentialEnvelope: true } },
    },
  });
  if (!context) {
    await releaseAs(database, job, "failed", now, "WHATSAPP_AUTOMATION_DELIVERY_CONTEXT_MISSING");
    return { processed: true as const, result: "failed" as const, jobId: job.id };
  }
  if (context.automation.status === "paused") {
    await releaseAs(database, job, "retry_scheduled", now, "AUTOMATION_PAUSED", new Date(now.getTime() + 60_000));
    return { processed: true as const, result: "paused" as const, jobId: job.id };
  }
  if (context.automation.status !== "active" || context.connection.status !== "connected" || context.connection.provider !== "meta" || context.template.provider !== "meta" || context.template.status !== "approved") {
    await releaseAs(database, job, "cancelled", now, "AUTOMATION_OR_CONNECTION_NOT_ACTIVE");
    return { processed: true as const, result: "cancelled" as const, jobId: job.id };
  }
  const consent = await database.whatsAppConsent.findFirst({
    where: { businessId: job.businessId, phoneE164: context.contact.phoneE164, revokedAt: null, consentedAt: { lte: now } }, select: { id: true },
  });
  if (context.contact.optedOutAt || !consent) {
    await releaseAs(database, job, "cancelled", now, "OPT_OUT_OR_CONSENT_REVOKED");
    return { processed: true as const, result: "skipped_opt_out" as const, jobId: job.id };
  }
  if (!await acquireRateSlot(database, job, outboundRateLimit(env), now)) {
    const nextMinute = new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000);
    await releaseAs(database, job, "retry_scheduled", now, "LOCAL_RATE_LIMIT", nextMinute);
    return { processed: true as const, result: "rate_limited" as const, jobId: job.id };
  }

  let config: MetaWhatsAppConfig;
  let accessToken: string;
  try {
    config = input.config ?? getMetaWhatsAppConfig(env);
    accessToken = decryptWhatsAppCredential({ envelope: credentialEnvelope(context.connection.credentialEnvelope), encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: job.businessId });
  } catch {
    await releaseAs(database, job, "failed", now, "OUTBOUND_CONFIGURATION_INVALID");
    return { processed: true as const, result: "failed" as const, jobId: job.id };
  }

  const template: JsonRecord = { name: context.template.name, language: { code: context.template.language } };
  if (Array.isArray(context.templateParameters)) template.components = context.templateParameters;
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(metaWhatsAppGraphUrl(config, `${context.connection.phoneNumberId}/messages`), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: context.contact.phoneE164, type: "template", template }),
    });
  } catch {
    await releaseAs(database, job, "delivery_unknown", now, "META_NETWORK_OUTCOME_UNKNOWN");
    return { processed: true as const, result: "delivery_unknown" as const, jobId: job.id };
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const providerError = record(record(payload)?.error);
    const code = safeText(providerError?.code) ?? `HTTP_${response.status}`;
    if (isRetryableMetaStatus(response.status) && job.attemptCount < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await releaseAs(database, job, "retry_scheduled", now, code, new Date(now.getTime() + retryDelayMs(job.attemptCount, Number.isFinite(retryAfter) ? retryAfter : null)));
      return { processed: true as const, result: "retry_scheduled" as const, jobId: job.id };
    }
    await releaseAs(database, job, "failed", now, code);
    return { processed: true as const, result: "failed" as const, jobId: job.id };
  }
  const providerMessageId = safeText(Array.isArray(record(payload)?.messages) ? record((record(payload)?.messages as unknown[])[0])?.id : null);
  if (!providerMessageId) {
    await releaseAs(database, job, "delivery_unknown", now, "META_SUCCESS_RESPONSE_INVALID");
    return { processed: true as const, result: "delivery_unknown" as const, jobId: job.id };
  }

  await database.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.upsert({
      where: { businessId_phoneNumberId_customerPhoneE164: { businessId: job.businessId, phoneNumberId: context.connection.phoneNumberId, customerPhoneE164: context.contact.phoneE164 } },
      create: { id: randomUUID(), businessId: job.businessId, phoneNumberId: context.connection.phoneNumberId, customerPhoneE164: context.contact.phoneE164, customerDisplayName: context.contact.displayName, lastMessageAt: now, lastOutboundAt: now },
      update: { customerDisplayName: context.contact.displayName, lastMessageAt: now, lastOutboundAt: now }, select: { id: true },
    });
    await tx.whatsAppMessage.upsert({
      where: { provider_providerMessageId: { provider: "meta", providerMessageId } },
      create: { id: randomUUID(), businessId: job.businessId, conversationId: conversation.id, provider: "meta", providerMessageId, direction: "outbound", messageType: "template", status: "sent", sentAt: now },
      update: {},
    });
    await tx.whatsAppAutomationJob.update({ where: { id: job.id }, data: { status: "sent", providerMessageId, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null } });
    await tx.whatsAppAutomationRun.update({ where: { id: job.runId }, data: { status: "completed", completedAt: now } });
    await writeWhatsAppAuditLog({ businessId: job.businessId, actorType: "worker", action: "automation.delivery.send", targetType: "automation_job", targetId: job.id, outcome: "success", metadata: { automationId: job.automationId }, database: tx });
  });
  return { processed: true as const, result: "sent" as const, jobId: job.id, providerMessageId };
}
