import "server-only";
import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { decryptWhatsAppCredential, type WhatsAppCredentialEnvelope } from "./credential-envelope";
import { assertOutboundEnabled, isRetryableMetaStatus, outboundRateLimit, retryDelayMs, WHATSAPP_DELIVERY_MAX_ATTEMPTS } from "./delivery-domain";
import { whatsAppCustomerServiceWindow } from "./inbox-domain";
import { getMetaWhatsAppConfig, metaWhatsAppGraphUrl, type MetaWhatsAppConfig } from "./meta-config";
import { hasActiveWhatsAppMarketingEntitlement } from "./feature-entitlement";

type Job = { id: string; businessId: string; connectionId: string; conversationId: string; attemptCount: number };
const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
const safeText = (value: unknown, limit = 512) => typeof value === "string" ? value.slice(0, limit) : null;
function envelope(value: Prisma.JsonValue) { const item = record(value); if (item?.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string" || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") throw new Error("META_WHATSAPP_CREDENTIAL_ENVELOPE_INVALID"); return item as WhatsAppCredentialEnvelope; }

async function claim(database: PrismaClient, workerId: string, now: Date) {
  return database.$transaction(async (tx) => {
    await tx.whatsAppReplyJob.updateMany({ where: { status: "processing", leaseExpiresAt: { lt: now } }, data: { status: "delivery_unknown", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "WORKER_LEASE_EXPIRED" } });
    const rows = await tx.$queryRaw<Job[]>(Prisma.sql`SELECT "id", "businessId", "connectionId", "conversationId", "attemptCount" FROM "WhatsAppReplyJob" WHERE "status" IN ('queued','retry_scheduled') AND "nextAttemptAt" <= ${now} AND "leaseExpiresAt" IS NULL ORDER BY "nextAttemptAt", "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`);
    const job = rows[0]; if (!job) return null;
    await tx.whatsAppReplyJob.update({ where: { id: job.id }, data: { status: "processing", leaseOwner: workerId, leaseExpiresAt: new Date(now.getTime() + 60_000), attemptCount: { increment: 1 } } });
    return { ...job, attemptCount: job.attemptCount + 1 };
  });
}
async function release(database: PrismaClient, id: string, status: string, data: Prisma.WhatsAppReplyJobUpdateInput = {}) { await database.whatsAppReplyJob.update({ where: { id }, data: { ...data, status, leaseOwner: null, leaseExpiresAt: null } }); }

