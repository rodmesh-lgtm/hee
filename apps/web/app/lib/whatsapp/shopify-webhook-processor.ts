import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { applyWhatsAppAutomationCartTransitionInTransaction } from "./automation-cart-lifecycle";
import { mapShopifyCommerceWebhook } from "./shopify-webhook-domain";

const MAX_ATTEMPTS = 8;
const LEASE_MS = 5 * 60_000;

function retryAt(attempt: number, now: Date) {
  return new Date(now.getTime() + Math.min(60 * 60_000, 30_000 * (2 ** Math.max(0, attempt - 1))));
}

async function finish(input: {
  database: PrismaClient;
  eventId: string;
  workerId: string;
  status: "processed" | "ignored";
  errorCode?: string;
  now: Date;
}) {
  return input.database.$transaction(async (tx) => {
    const updated = await tx.whatsAppShopifyWebhookEvent.updateMany({
      where: { id: input.eventId, status: "processing", leaseOwner: input.workerId },
      data: {
        status: input.status,
        processedAt: input.now,
        leaseOwner: null,
        leaseExpiresAt: null,
        lastErrorCode: input.errorCode ?? null,
      },
    });
    if (updated.count !== 1) throw new Error("WHATSAPP_SHOPIFY_WEBHOOK_LEASE_LOST");
    const event = await tx.whatsAppShopifyWebhookEvent.findUniqueOrThrow({ where: { id: input.eventId }, select: { businessId: true } });
    await writeWhatsAppAuditLog({
      businessId: event.businessId,
      actorType: "worker",
      action: "commerce.shopify.webhook.process",
      targetType: "shopify_webhook_event",
      targetId: input.eventId,
      outcome: "success",
      metadata: { status: input.status, reason: input.errorCode ?? null },
      database: tx,
    });
  });
}

async function fail(input: { database: PrismaClient; eventId: string; workerId: string; now: Date; error: unknown }) {
  const row = await input.database.whatsAppShopifyWebhookEvent.findUnique({ where: { id: input.eventId }, select: { attemptCount: true } });
  if (!row) return { processed: false as const, terminal: true as const, errorCode: "WHATSAPP_SHOPIFY_WEBHOOK_NOT_FOUND" };
  const terminal = row.attemptCount >= MAX_ATTEMPTS;
  const errorCode = (input.error instanceof Error ? input.error.message : "WHATSAPP_SHOPIFY_WEBHOOK_PROCESSING_FAILED").slice(0, 100);
  await input.database.whatsAppShopifyWebhookEvent.updateMany({
    where: { id: input.eventId, status: "processing", leaseOwner: input.workerId },
    data: {
      status: terminal ? "failed" : "retry_scheduled",
      nextAttemptAt: retryAt(row.attemptCount, input.now),
      leaseOwner: null,
      leaseExpiresAt: null,
      lastErrorCode: errorCode,
    },
  });
  return { processed: false as const, terminal, errorCode };
}

