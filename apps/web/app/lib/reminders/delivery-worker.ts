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
import { getInfroReminderWhatsAppConfig, infroReminderWhatsAppGraphUrl } from "./platform-whatsapp";

const MAX_ATTEMPTS = 8;
const REMINDER_CONSENT_EVIDENCE = "dashboard_explicit_reminder_opt_in_v1";
type JsonRecord = Record<string, unknown>;
type ClaimedDelivery = {
  id: string;
  businessId: string;
  reminderId: string;
  connectionId: string | null;
  templateId: string | null;
  whatsappSenderMode: string;
  channel: string;
  occurrenceAt: Date;
  attemptCount: number;
  leaseOwner: string;
};
type ReminderContext = {
  reminderId: string;
  businessId: string;
  createdByUserId: string;
  title: string;
  body: string;
  recipientPhoneE164: string | null;
  recipientConsentedAt: Date | null;
  recipientConsentEvidence: string | null;
  reminderStatus: string;
  recurrenceType: string;
  nextOccurrenceAt: Date | null;
  connectionId: string | null;
  connectionProvider: string | null;
  connectionStatus: string | null;
  phoneNumberId: string | null;
  credentialEnvelope: Prisma.JsonValue | null;
  templateId: string | null;
  templateProvider: string | null;
  templateStatus: string | null;
  templateName: string | null;
  templateLanguage: string | null;
  templateComponents: Prisma.JsonValue | null;
  businessWhatsapp: string | null;
  businessPhone: string | null;
  userEmail: string;
  userDeletedAt: Date | null;
};

const record = (value: unknown): JsonRecord | null => value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
const safeText = (value: unknown, limit = 256) => typeof value === "string" ? value.slice(0, limit) : null;

function credentialEnvelope(value: Prisma.JsonValue): WhatsAppCredentialEnvelope {
  const item = record(value);
  if (item?.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string" || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") throw new Error("META_WHATSAPP_CREDENTIAL_ENVELOPE_INVALID");
  return item as WhatsAppCredentialEnvelope;
}

async function claimNext(database: PrismaClient, workerId: string, now: Date) {
  return database.$transaction(async (tx) => {
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "status"='delivery_unknown', "leaseOwner"=NULL, "leaseExpiresAt"=NULL,
          "lastErrorCode"='WORKER_LEASE_EXPIRED', "failedAt"=${now}, "updatedAt"=${now}
      WHERE "status"='processing' AND "leaseExpiresAt"<${now}
    `);
    const rows = await tx.$queryRaw<Array<Omit<ClaimedDelivery, "leaseOwner">>>(Prisma.sql`
      SELECT "id", "businessId", "reminderId", "connectionId", "templateId", "whatsappSenderMode", "channel", "occurrenceAt", "attemptCount"
      FROM "SmartReminderDelivery"
      WHERE "status" IN ('queued','retry_scheduled') AND "nextAttemptAt"<=${now} AND "leaseExpiresAt" IS NULL
      ORDER BY "nextAttemptAt", "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1
    `);
    const delivery = rows[0];
    if (!delivery) return null;
    const leaseOwner = workerId.slice(0, 100);
    await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "status"='processing', "leaseOwner"=${leaseOwner}, "leaseExpiresAt"=${new Date(now.getTime() + 60_000)},
          "attemptCount"="attemptCount"+1, "updatedAt"=${now}
      WHERE "id"=${delivery.id} AND "businessId"=${delivery.businessId}
    `);
    return { ...delivery, attemptCount: delivery.attemptCount + 1, leaseOwner };
  });
}

