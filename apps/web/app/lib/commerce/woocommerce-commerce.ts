import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Prisma } from "@prisma/client";

import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { decryptCommerceCredential, encryptCommerceCredential, type CommerceCredentialEnvelope } from "../whatsapp/commerce-credential-envelope";
import { normalizeCommerceStoreId } from "../whatsapp/commerce-integrations";
import { normalizeE164 } from "../whatsapp/contact-domain";

const FETCH_TIMEOUT_MS = 15_000;

function encryptionConfig() {
  const key = String(process.env.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY ?? "").trim();
  const keyVersion = String(process.env.WHATSAPP_COMMERCE_CREDENTIAL_KEY_VERSION ?? "").trim();
  if (key.length < 32 || !/^[A-Za-z0-9._-]{1,32}$/.test(keyVersion)) throw new Error("WOOCOMMERCE_CONFIG_INVALID");
  return { key, keyVersion };
}

function privateAddress(address: string) {
  if (address.toLowerCase().startsWith("::ffff:")) return privateAddress(address.slice(7));
  if (isIP(address) === 4) return /^0\.|^127\.|^10\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|^192\.168\.|^169\.254\.|^198\.(1[89])\.|^172\.(1[6-9]|2\d|3[01])\.|^(22[4-9]|23\d)\./.test(address);
  return address === "::1" || address.toLowerCase().startsWith("fc") || address.toLowerCase().startsWith("fd") || address.toLowerCase().startsWith("fe80:");
}

async function assertPublicStore(origin: string) {
  const url = new URL(origin);
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((item) => privateAddress(item.address))) throw new Error("WOOCOMMERCE_STORE_UNSAFE");
}

function credentials(consumerKey: string, consumerSecret: string) {
  const key = consumerKey.trim();
  const secret = consumerSecret.trim();
  if (!/^ck_[A-Za-z0-9]{20,80}$/.test(key) || !/^cs_[A-Za-z0-9]{20,80}$/.test(secret)) throw new Error("WOOCOMMERCE_CREDENTIAL_INVALID");
  return { key, secret };
}

function envelope(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("WOOCOMMERCE_CREDENTIAL_INVALID");
  return value as CommerceCredentialEnvelope;
}

function phone(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/[\s()-]/g, "");
  return normalizeE164(/^05\d{8}$/.test(trimmed) ? `+966${trimmed.slice(1)}` : trimmed);
}

type WooOrder = { id?: unknown; status?: unknown; date_paid_gmt?: unknown; date_modified_gmt?: unknown; billing?: { phone?: unknown } };

function mapOrder(order: WooOrder) {
  const id = typeof order.id === "number" || typeof order.id === "string" ? String(order.id) : "";
  if (!id || id.length > 255) return null;
  const status = typeof order.status === "string" ? order.status.toLowerCase().slice(0, 100) : "unknown";
  const paid = typeof order.date_paid_gmt === "string" && !Number.isNaN(Date.parse(order.date_paid_gmt));
  const modified = typeof order.date_modified_gmt === "string" && !Number.isNaN(Date.parse(order.date_modified_gmt)) ? new Date(order.date_modified_gmt) : null;
  return { externalOrderId: id, phoneE164: phone(order.billing?.phone), paymentStatus: paid ? "paid" : "unpaid", orderStatus: status, eligible: paid && ["processing", "completed"].includes(status), providerUpdatedAt: modified };
}

