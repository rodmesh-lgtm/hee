import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { automationIdempotencyKey, automationMatchesEvent, automationRetryAt, normalizeAutomationTriggerType, readTemplateActionConfig } from "./automation-domain";
import { writeWhatsAppAuditLog } from "./audit";

type AutomationDb = Pick<PrismaClient, "whatsAppAutomationEvent">;
const MAX_EVENT_ATTEMPTS = 8;

type AutomationEventInput = {
  businessId: string; source: string; externalEventId: string; triggerType: string;
  subjectType: string; subjectId: string; contactId?: string; occurredAt: Date; automationId?: string;
  processAt?: Date;
};

function automationEventData(input: AutomationEventInput): Prisma.WhatsAppAutomationEventCreateManyInput {
  const triggerType = normalizeAutomationTriggerType(input.triggerType);
  if (!/^[a-z0-9_.:-]{1,80}$/i.test(input.source) || !input.externalEventId || input.externalEventId.length > 160) {
    throw new Error("WHATSAPP_AUTOMATION_EVENT_ID_INVALID");
  }
  if (!/^[a-z0-9_.:-]{1,80}$/i.test(input.subjectType) || !input.subjectId || input.subjectId.length > 160) {
    throw new Error("WHATSAPP_AUTOMATION_SUBJECT_INVALID");
  }
  if (!(input.occurredAt instanceof Date) || Number.isNaN(input.occurredAt.getTime())) throw new Error("WHATSAPP_AUTOMATION_TIME_INVALID");
  const processAt = input.processAt ?? input.occurredAt;
  if (!(processAt instanceof Date) || Number.isNaN(processAt.getTime()) || processAt < input.occurredAt || processAt.getTime() > input.occurredAt.getTime() + 366 * 24 * 60 * 60_000) {
    throw new Error("WHATSAPP_AUTOMATION_PROCESS_TIME_INVALID");
  }
  return {
    businessId: input.businessId, automationId: input.automationId, source: input.source,
    externalEventId: input.externalEventId, triggerType, subjectType: input.subjectType,
    subjectId: input.subjectId, contactId: input.contactId, occurredAt: input.occurredAt, nextAttemptAt: processAt,
  };
}

export async function ingestWhatsAppAutomationEvent(input: AutomationEventInput & { database?: AutomationDb }) {
  const database = input.database ?? db;
  const data = automationEventData(input);
  return database.whatsAppAutomationEvent.upsert({
    where: { businessId_source_externalEventId: {
      businessId: input.businessId, source: input.source, externalEventId: input.externalEventId,
    } },
    create: data,
    update: {},
    select: { id: true, status: true },
  });
}

export async function ingestWhatsAppAutomationEvents(input: {
  events: AutomationEventInput[];
  database?: AutomationDb;
}) {
  if (!input.events.length) return { count: 0 };
  if (input.events.length > 500) throw new Error("WHATSAPP_AUTOMATION_EVENT_BATCH_TOO_LARGE");
  const database = input.database ?? db;
  return database.whatsAppAutomationEvent.createMany({
    data: input.events.map(automationEventData),
    skipDuplicates: true,
  });
}