async function releaseAs(database: PrismaClient, delivery: ClaimedDelivery, status: string, now: Date, errorCode?: string, nextAttemptAt?: Date) {
  await database.$transaction(async (tx) => {
    const changed = await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "status"=${status}, "leaseOwner"=NULL, "leaseExpiresAt"=NULL, "lastErrorCode"=${errorCode ?? null},
          "nextAttemptAt"=${nextAttemptAt ?? now}, "failedAt"=${["failed", "delivery_unknown"].includes(status) ? now : null}, "updatedAt"=${now}
      WHERE "id"=${delivery.id} AND "businessId"=${delivery.businessId} AND "status"='processing' AND "leaseOwner"=${delivery.leaseOwner}
    `);
    if (changed !== 1) throw new Error("REMINDER_DELIVERY_LEASE_LOST");
    await writeWhatsAppAuditLog({ businessId: delivery.businessId, actorType: "worker", action: "reminder.delivery.transition", targetType: "smart_reminder_delivery", targetId: delivery.id, outcome: status === "cancelled" ? "cancelled" : "failed", metadata: { reminderId: delivery.reminderId, deliveryStatus: status, channel: delivery.channel, reason: errorCode ?? null }, database: tx });
  });
}

async function loadContext(database: PrismaClient, delivery: ClaimedDelivery) {
  const rows = await database.$queryRaw<ReminderContext[]>(Prisma.sql`
    SELECT r."id" AS "reminderId", r."businessId", r."createdByUserId", r."title", r."body",
           r."recipientPhoneE164", r."recipientConsentedAt", r."recipientConsentEvidence", r."status" AS "reminderStatus",
           r."recurrenceType", r."nextOccurrenceAt",
           c."id" AS "connectionId", c."provider" AS "connectionProvider", c."status" AS "connectionStatus", c."phoneNumberId", c."credentialEnvelope",
           t."id" AS "templateId", t."provider" AS "templateProvider", t."status" AS "templateStatus", t."name" AS "templateName", t."language" AS "templateLanguage", t."components" AS "templateComponents",
           b."whatsapp" AS "businessWhatsapp", b."phone" AS "businessPhone", u."email" AS "userEmail", u."deletedAt" AS "userDeletedAt"
    FROM "SmartReminderDelivery" d
    JOIN "SmartReminder" r ON r."id"=d."reminderId" AND r."businessId"=d."businessId"
    JOIN "Business" b ON b."id"=d."businessId" AND b."deletedAt" IS NULL
    JOIN "User" u ON u."id"=r."createdByUserId"
    LEFT JOIN "WhatsAppConnection" c ON c."id"=d."connectionId" AND c."businessId"=d."businessId"
    LEFT JOIN "WhatsAppTemplate" t ON t."id"=d."templateId" AND t."businessId"=d."businessId" AND t."connectionId"=d."connectionId"
    WHERE d."id"=${delivery.id} AND d."businessId"=${delivery.businessId} AND d."reminderId"=${delivery.reminderId}
    LIMIT 1
  `);
  return rows[0] ?? null;
}

function recipientStillOwnedByBusiness(context: ReminderContext) {
  if (!context.recipientPhoneE164) return false;
  const allowed = [context.businessWhatsapp, context.businessPhone].map((value) => normalizeE164(value, "966")).filter((value): value is string => Boolean(value));
  return [...new Set(allowed)].includes(context.recipientPhoneE164);
}

async function acquireRateSlot(database: PrismaClient, input: { connectionId: string; businessId: string }, limit: number, now: Date) {
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const rows = await database.$queryRaw<Array<{ sentCount: number }>>(Prisma.sql`
    INSERT INTO "WhatsAppSendRateBucket" ("connectionId","businessId","windowStart","sentCount","updatedAt")
    VALUES (${input.connectionId},${input.businessId},${windowStart},1,${now})
    ON CONFLICT ("connectionId","windowStart") DO UPDATE
    SET "sentCount"="WhatsAppSendRateBucket"."sentCount"+1,"updatedAt"=${now}
    WHERE "WhatsAppSendRateBucket"."businessId"=${input.businessId} AND "WhatsAppSendRateBucket"."sentCount"<${limit}
    RETURNING "sentCount"
  `);
  return rows.length > 0;
}

async function acquirePlatformRateSlot(database: PrismaClient, limit: number, now: Date) {
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const rows = await database.$queryRaw<Array<{ sentCount: number }>>(Prisma.sql`
    INSERT INTO "InfroReminderWhatsAppRateBucket" ("windowStart","sentCount","updatedAt")
    VALUES (${windowStart},1,${now})
    ON CONFLICT ("windowStart") DO UPDATE
    SET "sentCount"="InfroReminderWhatsAppRateBucket"."sentCount"+1,"updatedAt"=${now}
    WHERE "InfroReminderWhatsAppRateBucket"."sentCount"<${limit}
    RETURNING "sentCount"
  `);
  return rows.length > 0;
}

async function markSent(database: PrismaClient, delivery: ClaimedDelivery, context: ReminderContext, now: Date, providerMessageId?: string | null) {
  await database.$transaction(async (tx) => {
    const changed = await tx.$executeRaw(Prisma.sql`
      UPDATE "SmartReminderDelivery"
      SET "status"='sent', "providerMessageId"=${providerMessageId ?? null}, "leaseOwner"=NULL, "leaseExpiresAt"=NULL,
          "lastErrorCode"=NULL, "sentAt"=${now}, "failedAt"=NULL, "updatedAt"=${now}
      WHERE "id"=${delivery.id} AND "businessId"=${delivery.businessId} AND "status"='processing' AND "leaseOwner"=${delivery.leaseOwner}
    `);
    if (changed !== 1) throw new Error("REMINDER_DELIVERY_LEASE_LOST");
    const pending = await tx.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count" FROM "SmartReminderDelivery"
      WHERE "businessId"=${delivery.businessId} AND "reminderId"=${delivery.reminderId} AND "occurrenceAt"=${delivery.occurrenceAt}
        AND "status" NOT IN ('sent','cancelled')
    `);
    const completed = context.recurrenceType === "once" && context.nextOccurrenceAt === null && Number(pending[0]?.count ?? 0) === 0
      ? await tx.$executeRaw(Prisma.sql`UPDATE "SmartReminder" SET "status"='completed',"completedAt"=${now},"updatedAt"=${now} WHERE "id"=${delivery.reminderId} AND "businessId"=${delivery.businessId} AND "status"='scheduled' AND "recurrenceType"='once' AND "nextOccurrenceAt" IS NULL`)
      : 0;
    await writeWhatsAppAuditLog({ businessId: delivery.businessId, actorType: "worker", action: "reminder.delivery.send", targetType: "smart_reminder_delivery", targetId: delivery.id, outcome: "success", metadata: { reminderId: delivery.reminderId, channel: delivery.channel, whatsappSenderMode: delivery.channel === "whatsapp" ? delivery.whatsappSenderMode : null }, database: tx });
    if (completed === 1) await writeWhatsAppAuditLog({ businessId: delivery.businessId, actorType: "worker", action: "reminder.complete", targetType: "smart_reminder", targetId: delivery.reminderId, outcome: "success", metadata: { source: "confirmed_delivery" }, database: tx });
  });
}

