import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";

import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { decryptCommerceCredential, type CommerceCredentialEnvelope } from "../whatsapp/commerce-credential-envelope";
import { getSallaConfig } from "./salla-config";
import { mapSallaOrderWebhook } from "./salla-domain";

const FETCH_TIMEOUT_MS = 15_000;

function envelope(value: Prisma.JsonValue | null) {
  const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
  if (!item || item.v !== 1 || item.alg !== "aes-256-gcm" || typeof item.keyVersion !== "string" || typeof item.iv !== "string" || typeof item.ciphertext !== "string" || typeof item.tag !== "string") {
    throw new Error("SALLA_CREDENTIAL_INVALID");
  }
  return item as CommerceCredentialEnvelope;
}

function accessToken(plaintext: string) {
  const parsed = JSON.parse(plaintext) as { accessToken?: unknown };
  if (typeof parsed.accessToken !== "string" || parsed.accessToken.length < 16) throw new Error("SALLA_TOKEN_MISSING");
  return parsed.accessToken;
}

export async function syncSallaBookingOrders(input: { businessId: string; integrationId: string; actorUserId?: string; maxPages?: number }) {
  const config = getSallaConfig();
  const integration = await db.whatsAppCommerceIntegration.findFirst({
    where: { id: input.integrationId, businessId: input.businessId, provider: "salla", status: "active" },
    select: { id: true, credentialEnvelope: true },
  });
  if (!integration?.credentialEnvelope) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
  const plaintext = decryptCommerceCredential({
    envelope: envelope(integration.credentialEnvelope),
    encryptionKeyBase64: config.WHATSAPP_COMMERCE_CREDENTIAL_ENCRYPTION_KEY,
    businessId: input.businessId,
    integrationId: integration.id,
    provider: "salla",
  });
  const token = accessToken(plaintext);
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 10, 20));
  let imported = 0;
  let page = 1;
  let completedPages = 0;
  try {
    for (; page <= maxPages; page += 1) {
      const url = new URL("https://api.salla.dev/admin/v2/orders");
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", "30");
      const response = await fetch(url, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
        cache: "no-store",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const payload = await response.json().catch(() => null) as { data?: unknown[]; pagination?: { totalPages?: unknown; total_pages?: unknown } } | null;
      if (!response.ok || !payload || !Array.isArray(payload.data)) throw new Error(`SALLA_ORDERS_HTTP_${response.status}`);
      const mappings = payload.data.map((order) => mapSallaOrderWebhook({ event: "order.updated", data: order }));
      await db.$transaction(async (tx) => {
        for (const mapping of mappings) {
          if (mapping.kind !== "order") continue;
          const sourceEventId = `salla:sync:${createHash("sha256").update(`${integration.id}:${mapping.order.externalOrderId}:${mapping.order.providerUpdatedAt?.toISOString() ?? "unknown"}`).digest("hex")}`;
          const current = await tx.commerceBookingEligibility.findUnique({
            where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId: mapping.order.externalOrderId } },
            select: { providerUpdatedAt: true },
          });
          if (current?.providerUpdatedAt && mapping.order.providerUpdatedAt && current.providerUpdatedAt > mapping.order.providerUpdatedAt) continue;
          await tx.commerceBookingEligibility.upsert({
            where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId: mapping.order.externalOrderId } },
            create: { businessId: input.businessId, integrationId: integration.id, provider: "salla", ...mapping.order, sourceEventId },
            update: { phoneE164: mapping.order.phoneE164, paymentStatus: mapping.order.paymentStatus, orderStatus: mapping.order.orderStatus, eligible: mapping.order.eligible, providerUpdatedAt: mapping.order.providerUpdatedAt, sourceEventId },
          });
          imported += 1;
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      completedPages += 1;
      const totalPagesRaw = payload.pagination?.totalPages ?? payload.pagination?.total_pages;
      const totalPages = typeof totalPagesRaw === "number" ? totalPagesRaw : Number(totalPagesRaw);
      if (payload.data.length < 30 || Number.isFinite(totalPages) && page >= totalPages) break;
    }
    await db.$transaction(async (tx) => {
      await tx.whatsAppCommerceIntegration.updateMany({ where: { id: integration.id, businessId: input.businessId, status: "active" }, data: { lastWebhookAt: new Date(), lastErrorCode: null } });
      await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, actorType: input.actorUserId ? "user" : "worker", action: "commerce.salla.orders.sync", targetType: "commerce_integration", targetId: integration.id, outcome: "success", metadata: { imported, pages: completedPages }, database: tx });
    });
    return { imported, pages: completedPages };
  } catch (error) {
    await db.whatsAppCommerceIntegration.updateMany({ where: { id: integration.id, businessId: input.businessId }, data: { lastErrorCode: "SALLA_ORDER_SYNC_FAILED" } }).catch(() => undefined);
    throw error;
  }
}