export async function processShopifyWebhookEvent(input: {
  eventId: string;
  workerId: string;
  database?: PrismaClient;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  try {
    const event = await database.whatsAppShopifyWebhookEvent.findFirst({
      where: { id: input.eventId, status: "processing", leaseOwner: input.workerId },
      include: { integration: { select: { id: true, businessId: true, provider: true, status: true } } },
    });
    if (!event) throw new Error("WHATSAPP_SHOPIFY_WEBHOOK_LEASE_LOST");
    if (event.integration.businessId !== event.businessId || event.integration.provider !== "shopify" || event.integration.status !== "active") {
      throw new Error("WHATSAPP_SHOPIFY_INTEGRATION_INACTIVE");
    }
    const mapping = mapShopifyCommerceWebhook({
      topic: event.topic,
      payload: event.payload,
      triggeredAt: event.triggeredAt,
      receivedAt: event.receivedAt,
    });
    if (mapping.kind === "ignored") {
      await finish({ database, eventId: event.id, workerId: input.workerId, status: "ignored", errorCode: `SHOPIFY_${mapping.reason.toUpperCase()}`, now });
      return { processed: true as const, ignored: true as const, reason: mapping.reason };
    }
    return await database.$transaction(async (tx) => {
      const leased = await tx.whatsAppShopifyWebhookEvent.findFirst({
        where: { id: event.id, status: "processing", leaseOwner: input.workerId },
        select: { id: true },
      });
      if (!leased) throw new Error("WHATSAPP_SHOPIFY_WEBHOOK_LEASE_LOST");
      const current = await tx.whatsAppAutomationCart.findUnique({
        where: { businessId_cartId: { businessId: event.businessId, cartId: mapping.transition.cartId } },
        select: { contactId: true },
      });
      const contact = mapping.transition.phoneE164 ? await tx.whatsAppContact.findUnique({
        where: { businessId_phoneE164: { businessId: event.businessId, phoneE164: mapping.transition.phoneE164 } },
        select: { id: true },
      }) : null;
      const ignoredReason = current && contact && current.contactId !== contact.id
        ? "SHOPIFY_CART_CONTACT_CONFLICT"
        : !current?.contactId && !contact?.id ? "SHOPIFY_CONTACT_NOT_FOUND" : null;
      if (ignoredReason) {
        await tx.whatsAppShopifyWebhookEvent.update({
          where: { id: event.id },
          data: { status: "ignored", processedAt: now, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: ignoredReason },
        });
        await writeWhatsAppAuditLog({
          businessId: event.businessId, actorType: "worker", action: "commerce.shopify.webhook.process",
          targetType: "shopify_webhook_event", targetId: event.id, outcome: "success",
          metadata: { status: "ignored", reason: ignoredReason }, database: tx,
        });
        return { processed: true as const, ignored: true as const, reason: ignoredReason === "SHOPIFY_CONTACT_NOT_FOUND" ? "contact_not_found" as const : "cart_contact_conflict" as const };
      }
      const result = await applyWhatsAppAutomationCartTransitionInTransaction({
        businessId: event.businessId,
        integrationId: event.integrationId,
        externalEventId: `shopify:${event.webhookId}`,
        cartId: mapping.transition.cartId,
        contactId: current?.contactId ?? contact?.id,
        state: mapping.transition.state,
        occurredAt: mapping.transition.occurredAt,
        now,
      }, tx, now);
      await tx.whatsAppShopifyWebhookEvent.update({
        where: { id: event.id },
        data: { status: "processed", processedAt: now, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: null },
      });
      await writeWhatsAppAuditLog({
        businessId: event.businessId, actorType: "worker", action: "commerce.shopify.webhook.process",
        targetType: "shopify_webhook_event", targetId: event.id, outcome: "success",
        metadata: { status: "processed" }, database: tx,
      });
      return { processed: true as const, ignored: false as const, result };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return fail({ database, eventId: input.eventId, workerId: input.workerId, now, error });
  }
}

export async function processNextShopifyWebhookEvent(input: {
  workerId: string;
  database?: PrismaClient;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const eventId = await database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "WhatsAppShopifyWebhookEvent"
      WHERE (
        "status" IN ('pending','retry_scheduled')
        OR ("status" = 'processing' AND "leaseExpiresAt" < ${now})
      )
        AND "nextAttemptAt" <= ${now}
      ORDER BY "nextAttemptAt" ASC, "receivedAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    if (!rows[0]) return null;
    await tx.whatsAppShopifyWebhookEvent.update({
      where: { id: rows[0].id },
      data: {
        status: "processing",
        attemptCount: { increment: 1 },
        leaseOwner: input.workerId.slice(0, 100),
        leaseExpiresAt: new Date(now.getTime() + LEASE_MS),
        lastErrorCode: null,
      },
    });
    return rows[0].id;
  });
  if (!eventId) return { processed: false as const, empty: true as const };
  return processShopifyWebhookEvent({ eventId, workerId: input.workerId.slice(0, 100), database, now });
}