async function persistWhatsAppMessage(database: PrismaClient, input: { delivery: ClaimedDelivery; phoneNumberId: string; recipientPhoneE164: string; providerMessageId: string; now: Date }) {
  await database.$transaction(async (tx) => {
    const conversation = await tx.whatsAppConversation.upsert({
      where: { businessId_phoneNumberId_customerPhoneE164: { businessId: input.delivery.businessId, phoneNumberId: input.phoneNumberId, customerPhoneE164: input.recipientPhoneE164 } },
      create: { id: randomUUID(), businessId: input.delivery.businessId, phoneNumberId: input.phoneNumberId, customerPhoneE164: input.recipientPhoneE164, lastMessageAt: input.now, lastOutboundAt: input.now },
      update: { lastMessageAt: input.now, lastOutboundAt: input.now }, select: { id: true },
    });
    await tx.whatsAppMessage.upsert({
      where: { provider_providerMessageId: { provider: "meta", providerMessageId: input.providerMessageId } },
      create: { id: randomUUID(), businessId: input.delivery.businessId, conversationId: conversation.id, provider: "meta", providerMessageId: input.providerMessageId, direction: "outbound", messageType: "template", status: "sent", sentAt: input.now }, update: {},
    });
  });
}

async function sendEmailReminder(delivery: ClaimedDelivery, context: ReminderContext, now: Date, fetcher: typeof fetch, env: NodeJS.ProcessEnv, database: PrismaClient) {
  const apiKey = String(env.RESEND_API_KEY ?? "").trim();
  const from = String(env.REMINDER_FROM_EMAIL ?? "").trim();
  if (!apiKey || !from || context.userDeletedAt || !/^\S+@\S+\.\S+$/.test(context.userEmail)) {
    await releaseAs(database, delivery, "failed", now, "REMINDER_EMAIL_NOT_CONFIGURED");
    return "failed" as const;
  }
  let response: Response;
  try {
    response = await fetcher("https://api.resend.com/emails", {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "User-Agent": "INFRO/1.0", "Idempotency-Key": `infro-reminder-${delivery.id}` },
      body: JSON.stringify({ from, to: [context.userEmail], subject: `تذكير INFRO: ${context.title}`.slice(0, 180), text: `${context.title}\n\n${context.body}\n\nهذا تذكير أعمال قمت بجدولته في INFRO.` }),
    });
  } catch {
    await releaseAs(database, delivery, "delivery_unknown", now, "RESEND_NETWORK_OUTCOME_UNKNOWN");
    return "delivery_unknown" as const;
  }
  if (!response.ok) {
    if ((response.status === 429 || response.status >= 500) && delivery.attemptCount < MAX_ATTEMPTS) {
      await releaseAs(database, delivery, "retry_scheduled", now, `RESEND_HTTP_${response.status}`, new Date(now.getTime() + retryDelayMs(delivery.attemptCount, null)));
      return "retry_scheduled" as const;
    }
    await releaseAs(database, delivery, "failed", now, `RESEND_HTTP_${response.status}`);
    return "failed" as const;
  }
  const payload: unknown = await response.json().catch(() => null);
  const providerMessageId = safeText(record(payload)?.id);
  if (!providerMessageId) {
    await releaseAs(database, delivery, "delivery_unknown", now, "RESEND_SUCCESS_RESPONSE_INVALID");
    return "delivery_unknown" as const;
  }
  await markSent(database, delivery, context, now, providerMessageId);
  return "sent" as const;
}

