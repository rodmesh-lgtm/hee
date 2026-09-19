import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";

import { db } from "../db";
import { writeWhatsAppAuditLog } from "../whatsapp/audit";
import { mapSallaOrderWebhook } from "./salla-domain";

const MAX_ATTEMPTS = 8;
const LEASE_MS = 5 * 60_000;

function retryAt(attempt: number, now: Date) {
  return new Date(now.getTime() + Math.min(60 * 60_000, 30_000 * (2 ** Math.max(0, attempt - 1))));
}

async function fail(database: PrismaClient, eventId: string, workerId: string, now: Date, error: unknown) {
  const event = await database.sallaWebhookEvent.findUnique({ where: { id: eventId }, select: { attemptCount: true } });
  if (!event) return { processed: false as const, terminal: true as const };
  const terminal = event.attemptCount >= MAX_ATTEMPTS;
  const errorCode = (error instanceof Error ? error.message : "SALLA_WEBHOOK_PROCESSING_FAILED").slice(0, 100);
  await database.sallaWebhookEvent.updateMany({
    where: { id: eventId, status: "processing", leaseOwner: workerId },
    data: {
      status: terminal ? "failed" : "retry_scheduled",
      nextAttemptAt: retryAt(event.attemptCount, now),
      leaseOwner: null,
      leaseExpiresAt: null,
      lastErrorCode: errorCode,
    },
  });
  return { processed: false as const, terminal, errorCode };
}

export async function processSallaWebhookEvent(input: {
  eventId: string;
  workerId: string;
  database?: PrismaClient;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  try {
    const event = await database.sallaWebhookEvent.findFirst({
      where: { id: input.eventId, status: "processing", leaseOwner: input.workerId },
      include: { integration: { select: { businessId: true, provider: true, status: true } } },
    });
    if (!event) throw new Error("SALLA_WEBHOOK_LEASE_LOST");
    if (event.integration.businessId !== event.businessId || event.integration.provider !== "salla" || event.integration.status !== "active") {
      throw new Error("SALLA_INTEGRATION_INACTIVE");
    }
    const mapping = mapSallaOrderWebhook(event.payload);
    return await database.$transaction(async (tx) => {
      const leased = await tx.sallaWebhookEvent.findFirst({
        where: { id: event.id, businessId: event.businessId, status: "processing", leaseOwner: input.workerId },
        select: { id: true },
      });
      if (!leased) throw new Error("SALLA_WEBHOOK_LEASE_LOST");
      if (mapping.kind === "ignored") {
        await tx.sallaWebhookEvent.update({
          where: { id: event.id },
          data: { status: "ignored", processedAt: now, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: `SALLA_${mapping.reason.toUpperCase()}` },
        });
        await writeWhatsAppAuditLog({
          businessId: event.businessId,
          actorType: "worker",
          action: "commerce.salla.webhook.process",
          targetType: "salla_webhook_event",
          targetId: event.id,
          outcome: "success",
          metadata: { status: "ignored", reason: mapping.reason },
          database: tx,
        });
        return { processed: true as const, ignored: true as const, reason: mapping.reason };
      }

      const current = await tx.commerceBookingEligibility.findUnique({
        where: { integrationId_externalOrderId: { integrationId: event.integrationId, externalOrderId: mapping.order.externalOrderId } },
        select: { providerUpdatedAt: true },
      });
      const stale = Boolean(current?.providerUpdatedAt && mapping.order.providerUpdatedAt && current.providerUpdatedAt > mapping.order.providerUpdatedAt);
      if (!stale) {
        await tx.commerceBookingEligibility.upsert({
          where: { integrationId_externalOrderId: { integrationId: event.integrationId, externalOrderId: mapping.order.externalOrderId } },
          create: {
            businessId: event.businessId,
            integrationId: event.integrationId,
            provider: "salla",
            externalOrderId: mapping.order.externalOrderId,
            phoneE164: mapping.order.phoneE164,
            paymentStatus: mapping.order.paymentStatus,
            orderStatus: mapping.order.orderStatus,
            eligible: mapping.order.eligible,
            providerUpdatedAt: mapping.order.providerUpdatedAt,
            sourceEventId: event.eventId,
          },
          update: {
            businessId: event.businessId,
            phoneE164: mapping.order.phoneE164,
            paymentStatus: mapping.order.paymentStatus,
            orderStatus: mapping.order.orderStatus,
            eligible: mapping.order.eligible,
            providerUpdatedAt: mapping.order.providerUpdatedAt,
            sourceEventId: event.eventId,
          },
        });
      }
      await tx.sallaWebhookEvent.update({
        where: { id: event.id },
        data: { status: "processed", processedAt: now, leaseOwner: null, leaseExpiresAt: null, lastErrorCode: stale ? "SALLA_STALE_EVENT" : null },
      });
      await writeWhatsAppAuditLog({
        businessId: event.businessId,
        actorType: "worker",
        action: "commerce.salla.webhook.process",
        targetType: "salla_webhook_event",
        targetId: event.id,
        outcome: "success",
        metadata: { status: stale ? "stale" : "processed", eligible: stale ? null : mapping.order.eligible },
        database: tx,
      });
      return { processed: true as const, ignored: stale, eligible: stale ? null : mapping.order.eligible };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    return fail(database, input.eventId, input.workerId, now, error);
  }
}

export async function processNextSallaWebhookEvent(input: {
  workerId: string;
  database?: PrismaClient;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const eventId = await database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "SallaWebhookEvent"
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
    await tx.sallaWebhookEvent.update({
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
  return processSallaWebhookEvent({ eventId, workerId: input.workerId.slice(0, 100), database, now });
}