export async function processNextWhatsAppReply(input: { database?: PrismaClient; workerId?: string; now?: Date; fetcher?: typeof fetch; env?: NodeJS.ProcessEnv; config?: MetaWhatsAppConfig } = {}) {
  const database = input.database ?? db, now = input.now ?? new Date(), env = input.env ?? process.env;
  assertOutboundEnabled(env);
  const job = await claim(database, input.workerId ?? randomUUID(), now); if (!job) return { processed: false as const };
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: job.businessId, database, now })) { await release(database, job.id, "cancelled", { lastErrorCode: "WHATSAPP_MARKETING_ENTITLEMENT_REQUIRED" }); return { processed: true as const, result: "entitlement_required" as const }; }
  const context = await database.whatsAppReplyJob.findFirst({ where: { id: job.id, businessId: job.businessId, connectionId: job.connectionId, conversationId: job.conversationId }, select: { id: true, textBody: true, conversation: { select: { id: true, customerPhoneE164: true, lastInboundAt: true } }, connection: { select: { provider: true, status: true, disabledAt: true, phoneNumberId: true, credentialEnvelope: true } } } });
  if (!context) throw new Error("WHATSAPP_REPLY_CONTEXT_MISSING");
  if (!whatsAppCustomerServiceWindow(context.conversation.lastInboundAt, now).open) { await release(database, job.id, "cancelled", { lastErrorCode: "CUSTOMER_SERVICE_WINDOW_CLOSED" }); return { processed: true as const, result: "window_closed" as const }; }
  if (context.connection.provider !== "meta" || context.connection.status !== "connected" || context.connection.disabledAt) { await release(database, job.id, "failed", { lastErrorCode: "CONNECTION_NOT_READY" }); return { processed: true as const, result: "failed" as const }; }
  let config: MetaWhatsAppConfig, token: string;
  try { config = input.config ?? getMetaWhatsAppConfig(env); token = decryptWhatsAppCredential({ envelope: envelope(context.connection.credentialEnvelope), encryptionKeyBase64: config.META_WHATSAPP_CREDENTIAL_ENCRYPTION_KEY, businessId: job.businessId }); }
  catch { await release(database, job.id, "failed", { lastErrorCode: "OUTBOUND_CONFIGURATION_INVALID" }); return { processed: true as const, result: "failed" as const }; }
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const slot = await database.$queryRaw<Array<{ sentCount: number }>>(Prisma.sql`INSERT INTO "WhatsAppSendRateBucket" ("connectionId","businessId","windowStart","sentCount","updatedAt") VALUES (${job.connectionId},${job.businessId},${windowStart},1,${now}) ON CONFLICT ("connectionId","windowStart") DO UPDATE SET "sentCount"="WhatsAppSendRateBucket"."sentCount"+1,"updatedAt"=${now} WHERE "WhatsAppSendRateBucket"."businessId"=${job.businessId} AND "WhatsAppSendRateBucket"."sentCount" < ${outboundRateLimit(env)} RETURNING "sentCount"`);
  if (!slot.length) { await release(database, job.id, "retry_scheduled", { nextAttemptAt: new Date((Math.floor(now.getTime() / 60_000) + 1) * 60_000), lastErrorCode: "LOCAL_RATE_LIMIT" }); return { processed: true as const, result: "rate_limited" as const }; }
  let response: Response;
  try { response = await (input.fetcher ?? fetch)(metaWhatsAppGraphUrl(config, `${context.connection.phoneNumberId}/messages`), { method: "POST", cache: "no-store", signal: AbortSignal.timeout(15_000), headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: context.conversation.customerPhoneE164, type: "text", text: { preview_url: false, body: context.textBody } }) }); }
  catch { await release(database, job.id, "delivery_unknown", { lastErrorCode: "META_NETWORK_OUTCOME_UNKNOWN" }); return { processed: true as const, result: "delivery_unknown" as const }; }
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) { const error = record(record(payload)?.error), code = safeText(error?.code) ?? `HTTP_${response.status}`, message = safeText(error?.message) ?? "Meta rejected the request"; if (isRetryableMetaStatus(response.status) && job.attemptCount < WHATSAPP_DELIVERY_MAX_ATTEMPTS) { await release(database, job.id, "retry_scheduled", { nextAttemptAt: new Date(now.getTime() + retryDelayMs(job.attemptCount)), lastErrorCode: code, lastErrorMessage: message }); return { processed: true as const, result: "retry_scheduled" as const }; } await release(database, job.id, "failed", { lastErrorCode: code, lastErrorMessage: message }); return { processed: true as const, result: "failed" as const }; }
  const providerMessageId = safeText(Array.isArray(record(payload)?.messages) ? record((record(payload)?.messages as unknown[])[0])?.id : null, 256);
  if (!providerMessageId) { await release(database, job.id, "delivery_unknown", { lastErrorCode: "META_SUCCESS_RESPONSE_INVALID" }); return { processed: true as const, result: "delivery_unknown" as const }; }
  await database.$transaction(async (tx) => { await tx.whatsAppMessage.create({ data: { id: randomUUID(), businessId: job.businessId, conversationId: context.conversation.id, provider: "meta", providerMessageId, direction: "outbound", messageType: "text", status: "sent", textBody: context.textBody, sentAt: now } }); await tx.whatsAppConversation.update({ where: { id: context.conversation.id }, data: { lastMessageAt: now, lastOutboundAt: now } }); await tx.whatsAppReplyJob.update({ where: { id: job.id }, data: { status: "sent", providerMessageId, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null, lastErrorMessage: null } }); });
  return { processed: true as const, result: "sent" as const, providerMessageId };
}