async function sendInAppReminder(delivery: ClaimedDelivery, context: ReminderContext, now: Date, database: PrismaClient) {
  if (context.userDeletedAt) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_USER_INACTIVE");
    return "cancelled" as const;
  }
  await database.$executeRaw(Prisma.sql`
    INSERT INTO "SmartReminderNotification" ("id","businessId","userId","reminderId","deliveryId","title","body","occurredAt","createdAt")
    VALUES (${randomUUID()},${delivery.businessId},${context.createdByUserId},${delivery.reminderId},${delivery.id},${context.title},${context.body},${delivery.occurrenceAt},${now})
    ON CONFLICT ("deliveryId") DO NOTHING
  `);
  await markSent(database, delivery, context, now, null);
  return "sent" as const;
}

async function commonWhatsAppSafety(database: PrismaClient, delivery: ClaimedDelivery, context: ReminderContext, now: Date) {
  if (context.userDeletedAt) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_USER_INACTIVE");
    return "cancelled" as const;
  }
  if (!context.recipientPhoneE164 || !context.recipientConsentedAt || !recipientStillOwnedByBusiness(context)) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_RECIPIENT_OWNERSHIP_CHANGED");
    return "recipient_changed" as const;
  }
  if (context.recipientConsentEvidence !== REMINDER_CONSENT_EVIDENCE || context.recipientConsentedAt.getTime() > now.getTime()) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_RECIPIENT_CONSENT_REQUIRED");
    return "consent_required" as const;
  }
  const contact = await database.whatsAppContact.findFirst({ where: { businessId: delivery.businessId, phoneE164: context.recipientPhoneE164 }, select: { optedOutAt: true } });
  if (contact?.optedOutAt) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_RECIPIENT_OPTED_OUT");
    return "opted_out" as const;
  }
  return null;
}

