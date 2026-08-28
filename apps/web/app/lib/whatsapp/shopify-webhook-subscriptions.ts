import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from "./commerce-credential-envelope";
import { getShopifyConfig, shopifyWebhookCallbackUrl } from "./shopify-config";

export const SHOPIFY_COMMERCE_WEBHOOK_TOPICS = ["CHECKOUTS_CREATE", "CHECKOUTS_UPDATE", "ORDERS_CREATE"] as const;
const MAX_ATTEMPTS = 8;
const LEASE_MS = 5 * 60_000;
const FETCH_TIMEOUT_MS = 12_000;

type ShopifyGraphqlPayload = {
  data?: {
    webhookSubscriptions?: { nodes?: Array<{ id?: unknown; topic?: unknown; uri?: unknown }>; pageInfo?: { hasNextPage?: unknown } };
    webhookSubscriptionCreate?: { webhookSubscription?: { id?: unknown; topic?: unknown; uri?: unknown }; userErrors?: Array<{ message?: unknown }> };
  };
  errors?: Array<{ message?: unknown }>;
};

function envelope(value: Prisma.JsonValue): CommerceCredentialEnvelope {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SHOPIFY_CREDENTIAL_INVALID");
  return value as CommerceCredentialEnvelope;
}

function accessToken(value: string) {
  try {
    const parsed = JSON.parse(value) as { accessToken?: unknown };
    if (typeof parsed.accessToken !== "string" || parsed.accessToken.length < 16) throw new Error();
    return parsed.accessToken;
  } catch {
    throw new Error("SHOPIFY_CREDENTIAL_INVALID");
  }
}

async function graphql(input: { shop: string; token: string; apiVersion: string; query: string; variables: Record<string, unknown> }) {
  const response = await fetch(`https://${input.shop}/admin/api/${input.apiVersion}/graphql.json`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "x-shopify-access-token": input.token },
    body: JSON.stringify({ query: input.query, variables: input.variables }),
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null) as ShopifyGraphqlPayload | null;
  if (!response.ok || !payload) throw new Error(`SHOPIFY_GRAPHQL_HTTP_${response.status}`);
  if (payload.errors?.length) throw new Error("SHOPIFY_GRAPHQL_ERROR");
  return payload;
}

async function reconcile(input: { shop: string; token: string; apiVersion: string; uri: string }) {
  const listed = await graphql({
    ...input,
    query: `query IRWebhookSubscriptions($topics: [WebhookSubscriptionTopic!], $uri: String) { webhookSubscriptions(first: 50, topics: $topics, uri: $uri) { nodes { id topic uri } pageInfo { hasNextPage } } }`,
    variables: { topics: SHOPIFY_COMMERCE_WEBHOOK_TOPICS, uri: input.uri },
  });
  const subscriptions = listed.data?.webhookSubscriptions;
  if (!subscriptions || subscriptions.pageInfo?.hasNextPage === true) throw new Error("SHOPIFY_WEBHOOK_LIST_INVALID");
  const existing = new Set((subscriptions.nodes ?? []).filter((node) => node.uri === input.uri).map((node) => String(node.topic ?? "")));
  const created: string[] = [];
  for (const topic of SHOPIFY_COMMERCE_WEBHOOK_TOPICS) {
    if (existing.has(topic)) continue;
    const result = await graphql({
      ...input,
      query: `mutation IRWebhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $subscription: WebhookSubscriptionInput!) { webhookSubscriptionCreate(topic: $topic, webhookSubscription: $subscription) { webhookSubscription { id topic uri } userErrors { message } } }`,
      variables: { topic, subscription: { uri: input.uri, format: "JSON" } },
    });
    const mutation = result.data?.webhookSubscriptionCreate;
    if (!mutation?.webhookSubscription || mutation.userErrors?.length) throw new Error("SHOPIFY_WEBHOOK_CREATE_FAILED");
    if (mutation.webhookSubscription.topic !== topic || mutation.webhookSubscription.uri !== input.uri) throw new Error("SHOPIFY_WEBHOOK_CREATE_INVALID");
    created.push(topic);
  }
  return { created, existing: SHOPIFY_COMMERCE_WEBHOOK_TOPICS.filter((topic) => existing.has(topic)) };
}

function retryAt(attempt: number, now: Date) {
  return new Date(now.getTime() + Math.min(60 * 60_000, 30_000 * (2 ** Math.max(0, attempt - 1))));
}

