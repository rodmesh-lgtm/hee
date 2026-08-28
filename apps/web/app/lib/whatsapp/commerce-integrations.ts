import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";

export const WHATSAPP_COMMERCE_PROVIDERS = ["salla", "zid", "shopify"] as const;
export type WhatsAppCommerceProvider = (typeof WHATSAPP_COMMERCE_PROVIDERS)[number];
type CommerceDb = Pick<PrismaClient, "$transaction">;

export function normalizeCommerceStoreId(providerValue: string, value: string) {
  if (!(WHATSAPP_COMMERCE_PROVIDERS as readonly string[]).includes(providerValue)) throw new Error("WHATSAPP_COMMERCE_PROVIDER_INVALID");
  const provider = providerValue as WhatsAppCommerceProvider;
  const storeId = value.trim().toLowerCase();
  if (provider === "salla" && !/^\d{1,32}$/.test(storeId)) throw new Error("WHATSAPP_COMMERCE_STORE_ID_INVALID");
  if (provider === "zid" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(storeId)) throw new Error("WHATSAPP_COMMERCE_STORE_ID_INVALID");
  if (provider === "shopify" && (!/^[a-z0-9][a-z0-9-]{0,61}\.myshopify\.com$/.test(storeId) || storeId.length > 255)) {
    throw new Error("WHATSAPP_COMMERCE_STORE_ID_INVALID");
  }
  return { provider, storeId };
}

export async function registerWhatsAppCommerceIntegration(input: {
  businessId: string; actorUserId: string; provider: string; externalStoreId: string;
  displayName?: string; database?: CommerceDb;
}) {
  const database = input.database ?? db;
  const { provider, storeId } = normalizeCommerceStoreId(input.provider, input.externalStoreId);
  const displayName = input.displayName?.trim() || null;
  if (displayName && displayName.length > 120) throw new Error("WHATSAPP_COMMERCE_DISPLAY_NAME_INVALID");
  return database.$transaction(async (tx) => {
    const existing = await tx.whatsAppCommerceIntegration.findUnique({
      where: { businessId_provider_externalStoreId: { businessId: input.businessId, provider, externalStoreId: storeId } },
      select: { id: true, status: true },
    });
    if (existing) return { ...existing, existing: true as const };
    const integration = await tx.whatsAppCommerceIntegration.create({
      data: { id: randomUUID(), businessId: input.businessId, provider, externalStoreId: storeId, displayName },
      select: { id: true, status: true },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId, actorUserId: input.actorUserId, action: "commerce.integration.register",
      targetType: "commerce_integration", targetId: integration.id, outcome: "success", metadata: { provider }, database: tx,
    });
    return { ...integration, existing: false as const };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function disconnectWhatsAppCommerceIntegration(input: {
  businessId: string; actorUserId: string; integrationId: string; database?: CommerceDb; now?: Date;
}) {
  if (!/^[0-9a-f-]{36}$/i.test(input.integrationId)) throw new Error("WHATSAPP_COMMERCE_INTEGRATION_ID_INVALID");
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; provider: string; status: string }>>(Prisma.sql`
      SELECT "id", "provider", "status" FROM "WhatsAppCommerceIntegration"
      WHERE "id" = ${input.integrationId} AND "businessId" = ${input.businessId}
      FOR UPDATE
    `);
    const integration = rows[0];
    if (!integration) throw new Error("WHATSAPP_COMMERCE_INTEGRATION_NOT_FOUND");
    const alreadyDisconnected = integration.status === "disconnected";
    await tx.whatsAppCommerceOAuthSession.updateMany({
      where: { businessId: input.businessId, integrationId: integration.id, status: { in: ["created", "exchanging"] } },
      data: { status: "cancelled", consumedAt: now, lastErrorCode: "integration_disconnected" },
    });
    await tx.whatsAppShopifyWebhookSync.updateMany({
      where: { businessId: input.businessId, integrationId: integration.id },
      data: { status: "failed", leaseOwner: null, leaseExpiresAt: null, lastErrorCode: "SHOPIFY_INTEGRATION_DISCONNECTED" },
    });
    if (!alreadyDisconnected) await tx.whatsAppCommerceIntegration.updateMany({
      where: { id: integration.id, businessId: input.businessId, status: { in: ["draft", "active"] } },
      data: { status: "disconnected", credentialEnvelope: Prisma.DbNull, disconnectedAt: now, lastErrorCode: null },
    });
    await writeWhatsAppAuditLog({
      businessId: input.businessId, actorUserId: input.actorUserId, action: "commerce.integration.disconnect",
      targetType: "commerce_integration", targetId: integration.id, outcome: "success",
      metadata: { provider: integration.provider, alreadyDisconnected }, database: tx,
    });
    return { id: integration.id, alreadyDisconnected };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