async function lockEvent(tx: Prisma.TransactionClient, eventId: string) {
  const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "WhatsAppAutomationEvent" WHERE "id" = ${eventId} FOR UPDATE
  `);
  if (!rows[0]) throw new Error("WHATSAPP_AUTOMATION_EVENT_NOT_FOUND");
}

export async function processWhatsAppAutomationEvent(input: {
  eventId: string; workerId: string; database?: Pick<PrismaClient, "$transaction">; now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  return database.$transaction(async (tx) => {
    await lockEvent(tx, input.eventId);
    const event = await tx.whatsAppAutomationEvent.findUnique({ where: { id: input.eventId } });
    if (!event) throw new Error("WHATSAPP_AUTOMATION_EVENT_NOT_FOUND");
    if (event.status === "processed") return { processed: true as const, replay: true as const, jobs: 0 };
    if (event.status === "failed") return { processed: false as const, terminal: true as const, jobs: 0 };
    if (event.nextAttemptAt > now) return { processed: false as const, deferred: true as const, jobs: 0 };

    await tx.whatsAppAutomationEvent.update({
      where: { id: event.id }, data: {
        status: "processing", attemptCount: { increment: 1 }, leaseOwner: input.workerId.slice(0, 100),
        leaseExpiresAt: new Date(now.getTime() + 5 * 60_000), processingErrorCode: null,
      },
    });
    try {
      if (!event.contactId) throw new Error("WHATSAPP_AUTOMATION_CONTACT_REQUIRED");
      const contact = await tx.whatsAppContact.findFirst({
        where: { id: event.contactId, businessId: event.businessId },
        select: { id: true, phoneE164: true, optedOutAt: true },
      });
      if (!contact) throw new Error("WHATSAPP_AUTOMATION_CONTACT_NOT_FOUND");
      const consent = await tx.whatsAppConsent.findUnique({
        where: { businessId_phoneE164: { businessId: event.businessId, phoneE164: contact.phoneE164 } },
        select: { revokedAt: true },
      });
      let eventSkipReason: string | null = null;
      if (event.triggerType === "abandoned_cart") {
        const cart = event.subjectType === "cart.abandoned" ? await tx.whatsAppAutomationCart.findUnique({
          where: { businessId_cartId: { businessId: event.businessId, cartId: event.subjectId } },
          select: { contactId: true, state: true, occurredAt: true },
        }) : null;
        if (!cart || cart.state !== "abandoned" || cart.contactId !== contact.id || cart.occurredAt.getTime() !== event.occurredAt.getTime()) {
          eventSkipReason = "cart_no_longer_abandoned";
        }
      }
      const automations = await tx.whatsAppAutomation.findMany({
        where: {
          businessId: event.businessId, status: "active", triggerType: event.triggerType,
          ...(event.automationId ? { id: event.automationId } : {}),
          connection: { status: "connected" },
        },
        select: { id: true, businessId: true, connectionId: true, triggerType: true, triggerConfig: true, actionType: true, actionConfig: true, cooldownMinutes: true },
      });
      let jobs = 0;
      for (const automation of automations) {
        if (!automationMatchesEvent({ triggerType: automation.triggerType, triggerConfig: automation.triggerConfig, subjectType: event.subjectType })) continue;
        const key = automationIdempotencyKey({ businessId: event.businessId, automationId: automation.id, eventId: event.id, contactId: contact.id });
        const skipReason = eventSkipReason ?? (contact.optedOutAt ? "contact_opted_out" : !consent || consent.revokedAt ? "marketing_consent_missing" : null);
        const cooldownSince = new Date(now.getTime() - automation.cooldownMinutes * 60_000);
        const recentlyRun = automation.cooldownMinutes > 0 && await tx.whatsAppAutomationRun.findFirst({
          where: { businessId: event.businessId, automationId: automation.id, contactId: contact.id, createdAt: { gte: cooldownSince }, status: { in: ["queued", "completed"] } },
          select: { id: true },
        });
        const run = await tx.whatsAppAutomationRun.upsert({
          where: { automationId_eventId: { automationId: automation.id, eventId: event.id } },
          create: {
            businessId: event.businessId, automationId: automation.id, eventId: event.id, contactId: contact.id,
            idempotencyKey: key, status: skipReason || recentlyRun ? "skipped" : "queued",
            skipReason: skipReason ?? (recentlyRun ? "cooldown_active" : null), completedAt: skipReason || recentlyRun ? now : null,
          },
          update: {},
          select: { id: true, status: true },
        });
        if (run.status !== "queued") continue;
        if (automation.actionType !== "send_template") throw new Error("WHATSAPP_AUTOMATION_ACTION_UNSUPPORTED");
        const action = readTemplateActionConfig(automation.actionConfig);
        const template = await tx.whatsAppTemplate.findFirst({
          where: { id: action.templateId, businessId: event.businessId, connectionId: automation.connectionId, status: "approved" },
          select: { id: true },
        });
        if (!template) throw new Error("WHATSAPP_AUTOMATION_TEMPLATE_NOT_APPROVED");
        await tx.whatsAppAutomationJob.upsert({
          where: { runId: run.id },
          create: {
            businessId: event.businessId, automationId: automation.id, runId: run.id,
            connectionId: automation.connectionId, contactId: contact.id, templateId: template.id,
            idempotencyKey: key, templateParameters: action.parameters as Prisma.InputJsonValue | undefined,
          },
          update: {},
        });
        jobs += 1;
      }
      await tx.whatsAppAutomationEvent.update({
        where: { id: event.id }, data: { status: "processed", processedAt: now, leaseOwner: null, leaseExpiresAt: null },
      });
      await writeWhatsAppAuditLog({
        businessId: event.businessId, actorType: "worker", action: "automation.event.process",
        targetType: "automation_event", targetId: event.id, outcome: "success", metadata: { jobs }, database: tx,
      });
      return { processed: true as const, replay: false as const, jobs };
    } catch (error) {
      const attempt = event.attemptCount + 1;
      const terminal = attempt >= MAX_EVENT_ATTEMPTS;
      const code = error instanceof Error ? error.message.slice(0, 100) : "WHATSAPP_AUTOMATION_PROCESSING_FAILED";
      await tx.whatsAppAutomationEvent.update({
        where: { id: event.id }, data: {
          status: terminal ? "failed" : "retry_scheduled", nextAttemptAt: automationRetryAt(attempt, now),
          leaseOwner: null, leaseExpiresAt: null, processingErrorCode: code,
        },
      });
      return { processed: false as const, terminal, jobs: 0, errorCode: code };
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function processNextWhatsAppAutomationEvent(input: {
  workerId: string;
  database?: PrismaClient;
  now?: Date;
}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const eventId = await database.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
      SELECT "id"
      FROM "WhatsAppAutomationEvent"
      WHERE (
        "status" IN ('pending', 'retry_scheduled')
        OR ("status" = 'processing' AND "leaseExpiresAt" < ${now})
      )
        AND "nextAttemptAt" <= ${now}
      ORDER BY "nextAttemptAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    if (!rows[0]) return null;
    await tx.whatsAppAutomationEvent.update({
      where: { id: rows[0].id },
      data: {
        status: "processing",
        leaseOwner: input.workerId.slice(0, 100),
        leaseExpiresAt: new Date(now.getTime() + 5 * 60_000),
      },
    });
    return rows[0].id;
  });
  if (!eventId) return { processed: false as const, empty: true as const, jobs: 0 };
  return processWhatsAppAutomationEvent({ eventId, workerId: input.workerId, database, now });
}
