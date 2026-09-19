import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from "../whatsapp/commerce-credential-envelope";
import { normalizeE164 } from "../whatsapp/contact-domain";
import { getShopifyConfig } from "../whatsapp/shopify-config";

const FETCH_TIMEOUT_MS = 15_000;

function envelope(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SHOPIFY_CREDENTIAL_INVALID");
  return value as CommerceCredentialEnvelope;
}

function accessToken(plaintext: string) {
  const parsed = JSON.parse(plaintext) as { accessToken?: unknown };
  if (typeof parsed.accessToken !== "string" || parsed.accessToken.length < 16) throw new Error("SHOPIFY_CREDENTIAL_INVALID");
  return parsed.accessToken;
}

type OrderNode = { legacyResourceId?: unknown; displayFinancialStatus?: unknown; cancelledAt?: unknown; updatedAt?: unknown; phone?: unknown; customer?: { phone?: unknown }; billingAddress?: { phone?: unknown }; shippingAddress?: { phone?: unknown } };

function orderPhone(order: OrderNode) {
  for (const value of [order.phone, order.customer?.phone, order.billingAddress?.phone, order.shippingAddress?.phone]) {
    const normalized = normalizeE164(value, "966");
    if (normalized) return normalized;
  }
  return null;
}

export async function syncShopifyBookingOrders(input: { businessId: string; integrationId: string; actorUserId?: string; maxPages?: number }) {
  const config = getShopifyConfig();
  const integration = await db.whatsAppCommerceIntegration.findFirst({ where: { id: input.integrationId, businessId: input.businessId, provider: "shopify", status: "active" }, select: { id: true, externalStoreId: true, credentialEnvelope: true } });
  if (!integration?.credentialEnvelope) throw new Error("SHOPIFY_INTEGRATION_UNAVAILABLE");
  const token = accessToken(decryptCommerceCredential({ envelope: envelope(integration.credentialEnvelope), encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY, businessId: input.businessId, integrationId: integration.id, provider: "shopify" }));
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 5, 20));
  let cursor: string | null = null;
  let imported = 0;
  for (let page = 0; page < maxPages; page += 1) {
    const response = await fetch(`https://${integration.externalStoreId}/admin/api/${config.SHOPIFY_ADMIN_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "x-shopify-access-token": token },
      body: JSON.stringify({ query: `query IRBookingOrders($after: String) { orders(first: 50, after: $after, sortKey: UPDATED_AT, reverse: true) { nodes { legacyResourceId displayFinancialStatus cancelledAt updatedAt phone customer { phone } billingAddress { phone } shippingAddress { phone } } pageInfo { hasNextPage endCursor } } }`, variables: { after: cursor } }),
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const payload = await response.json().catch(() => null) as { data?: { orders?: { nodes?: OrderNode[]; pageInfo?: { hasNextPage?: boolean; endCursor?: string | null } } }; errors?: unknown[] } | null;
    const orders = payload?.data?.orders;
    if (!response.ok || !orders || payload?.errors?.length || !Array.isArray(orders.nodes)) throw new Error(`SHOPIFY_ORDERS_HTTP_${response.status}`);
    await db.$transaction(async (tx) => {
      for (const node of orders.nodes ?? []) {
        const externalOrderId = typeof node.legacyResourceId === "string" || typeof node.legacyResourceId === "number" ? String(node.legacyResourceId) : "";
        if (!externalOrderId || externalOrderId.length > 255) continue;
        const status = typeof node.displayFinancialStatus === "string" ? node.displayFinancialStatus.toLowerCase().slice(0, 100) : "unknown";
        const providerUpdatedAt = typeof node.updatedAt === "string" && !Number.isNaN(Date.parse(node.updatedAt)) ? new Date(node.updatedAt) : null;
        const current = await tx.commerceBookingEligibility.findUnique({ where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId } }, select: { providerUpdatedAt: true } });
        if (current?.providerUpdatedAt && providerUpdatedAt && current.providerUpdatedAt > providerUpdatedAt) continue;
        const eligible = status === "paid" && !node.cancelledAt;
        const sourceEventId = `shopify:sync:${createHash("sha256").update(`${integration.id}:${externalOrderId}:${providerUpdatedAt?.toISOString() ?? "unknown"}`).digest("hex")}`;
        const data = { phoneE164: orderPhone(node), paymentStatus: status, orderStatus: node.cancelledAt ? "cancelled" : status, eligible, providerUpdatedAt, sourceEventId };
        await tx.commerceBookingEligibility.upsert({ where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId } }, create: { businessId: input.businessId, integrationId: integration.id, provider: "shopify", externalOrderId, ...data }, update: data });
        imported += 1;
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!orders.pageInfo?.hasNextPage || !orders.pageInfo.endCursor) break;
    cursor = orders.pageInfo.endCursor;
  }
  await db.$transaction(async (tx) => {
    await tx.whatsAppCommerceIntegration.updateMany({ where: { id: integration.id, businessId: input.businessId, status: "active" }, data: { lastWebhookAt: new Date(), lastErrorCode: null } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, actorType: input.actorUserId ? "user" : "worker", action: "commerce.shopify.orders.sync", targetType: "commerce_integration", targetId: integration.id, outcome: "success", metadata: { imported }, database: tx });
  });
  return { imported };
}
