import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { normalizeE164 } from "../whatsapp/contact-domain";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "../whatsapp/credential-envelope";
import { assertOutboundEnabled, isRetryableMetaStatus, outboundRateLimit, retryDelayMs } from "../whatsapp/delivery-domain";
import { hasActiveWhatsAppMarketingEntitlement } from "../whatsapp/feature-entitlement";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl, type MetaWhatsAppConfig } from "../whatsapp/meta-config";
import { reminderTemplateSupportsBodyParameter } from "./domain";

const MAX_ATTEMPTS = 8;
type JsonRecord = Record<string, unknown>;
type ClaimedDelivery = { id: string; businessId: string; reminderId: string; connectionId: string; templateId: string; attemptCount: number; leaseOwner: string };
type ReminderContext = {
  reminderId: string; businessId: string; title: string; body: string; recipientPhoneE164: string; reminderStatus: string;
  connectionId: string; connectionProvider: string; connectionStatus: string; phoneNumberId: string; credentialEnvelope: Prisma.JsonValue;
  templateId: string; templateProvider: string; templateStatus: string; templateName: string; templateLanguage: string; templateComponents: Prisma.JsonValue;
  businessWhatsapp: string | null; businessPhone: string | null;
};

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
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "status" = 'delivery_unknown', "leaseOwner" = NULL, "leaseExpiresAt" = NULL,
          "lastErrorCode" = 'WORKER_LEASE_EXPIRED', "failedAt" = ${now}, "updatedAt" = ${now}
      WHERE "status" = 'processing' AND "leaseExpiresAt" < ${now}
    `);
    const rows = await tx.$queryRaw<Array<Omit<ClaimedDelivery, "leaseOwner">>>(Prisma.sql`
      SELECT "id", "businessId", "reminderId", "connectionId", "templateId", "attemptCount"
      FROM "SmartReminderDelivery"
      WHERE "status" IN ('queued','retry_scheduled')
        AND "nextAttemptAt" <= ${now} AND "leaseExpiresAt" IS NULL
      ORDER BY "nextAttemptAt", "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const delivery = rows[0];
    if (!delivery) return null;
    const leaseOwner = workerId.slice(0, 100);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "status" = 'processing', "leaseOwner" = ${leaseOwner}, "leaseExpiresAt" = ${new Date(now.getTime() + 60_000)},
          "attemptCount" = "attemptCount" + 1, "updatedAt" = ${now}
      WHERE "id" = ${delivery.id} AND "businessId" = ${delivery.businessId}
    `);
    return { ...delivery, attemptCount: delivery.attemptCount + 1, leaseOwner };
  });
}

async function releaseAs(database: PrismaClient, delivery: ClaimedDelivery, status: string, now: Date, errorCode?: string, nextAttemptAt?: Date) {
  const changed = await database.$executeRaw(Prisma.sql`
    UPDATE "SmartReminderDelivery"
    SET "status" = ${status}, "leaseOwner" = NULL, "leaseExpiresAt" = NULL, "lastErrorCode" = ${errorCode ?? null},
        "nextAttemptAt" = ${nextAttemptAt ?? now}, "failedAt" = ${["failed", "delivery_unknown"].includes(status) ? now : null}, "updatedAt" = ${now}
    WHERE "id" = ${delivery.id} AND "businessId" = ${delivery.businessId}
      AND "status" = 'processing' AND "leaseOwner" = ${delivery.leaseOwner}
  `);
  if (changed !== 1) throw new Error("REMINDER_DELIVERY_LEASE_LOST");
}

async function loadContext(database: PrismaClient, delivery: ClaimedDelivery) {
  const rows = await database.$queryRaw<ReminderContext[]>(Prisma.sql`
    SELECT r."id" AS "reminderId", r."businessId", r."title", r."body", r."recipientPhoneE164", r."status" AS "reminderStatus",
           c."id" AS "connectionId", c."provider" AS "connectionProvider", c."status" AS "connectionStatus", c."phoneNumberId", c."credentialEnvelope",
           t."id" AS "templateId", t."provider" AS "templateProvider", t."status" AS "templateStatus", t."name" AS "templateName", t."language" AS "templateLanguage", t."components" AS "templateComponents",
           b."whatsapp" AS "businessWhatsapp", b."phone" AS "businessPhone"
    FROM "SmartReminderDelivery" d
    JOIN "SmartReminder" r ON r."id" = d."reminderId" AND r."businessId" = d."businessId" AND r."connectionId" = d."connectionId"
    JOIN "WhatsAppConnection" c ON c."id" = d."connectionId" AND c."businessId" = d."businessId"
    JOIN "WhatsAppTemplate" t ON t."id" = d."templateId" AND t."businessId" = d."businessId" AND t."connectionId" = d."connectionId"
    JOIN "Business" b ON b."id" = d."businessId" AND b."deletedAt" IS NULL
    WHERE d."id" = ${delivery.id} AND d."businessId" = ${delivery.businessId}
      AND d."reminderId" = ${delivery.reminderId} AND d."connectionId" = ${delivery.connectionId} AND d."templateId" = ${delivery.templateId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

function recipientStillOwnedByBusiness(context: ReminderContext) {
  const allowed = [context.businessWhatsapp, context.businessPhone]
    .map((value) => normalizeE164(value, "966"))
    .filter((value): value is string => Boolean(value));
  return [...new Set(allowed)].includes(context.recipientPhoneE164);
}

async function acquireRateSlot(database: PrismaClient, delivery: ClaimedDelivery, limit: number, now: Date) {
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const rows = await database.$queryRaw<Array<{ sentCount: number }>>(Prisma.sql`
    INSERT INTO "WhatsAppSendRateBucket" ("connectionId", "businessId", "windowStart", "sentCount", "updatedAt")
    VALUES (${delivery.connectionId}, ${delivery.businessId}, ${windowStart}, 1, ${now})
    ON CONFLICT ("connectionId", "windowStart") DO UPDATE
      SET "sentCount" = "WhatsAppSendRateBucket"."sentCount" + 1, "updatedAt" = ${now}
      WHERE "WhatsAppSendRateBucket"."businessId" = ${delivery.businessId}
        AND "WhatsAppSendRateBucket"."sentCount" < ${limit}
    RETURNING "sentCount"
  `);
  return rows.length > 0;
}

export async function processNextSmartReminderDelivery(input: {
  database?: PrismaClient; workerId?: string; now?: Date; fetcher?: typeof fetch; env?: NodeJS.ProcessEnv; config?: MetaWhatsAppConfig;
} = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  assertOutboundEnabled(env);
  const delivery = await claimNext(database, input.workerId ?? `reminder-delivery-${randomUUID()}`, now);
  if (!delivery) return { processed: false as const };

  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: delivery.businessId, database, now })) {
    await releaseAs(database, delivery, "cancelled", now, "WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED");
    return { processed: true as const, result: "entitlement_required" as const, deliveryId: delivery.id };
  }

  const context = await loadContext(database, delivery);
  if (!context) {
    await releaseAs(database, delivery, "failed", now, "REMINDER_DELIVERY_CONTEXT_MISSING");
    return { processed: true as const, result: "failed" as const, deliveryId: delivery.id };
  }
  if (context.reminderStatus !== "scheduled") {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_NOT_ACTIVE");
    return { processed: true as const, result: "cancelled" as const, deliveryId: delivery.id };
  }
  if (!recipientStillOwnedByBusiness(context)) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_RECIPIENT_OWNERSHIP_CHANGED");
    return { processed: true as const, result: "recipient_changed" as const, deliveryId: delivery.id };
  }
  if (context.connectionProvider !== "meta" || context.connectionStatus !== "connected" || context.templateProvider !== "meta" || context.templateStatus !== "approved" || !reminderTemplateSupportsBodyParameter(context.templateComponents)) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_OUTBOUND_CONFIGURATION_NOT_ACTIVE");
    return { processed: true as const, result: "cancelled" as const, deliveryId: delivery.id };
  }
  const consent = await database.whatsAppConsent.findFirst({
    where: { businessId: delivery.businessId, phoneE164: context.recipientPhoneE164, revokedAt: null, consentedAt: { lte: now } }, select: { id: true },
  });
  if (!consent) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_RECIPIENT_CONSENT_REQUIRED");
    return { processed: true as const, result: "consent_required" as const, deliveryId: delivery.id };
  }
  if (!await acquireRateSlot(database, delivery, outboundRateLimit(env), now)) {
    const nextMinute = new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000);
    await releaseAs(database, delivery, "retry_scheduled", now, "LOCAL_RATE_LIMIT", nextMinute);
    return { processed: true as const, result: "rate_limited" as const, deliveryId: delivery.id };
  }

  let config: MetaWhatsAppConfig;
  let accessToken: string;
  try {
    config = input.config ?? getMetaWhatsAppConfig(env);
    accessToken = decryptWhatsAppCredential({ envelope: credentialEnvelope(context.credentialEnvelope), encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: delivery.businessId });
  } catch {
    await releaseAs(database, delivery, "failed", now, "OUTBOUND_CONFIGURATION_INVALID");
    return { processed: true as const, result: "failed" as const, deliveryId: delivery.id };
  }

  const reminderText = `${context.title}\n${context.body}`.slice(0, 4096);
  const template = {
    name: context.templateName,
    language: { code: context.templateLanguage },
    components: [{ type: "body", parameters: [{ type: "text", text: reminderText }] }],
  };
  let response: Response;
  try {
    response = await (input.fetcher ?? fetch)(metaWhatsAppGraphUrl(config, `${context.phoneNumberId}/messages`), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: context.recipientPhoneE164, type: "template", template }),
    });
  } catch {
    await releaseAs(database, delivery, "delivery_unknown", now, "META_NETWORK_OUTCOME_UNKNOWN");
    return { processed: true as const, result: "delivery_unknown" as const, deliveryId: delivery.id };
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const providerError = record(record(payload)?.error);
    const code = safeText(providerError?.code) ?? `HTTP_${response.status}`;
    if (isRetryableMetaStatus(response.status) && delivery.attemptCount < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await releaseAs(database, delivery, "retry_scheduled", now, code, new Date(now.getTime() + retryDelayMs(delivery.attemptCount, Number.isFinite(retryAfter) ? retryAfter : null)));
      return { processed: true as const, result: "retry_scheduled" as const, deliveryId: delivery.id };
    }
    await releaseAs(database, delivery, "failed", now, code);
    return { processed: true as const, result: "failed" as const, deliveryId: delivery.id };
  }
  const providerMessageId = safeText(Array.isArray(record(payload)?.messages) ? record((record(payload)?.messages as unknown[])[0])?.id : null);
  if (!providerMessageId) {
    await releaseAs(database, delivery, "delivery_unknown", now, "META_SUCCESS_RESPONSE_INVALID");
    return { processed: true as const, result: "delivery_unknown" as const, deliveryId: delivery.id };
  }

  await database.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.upsert({
      where: { businessId_phoneNumberId_customerPhoneE164: { businessId: delivery.businessId, phoneNumberId: context.phoneNumberId, customerPhoneE164: context.recipientPhoneE164 } },
      create: { id: randomUUID(), businessId: delivery.businessId, phoneNumberId: context.phoneNumberId, customerPhoneE164: context.recipientPhoneE164, lastMessageAt: now, lastOutboundAt: now },
      update: { lastMessageAt: now, lastOutboundAt: now }, select: { id: true },
    });
    await tx.whatsAppMessage.upsert({
      where: { provider_providerMessageId: { provider: "meta", providerMessageId } },
      create: { id: randomUUID(), businessId: delivery.businessId, conversationId: conversation.id, provider: "meta", providerMessageId, direction: "outbound", messageType: "template", status: "sent", sentAt: now },
      update: {},
    });
    const changed = await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "status" = 'sent', "providerMessageId" = ${providerMessageId}, "leaseOwner" = NULL, "leaseExpiresAt" = NULL,
          "lastErrorCode" = NULL, "sentAt" = ${now}, "failedAt" = NULL, "updatedAt" = ${now}
      WHERE "id" = ${delivery.id} AND "businessId" = ${delivery.businessId}
        AND "status" = 'processing' AND "leaseOwner" = ${delivery.leaseOwner}
    `);
    if (changed !== 1) throw new Error("REMINDER_DELIVERY_LEASE_LOST");
    await writeWhatsAppAuditLog({ businessId: delivery.businessId, actorType: "worker", action: "reminder.delivery.send", targetType: "smart_reminder_delivery", targetId: delivery.id, outcome: "success", metadata: { reminderId: delivery.reminderId }, database: tx });
  });
  return { processed: true as const, result: "sent" as const, deliveryId: delivery.id, providerMessageId };
}

export async function runSmartReminderDeliveryWorker(input: Parameters<typeof processNextSmartReminderDelivery>[0] & { limit?: number } = {}) {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  let processed = 0;
  for (let index = 0; index < limit; index += 1) {
    const result = await processNextSmartReminderDelivery(input);
    if (!result.processed) break;
    processed += 1;
  }
  return { processed };
}