async function sendPlatformWhatsAppReminder(delivery: ClaimedDelivery, context: ReminderContext, now: Date, fetcher: typeof fetch, env: NodeJS.ProcessEnv, database: PrismaClient) {
  assertOutboundEnabled(env);
  const safety = await commonWhatsAppSafety(database, delivery, context, now);
  if (safety) return safety;
  const config = getInfroReminderWhatsAppConfig(env);
  if (!config) {
    await releaseAs(database, delivery, "failed", now, "INFRO_REMINDER_WHATSAPP_NOT_CONFIGURED");
    return "failed" as const;
  }
  if (!await acquirePlatformRateSlot(database, config.ratePerMinute, now)) {
    const nextMinute = new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000);
    await releaseAs(database, delivery, "retry_scheduled", now, "INFRO_REMINDER_RATE_LIMIT", nextMinute);
    return "rate_limited" as const;
  }

  const reminderText = `${context.title}\n${context.body}`.slice(0, 4096);
  const template = { name: config.templateName, language: { code: config.templateLanguage }, components: [{ type: "body", parameters: [{ type: "text", text: reminderText }] }] };
  let response: Response;
  try {
    response = await fetcher(infroReminderWhatsAppGraphUrl(config), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${config.accessToken}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: context.recipientPhoneE164, type: "template", template }),
    });
  } catch {
    await releaseAs(database, delivery, "delivery_unknown", now, "META_NETWORK_OUTCOME_UNKNOWN");
    return "delivery_unknown" as const;
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const providerError = record(record(payload)?.error);
    const code = safeText(providerError?.code) ?? `HTTP_${response.status}`;
    if (isRetryableMetaStatus(response.status) && delivery.attemptCount < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await releaseAs(database, delivery, "retry_scheduled", now, code, new Date(now.getTime() + retryDelayMs(delivery.attemptCount, Number.isFinite(retryAfter) ? retryAfter : null)));
      return "retry_scheduled" as const;
    }
    await releaseAs(database, delivery, "failed", now, code);
    return "failed" as const;
  }
  const providerMessageId = safeText(Array.isArray(record(payload)?.messages) ? record((record(payload)?.messages as unknown[])[0])?.id : null);
  if (!providerMessageId) {
    await releaseAs(database, delivery, "delivery_unknown", now, "META_SUCCESS_RESPONSE_INVALID");
    return "delivery_unknown" as const;
  }
  await persistWhatsAppMessage(database, { delivery, phoneNumberId: config.phoneNumberId, recipientPhoneE164: context.recipientPhoneE164!, providerMessageId, now });
  await markSent(database, delivery, context, now, providerMessageId);
  return "sent" as const;
}

