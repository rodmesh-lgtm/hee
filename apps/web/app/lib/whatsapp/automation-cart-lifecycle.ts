import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { writeWhatsAppAuditLog } from "./audit";
import { readAutomationTriggerConfig } from "./automation-domain";
import { ingestWhatsAppAutomationEvent } from "./automation-processor";

export type WhatsAppAutomationCartState = "abandoned" | "recovered" | "completed";
type CartDb = Pick<PrismaClient, "$transaction">;

async function cancelPendingCartWork(tx: Prisma.TransactionClient, businessId: string, cartId: string, now: Date) {
  const events = await tx.whatsAppAutomationEvent.findMany({
    where: { businessId, source: "tenant.api.cart", triggerType: "abandoned_cart", subjectId: cartId }, select: { id: true },
  });
  if (!events.length) return { events: 0, jobs: 0 };
  const eventIds = events.map((event) => event.id);
  const runs = await tx.whatsAppAutomationRun.findMany({ where: { businessId, eventId: { in: eventIds } }, select: { id: true } });
  const runIds = runs.map((run) => run.id);
  const cancelledEvents = await tx.whatsAppAutomationEvent.updateMany({
    where: { businessId, id: { in: eventIds }, status: { in: ["pending", "retry_scheduled"] } },
    data: { status: "failed", processingErrorCode: "CART_NO_LONGER_ABANDONED", processedAt: now, leaseOwner: null, leaseExpiresAt: null },
  });
  const cancelledJobs = runIds.length ? await tx.whatsAppAutomationJob.updateMany({
    where: { businessId, runId: { in: runIds }, status: { in: ["queued", "retry_scheduled"] } },
    data: { status: "cancelled", lastErrorCode: "CART_NO_LONGER_ABANDONED", leaseOwner: null, leaseExpiresAt: null },
  }) : { count: 0 };
  if (runIds.length) await tx.whatsAppAutomationRun.updateMany({
    where: { businessId, id: { in: runIds }, status: "queued" },
    data: { status: "failed", skipReason: "cart_no_longer_abandoned", completedAt: now },
  });
  return { events: cancelledEvents.count, jobs: cancelledJobs.count };
}