export async function retryShopifyWebhookSubscriptionSync(input: { businessId: string; integrationId: string; actorUserId: string; database?: PrismaClient; now?: Date }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    const integration = await tx.whatsAppCommerceIntegration.findFirst({ where: { id: input.integrationId, businessId: input.businessId, provider: "shopify", status: "active" }, select: { id: true } });
    if (!integration) throw new Error("SHOPIFY_INTEGRATION_UNAVAILABLE");
    const rows = await tx.$queryRaw<Array<{ id: string; status: string; leaseExpiresAt: Date | null }>>(Prisma.sql`
      SELECT "id", "status", "leaseExpiresAt" FROM "WhatsAppShopifyWebhookSync"
      WHERE "integrationId" = ${integration.id} AND "businessId" = ${input.businessId}
      FOR UPDATE
    `);
    const current = rows[0];
    const alreadyQueued = current?.status === "pending" || current?.status === "retry_scheduled"
      || (current?.status === "processing" && current.leaseExpiresAt !== null && current.leaseExpiresAt > now);
    if (!alreadyQueued && current) await tx.whatsAppShopifyWebhookSync.update({ where: { id: current.id }, data: { status: "pending", attemptCount: 0, nextAttemptAt: now, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null } });
    if (!current) await tx.whatsAppShopifyWebhookSync.create({ data: { businessId: input.businessId, integrationId: integration.id, nextAttemptAt: now } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "commerce.shopify.webhooks.retry", targetType: "commerce_integration", targetId: integration.id, outcome: "success", database: tx });
    return { alreadyQueued };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function processNextShopifyWebhookSubscriptionSync(input: { workerId: string; database?: PrismaClient; now?: Date }) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const workerId = input.workerId.slice(0, 100);
  const syncId = await database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "WhatsAppShopifyWebhookSync"
      WHERE ("status" IN ('pending','retry_scheduled') OR ("status" = 'processing' AND "leaseExpiresAt" < ${now}))
        AND "nextAttemptAt" <= ${now}
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC FOR UPDATE SKIP LOCKED LIMIT 1
    `);
    if (!rows[0]) return null;
    await tx.whatsAppShopifyWebhookSync.update({ where: { id: rows[0].id }, data: { status: "processing", attemptCount: { increment: 1 }, leaseOwner: workerId, leaseExpiresAt: new Date(now.getTime() + LEASE_MS), lastErrorCode: null } });
    return rows[0].id;
  });
  if (!syncId) return { processed: false as const, empty: true as const };

  try {
    const job = await database.whatsAppShopifyWebhookSync.findFirst({
      where: { id: syncId, status: "processing", leaseOwner: workerId },
      include: { integration: { select: { id: true, businessId: true, provider: true, status: true, externalStoreId: true, credentialEnvelope: true } } },
    });
    if (!job) throw new Error("SHOPIFY_WEBHOOK_SYNC_LEASE_LOST");
    if (job.integration.businessId !== job.businessId || job.integration.provider !== "shopify" || job.integration.status !== "active" || !job.integration.credentialEnvelope) throw new Error("SHOPIFY_INTEGRATION_UNAVAILABLE");
    const config = getShopifyConfig();
    const plaintext = decryptCommerceCredential({ envelope: envelope(job.integration.credentialEnvelope), encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY, businessId: job.businessId, integrationId: job.integrationId, provider: "shopify" });
    const result = await reconcile({ shop: job.integration.externalStoreId, token: accessToken(plaintext), apiVersion: config.SHOPIFY_ADMIN_API_VERSION, uri: shopifyWebhookCallbackUrl() });
    await database.$transaction(async (tx) => {
      const updated = await tx.whatsAppShopifyWebhookSync.updateMany({ where: { id: job.id, status: "processing", leaseOwner: workerId }, data: { status: "ready", syncedAt: now, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null } });
      if (updated.count !== 1) throw new Error("SHOPIFY_WEBHOOK_SYNC_LEASE_LOST");
      await tx.whatsAppCommerceIntegration.updateMany({ where: { id: job.integrationId, businessId: job.businessId, status: "active" }, data: { lastErrorCode: null } });
      await writeWhatsAppAuditLog({ businessId: job.businessId, actorType: "worker", action: "commerce.shopify.webhooks.sync", targetType: "commerce_integration", targetId: job.integrationId, outcome: "success", metadata: { createdTopics: result.created.join(","), existingTopics: result.existing.join(",") }, database: tx });
    });
    return { processed: true as const, ready: true as const, ...result };
  } catch (error) {
    const row = await database.whatsAppShopifyWebhookSync.findUnique({ where: { id: syncId }, select: { attemptCount: true, businessId: true, integrationId: true } });
    if (!row) return { processed: false as const, terminal: true as const };
    const terminal = row.attemptCount >= MAX_ATTEMPTS;
    const errorCode = (error instanceof Error && /^SHOPIFY_[A-Z0-9_]+$/.test(error.message) ? error.message : "SHOPIFY_WEBHOOK_SYNC_FAILED").slice(0, 100);
    await database.$transaction(async (tx) => {
      const updated = await tx.whatsAppShopifyWebhookSync.updateMany({ where: { id: syncId, status: "processing", leaseOwner: workerId }, data: { status: terminal ? "failed" : "retry_scheduled", nextAttemptAt: retryAt(row.attemptCount, now), leaseOwner: null, leaseExpiresAt: null, lastErrorCode: errorCode } });
      if (updated.count !== 1) throw new Error("SHOPIFY_WEBHOOK_SYNC_LEASE_LOST");
      await tx.whatsAppCommerceIntegration.updateMany({ where: { id: row.integrationId, businessId: row.businessId }, data: { lastErrorCode: errorCode } });
      await writeWhatsAppAuditLog({ businessId: row.businessId, actorType: "worker", action: "commerce.shopify.webhooks.sync", targetType: "commerce_integration", targetId: row.integrationId, outcome: "failed", metadata: { reason: errorCode, terminal }, database: tx });
    });
    return { processed: true as const, ready: false as const, terminal, errorCode };
  }
}