async function sendTenantWhatsAppReminder(delivery: ClaimedDelivery, context: ReminderContext, now: Date, fetcher: typeof fetch, env: NodeJS.ProcessEnv, database: PrismaClient, suppliedConfig?: MetaWhatsAppConfig) {
  assertOutboundEnabled(env);
  const safety = await commonWhatsAppSafety(database, delivery, context, now);
  if (safety) return safety;
  if (!delivery.connectionId || !delivery.templateId || !context.connectionId || !context.templateId || !context.phoneNumberId || context.credentialEnvelope === null) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_WHATSAPP_BINDING_MISSING");
    return "cancelled" as const;
  }
  if (context.connectionId !== delivery.connectionId || context.templateId !== delivery.templateId) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_WHATSAPP_BINDING_MISMATCH");
    return "cancelled" as const;
  }
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: delivery.businessId, database, now })) {
    await releaseAs(database, delivery, "cancelled", now, "WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED");
    return "entitlement_required" as const;
  }
  if (context.connectionProvider !== "meta" || context.connectionStatus !== "connected" || context.templateProvider !== "meta" || context.templateStatus !== "approved" || !context.templateName || !context.templateLanguage || !reminderTemplateSupportsBodyParameter(context.templateComponents)) {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_OUTBOUND_CONFIGURATION_NOT_ACTIVE");
    return "cancelled" as const;
  }
  if (!await acquireRateSlot(database, { connectionId: delivery.connectionId, businessId: delivery.businessId }, outboundRateLimit(env), now)) {
    const nextMinute = new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000);
    await releaseAs(database, delivery, "retry_scheduled", now, "LOCAL_RATE_LIMIT", nextMinute);
    return "rate_limited" as const;
  }

  let config: MetaWhatsAppConfig;
  let accessToken: string;
  try {
    config = suppliedConfig ?? getMetaWhatsAppConfig(env);
    accessToken = decryptWhatsAppCredential({ envelope: credentialEnvelope(context.credentialEnvelope), encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: delivery.businessId });
  } catch {
    await releaseAs(database, delivery, "failed", now, "OUTBOUND_CONFIGURATION_INVALID");
    return "failed" as const;
  }

  const reminderText = `${context.title}\n${context.body}`.slice(0, 4096);
  const template = { name: context.templateName, language: { code: context.templateLanguage }, components: [{ type: "body", parameters: [{ type: "text", text: reminderText }] }] };
  let response: Response;
  try {
    response = await fetcher(metaWhatsAppGraphUrl(config, `${context.phoneNumberId}/messages`), {
      method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000),
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: context.recipientPhoneE164, type: "template", template }),
    });
  } catch {
    await releaseAs(database, delivery, "delivery_unknown", now, "META_NETWORK_OUTCOME_UNKNOWN");
    return "delivery_unknown" as const;
  }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const providerError = record(record(payload)?.error);
    const code = safeText(providerError?.code) ?? `HTTP_${response.status}`;
    if (isRetryableMetaStatus(response.status) && delivery.attemptCount < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await releaseAs(database, delivery, "retry_scheduled", now, code, new Date(now.getTime() + retryDelayMs(delivery.attemptCount, Number.isFinite(retryAfter) ? retryAfter : null)));
      return "retry_scheduled" as const;
    }
    await releaseAs(database, delivery, "failed", now, code);
    return "failed" as const;
  }
  const providerMessageId = safeText(Array.isArray(record(payload)?.messages) ? record((record(payload)?.messages as unknown[])[0])?.id : null);
  if (!providerMessageId) {
    await releaseAs(database, delivery, "delivery_unknown", now, "META_SUCCESS_RESPONSE_INVALID");
    return "delivery_unknown" as const;
  }
  await persistWhatsAppMessage(database, { delivery, phoneNumberId: context.phoneNumberId, recipientPhoneE164: context.recipientPhoneE164!, providerMessageId, now });
  await markSent(database, delivery, context, now, providerMessageId);
  return "sent" as const;
}

export async function processNextSmartReminderDelivery(input: { database?: PrismaClient; workerId?: string; now?: Date; fetcher?: typeof fetch; env?: NodeJS.ProcessEnv; config?: MetaWhatsAppConfig } = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const fetcher = input.fetcher ?? fetch;
  const delivery = await claimNext(database, input.workerId ?? `reminder-delivery-${randomUUID()}`, now);
  if (!delivery) return { processed: false as const };

  const context = await loadContext(database, delivery);
  if (!context) {
    await releaseAs(database, delivery, "failed", now, "REMINDER_DELIVERY_CONTEXT_MISSING");
    return { processed: true as const, result: "failed" as const, deliveryId: delivery.id };
  }
  if (context.reminderStatus !== "scheduled") {
    await releaseAs(database, delivery, "cancelled", now, "REMINDER_NOT_ACTIVE");
    return { processed: true as const, result: "cancelled" as const, deliveryId: delivery.id };
  }

  if (delivery.channel === "email") {
    const result = await sendEmailReminder(delivery, context, now, fetcher, env, database);
    return { processed: true as const, result, deliveryId: delivery.id };
  }
  if (delivery.channel === "in_app") {
    const result = await sendInAppReminder(delivery, context, now, database);
    return { processed: true as const, result, deliveryId: delivery.id };
  }
  if (delivery.channel !== "whatsapp") {
    await releaseAs(database, delivery, "failed", now, "REMINDER_CHANNEL_UNSUPPORTED");
    return { processed: true as const, result: "failed" as const, deliveryId: delivery.id };
  }

  if (delivery.whatsappSenderMode === "platform") {
    const result = await sendPlatformWhatsAppReminder(delivery, context, now, fetcher, env, database);
    return { processed: true as const, result, deliveryId: delivery.id };
  }
  const result = await sendTenantWhatsAppReminder(delivery, context, now, fetcher, env, database, input.config);
  return { processed: true as const, result, deliveryId: delivery.id };
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