export async function applyWhatsAppAutomationCartTransition(input: {
  businessId: string; apiKeyId: string; externalEventId: string; cartId: string;
  contactId?: string; phoneE164?: string; state: WhatsAppAutomationCartState;
  occurredAt: Date; database?: CartDb; now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    const activeKeys = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id" FROM "WhatsAppAutomationApiKey"
      WHERE "id" = ${input.apiKeyId} AND "businessId" = ${input.businessId} AND "status" = 'active'
      FOR SHARE
    `);
    if (!activeKeys[0]) throw new Error("WHATSAPP_AUTOMATION_API_KEY_REVOKED");
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wa-cart:${input.businessId}:${input.cartId}`}))`;
    const contact = await tx.whatsAppContact.findFirst({
      where: { businessId: input.businessId, ...(input.contactId ? { id: input.contactId } : { phoneE164: input.phoneE164 }) },
      select: { id: true, phoneE164: true, optedOutAt: true },
    });
    if (!contact) throw new Error("WHATSAPP_AUTOMATION_CART_CONTACT_NOT_FOUND");
    const replay = await tx.whatsAppAutomationCartEvent.findUnique({
      where: { businessId_externalEventId: { businessId: input.businessId, externalEventId: input.externalEventId } },
      select: { id: true, cartId: true, contactId: true, state: true, occurredAt: true, outcome: true },
    });
    if (replay) {
      if (replay.cartId !== input.cartId || replay.contactId !== contact.id || replay.state !== input.state || replay.occurredAt.getTime() !== input.occurredAt.getTime()) {
        throw new Error("WHATSAPP_AUTOMATION_CART_IDEMPOTENCY_CONFLICT");
      }
      return { replay: true as const, outcome: replay.outcome, scheduled: 0, cancelledEvents: 0, cancelledJobs: 0 };
    }
    if (input.state === "abandoned") {
      const consent = await tx.whatsAppConsent.findFirst({
        where: { businessId: input.businessId, phoneE164: contact.phoneE164, revokedAt: null, consentedAt: { lte: input.occurredAt } }, select: { id: true },
      });
      if (contact.optedOutAt || !consent) throw new Error("WHATSAPP_AUTOMATION_CART_CONTACT_NOT_ELIGIBLE");
    }

    const current = await tx.whatsAppAutomationCart.findUnique({
      where: { businessId_cartId: { businessId: input.businessId, cartId: input.cartId } },
      select: { id: true, occurredAt: true },
    });
    if (current && input.occurredAt.getTime() === current.occurredAt.getTime()) throw new Error("WHATSAPP_AUTOMATION_CART_STATE_CONFLICT");
    const stale = Boolean(current && input.occurredAt < current.occurredAt);
    const cart = current
      ? stale ? current : await tx.whatsAppAutomationCart.update({
        where: { id: current.id }, data: { contactId: contact.id, state: input.state, sourceEventId: input.externalEventId, occurredAt: input.occurredAt }, select: { id: true, occurredAt: true },
      })
      : await tx.whatsAppAutomationCart.create({
        data: { id: randomUUID(), businessId: input.businessId, cartId: input.cartId, contactId: contact.id, state: input.state, sourceEventId: input.externalEventId, occurredAt: input.occurredAt },
        select: { id: true, occurredAt: true },
      });
    await tx.whatsAppAutomationCartEvent.create({ data: {
      id: randomUUID(), businessId: input.businessId, apiKeyId: input.apiKeyId, cartId: input.cartId,
      contactId: contact.id, externalEventId: input.externalEventId, state: input.state,
      occurredAt: input.occurredAt, outcome: stale ? "stale" : "applied", appliedAt: stale ? null : now,
    } });
    if (stale) {
      await tx.whatsAppAutomationApiKey.updateMany({ where: { id: input.apiKeyId, businessId: input.businessId, status: "active" }, data: { lastUsedAt: now } });
      await writeWhatsAppAuditLog({
        businessId: input.businessId, actorType: "system", action: "automation.cart.transition",
        targetType: "automation_cart", targetId: cart.id, outcome: "success",
        metadata: { state: input.state, transitionOutcome: "stale", scheduled: 0, cancelledEvents: 0, cancelledJobs: 0 }, database: tx,
      });
      return { replay: false as const, outcome: "stale" as const, scheduled: 0, cancelledEvents: 0, cancelledJobs: 0 };
    }

    let scheduled = 0, cancelledEvents = 0, cancelledJobs = 0;
    if (input.state === "abandoned") {
      const automations = await tx.whatsAppAutomation.findMany({
        where: { businessId: input.businessId, status: "active", triggerType: "abandoned_cart" },
        select: { id: true, triggerType: true, triggerConfig: true },
      });
      for (const automation of automations) {
        let delayMinutes: number;
        try {
          const config = readAutomationTriggerConfig(automation.triggerConfig, automation.triggerType);
          if (!("delayMinutes" in config) || !Number.isSafeInteger(config.delayMinutes)) continue;
          delayMinutes = Number(config.delayMinutes);
        } catch { continue; }
        await ingestWhatsAppAutomationEvent({
          businessId: input.businessId, automationId: automation.id, source: "tenant.api.cart",
          externalEventId: `${input.externalEventId}:${automation.id}`, triggerType: "abandoned_cart",
          subjectType: "cart.abandoned", subjectId: input.cartId, contactId: contact.id,
          occurredAt: input.occurredAt, processAt: new Date(input.occurredAt.getTime() + delayMinutes * 60_000), database: tx,
        });
        scheduled += 1;
      }
    } else {
      const cancelled = await cancelPendingCartWork(tx, input.businessId, input.cartId, now);
      cancelledEvents = cancelled.events; cancelledJobs = cancelled.jobs;
    }
    await tx.whatsAppAutomationApiKey.updateMany({ where: { id: input.apiKeyId, businessId: input.businessId, status: "active" }, data: { lastUsedAt: now } });
    await writeWhatsAppAuditLog({
      businessId: input.businessId, actorType: "system", action: "automation.cart.transition",
      targetType: "automation_cart", targetId: cart.id, outcome: "success",
      metadata: { state: input.state, scheduled, cancelledEvents, cancelledJobs }, database: tx,
    });
    return { replay: false as const, outcome: "applied" as const, scheduled, cancelledEvents, cancelledJobs };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