async function fetchOrders(origin: string, credential: { key: string; secret: string }, page: number, perPage: number) {
  await assertPublicStore(origin);
  const url = new URL("/wp-json/wc/v3/orders", origin);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("orderby", "modified");
  url.searchParams.set("order", "desc");
  const response = await fetch(url, {
    headers: { authorization: `Basic ${Buffer.from(`${credential.key}:${credential.secret}`).toString("base64")}`, accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !Array.isArray(payload)) throw new Error(`WOOCOMMERCE_ORDERS_HTTP_${response.status}`);
  return payload as WooOrder[];
}

export async function connectWooCommerceBookingStore(input: { businessId: string; actorUserId: string; storeUrl: string; consumerKey: string; consumerSecret: string }) {
  const { storeId } = normalizeCommerceStoreId("woocommerce", input.storeUrl);
  const credential = credentials(input.consumerKey, input.consumerSecret);
  await fetchOrders(storeId, credential, 1, 1);
  const config = encryptionConfig();
  return db.$transaction(async (tx) => {
    const collision = await tx.whatsAppCommerceIntegration.findFirst({ where: { provider: "woocommerce", externalStoreId: storeId, status: "active", businessId: { not: input.businessId } }, select: { id: true } });
    if (collision) throw new Error("WOOCOMMERCE_STORE_ALREADY_ASSIGNED");
    const existing = await tx.whatsAppCommerceIntegration.findUnique({ where: { businessId_provider_externalStoreId: { businessId: input.businessId, provider: "woocommerce", externalStoreId: storeId } }, select: { id: true } });
    const integrationId = existing?.id ?? randomUUID();
    const encrypted = encryptCommerceCredential({ plaintext: JSON.stringify(credential), encryptionKeyBase64: config.key, keyVersion: config.keyVersion, businessId: input.businessId, integrationId, provider: "woocommerce" });
    const integration = await tx.whatsAppCommerceIntegration.upsert({
      where: { businessId_provider_externalStoreId: { businessId: input.businessId, provider: "woocommerce", externalStoreId: storeId } },
      create: { id: integrationId, businessId: input.businessId, provider: "woocommerce", externalStoreId: storeId, displayName: new URL(storeId).hostname, status: "active", connectedAt: new Date(), credentialEnvelope: encrypted as unknown as Prisma.InputJsonValue },
      update: { status: "active", connectedAt: new Date(), disconnectedAt: null, lastErrorCode: null, credentialEnvelope: encrypted as unknown as Prisma.InputJsonValue },
      select: { id: true },
    });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, action: "commerce.woocommerce.connect", targetType: "commerce_integration", targetId: integration.id, outcome: "success", database: tx });
    return integration;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function syncWooCommerceBookingOrders(input: { businessId: string; integrationId: string; actorUserId?: string; maxPages?: number }) {
  const integration = await db.whatsAppCommerceIntegration.findFirst({ where: { id: input.integrationId, businessId: input.businessId, provider: "woocommerce", status: "active" }, select: { id: true, externalStoreId: true, credentialEnvelope: true } });
  if (!integration?.credentialEnvelope) throw new Error("WOOCOMMERCE_INTEGRATION_UNAVAILABLE");
  const config = encryptionConfig();
  const plaintext = decryptCommerceCredential({ envelope: envelope(integration.credentialEnvelope), encryptionKeyBase64: config.key, businessId: input.businessId, integrationId: integration.id, provider: "woocommerce" });
  const parsed = JSON.parse(plaintext) as { key?: unknown; secret?: unknown };
  const credential = credentials(String(parsed.key ?? ""), String(parsed.secret ?? ""));
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 10, 20));
  let imported = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const orders = await fetchOrders(integration.externalStoreId, credential, page, 50);
    await db.$transaction(async (tx) => {
      for (const raw of orders) {
        const order = mapOrder(raw);
        if (!order) continue;
        const current = await tx.commerceBookingEligibility.findUnique({ where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId: order.externalOrderId } }, select: { providerUpdatedAt: true } });
        if (current?.providerUpdatedAt && order.providerUpdatedAt && current.providerUpdatedAt > order.providerUpdatedAt) continue;
        const sourceEventId = `woocommerce:sync:${createHash("sha256").update(`${integration.id}:${order.externalOrderId}:${order.providerUpdatedAt?.toISOString() ?? "unknown"}`).digest("hex")}`;
        await tx.commerceBookingEligibility.upsert({ where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId: order.externalOrderId } }, create: { businessId: input.businessId, integrationId: integration.id, provider: "woocommerce", ...order, sourceEventId }, update: { ...order, sourceEventId } });
        imported += 1;
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (orders.length < 50) break;
  }
  await db.$transaction(async (tx) => {
    await tx.whatsAppCommerceIntegration.updateMany({ where: { id: integration.id, businessId: input.businessId, status: "active" }, data: { lastWebhookAt: new Date(), lastErrorCode: null } });
    await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, actorType: input.actorUserId ? "user" : "worker", action: "commerce.woocommerce.orders.sync", targetType: "commerce_integration", targetId: integration.id, outcome: "success", metadata: { imported }, database: tx });
  });
  return { imported };
}
