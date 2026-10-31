import "server-only";

import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { getSallaAccessToken } from "./salla-access-token";
import { mapSallaOrderWebhook } from "./salla-domain";

const FETCH_TIMEOUT_MS = 15_000;

export async function syncSallaBookingOrders(input: { businessId: string; integrationId: string; actorUserId?: string; maxPages?: number }, dependencies: { database?: PrismaClient; fetcher?: typeof fetch; loadToken?: typeof getSallaAccessToken } = {}) {
  const database = dependencies.database ?? db;
  const fetcher = dependencies.fetcher ?? fetch;
  const loadToken = dependencies.loadToken ?? getSallaAccessToken;
  const integration = await database.whatsAppCommerceIntegration.findFirst({
    where: { id: input.integrationId, businessId: input.businessId, provider: "salla", status: "active" },
    select: { id: true, credentialEnvelope: true, connectedAt: true, externalStoreId: true },
  });
  if (!integration?.credentialEnvelope || !integration.connectedAt) throw new Error("SALLA_INTEGRATION_UNAVAILABLE");
  // A token refresh keeps connectedAt; a new authorization changes it. Never let
  // an in-flight import write into a later authorization, even for the same store.
  const generationWhere = { id: integration.id, businessId: input.businessId, provider: "salla", status: "active", connectedAt: integration.connectedAt, externalStoreId: integration.externalStoreId };
  const lockGeneration = async (tx: Prisma.TransactionClient) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "WhatsAppCommerceIntegration"
      WHERE "id" = ${integration.id} AND "businessId" = ${input.businessId}
        AND "provider" = 'salla' AND "status" = 'active'
        AND "connectedAt" = ${integration.connectedAt}
        AND "externalStoreId" = ${integration.externalStoreId} FOR UPDATE
    `);
    if (!rows[0]) throw new Error("SALLA_CONNECTION_CHANGED");
  };
  let token = await loadToken({ businessId: input.businessId, integrationId: integration.id, database });
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 10, 20));
  let imported = 0;
  let page = 1;
  let completedPages = 0;
  try {
    for (; page <= maxPages; page += 1) {
      const url = new URL("https://api.salla.dev/admin/v2/orders");
      url.searchParams.set("page", String(page));
      url.searchParams.set("per_page", "30");
      const requestPage = async () => {
        const current = await database.whatsAppCommerceIntegration.findFirst({ where: generationWhere, select: { id: true } });
        if (!current) throw new Error("SALLA_CONNECTION_CHANGED");
        return fetcher(url, {
          headers: { authorization: `Bearer ${token}`, accept: "application/json" },
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      };
      const requestStartedAt = new Date();
      let response = await requestPage();
      if (response.status === 401) {
        await response.body?.cancel();
        token = await loadToken({ businessId: input.businessId, integrationId: integration.id, rejectedAccessToken: token, database });
        response = await requestPage();
      }
      const payload = await response.json().catch(() => null) as { data?: unknown[]; pagination?: { totalPages?: unknown; total_pages?: unknown } } | null;
      if (!response.ok || !payload || !Array.isArray(payload.data)) throw new Error(`SALLA_ORDERS_HTTP_${response.status}`);
      // List responses may contain only the order creation date. It is not a
      // revision timestamp and must not make a fresh API snapshot look stale.
      const mappings = payload.data.map((order) => {
        if (!order || typeof order !== "object" || Array.isArray(order)) return mapSallaOrderWebhook(null);
        return mapSallaOrderWebhook({ event: "order.updated", data: { ...order, date: undefined, created_at: undefined } });
      });
      await database.$transaction(async (tx) => {
        await lockGeneration(tx);
        for (const mapping of mappings) {
          if (mapping.kind !== "order") continue;
          const sourceEventId = `salla:sync:${createHash("sha256").update(`${integration.id}:${mapping.order.externalOrderId}:${mapping.order.providerUpdatedAt?.toISOString() ?? "unknown"}`).digest("hex")}`;
          const current = await tx.commerceBookingEligibility.findUnique({
            where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId: mapping.order.externalOrderId } },
            select: { providerUpdatedAt: true, updatedAt: true },
          });
          // A webhook or another sync committed during the request wins.
          if (current?.updatedAt && current.updatedAt >= requestStartedAt) continue;
          if (current?.providerUpdatedAt && mapping.order.providerUpdatedAt && current.providerUpdatedAt > mapping.order.providerUpdatedAt) continue;
          const providerUpdatedAt = mapping.order.providerUpdatedAt ??
            (current?.providerUpdatedAt && current.providerUpdatedAt > requestStartedAt ? current.providerUpdatedAt : requestStartedAt);
          await tx.commerceBookingEligibility.upsert({
            where: { integrationId_externalOrderId: { integrationId: integration.id, externalOrderId: mapping.order.externalOrderId } },
            create: { businessId: input.businessId, integrationId: integration.id, provider: "salla", ...mapping.order, providerUpdatedAt, sourceEventId },
            update: { phoneE164: mapping.order.phoneE164, paymentStatus: mapping.order.paymentStatus, orderStatus: mapping.order.orderStatus, eligible: mapping.order.eligible, providerUpdatedAt, sourceEventId },
          });
          imported += 1;
        }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      completedPages += 1;
      const totalPagesRaw = payload.pagination?.totalPages ?? payload.pagination?.total_pages;
      const totalPages = typeof totalPagesRaw === "number" ? totalPagesRaw : Number(totalPagesRaw);
      if (payload.data.length < 30 || Number.isFinite(totalPages) && page >= totalPages) break;
    }
    await database.$transaction(async (tx) => {
      await lockGeneration(tx);
      await tx.whatsAppCommerceIntegration.updateMany({ where: generationWhere, data: { lastWebhookAt: new Date(), lastErrorCode: null } });
      await writeWhatsAppAuditLog({ businessId: input.businessId, actorUserId: input.actorUserId, actorType: input.actorUserId ? "user" : "worker", action: "commerce.salla.orders.sync", targetType: "commerce_integration", targetId: integration.id, outcome: "success", metadata: { imported, pages: completedPages }, database: tx });
    });
    return { imported, pages: completedPages };
  } catch (error) {
    await database.whatsAppCommerceIntegration.updateMany({ where: generationWhere, data: { lastErrorCode: "SALLA_ORDER_SYNC_FAILED" } }).catch(() => undefined);
    throw error;
  }
}
