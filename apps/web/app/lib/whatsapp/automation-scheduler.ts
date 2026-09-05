import "server-only";

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "../db";
import { readAutomationTriggerConfig } from "./automation-domain";
import { ingestWhatsAppAutomationEvents } from "./automation-processor";

const MAX_AUTOMATIONS_PER_CYCLE = 100;
const MAX_EVENTS_PER_CYCLE = 500;

type InactiveCandidate = {
  customerId: string;
  contactId: string;
  lastActivityAt: Date;
};

export async function scheduleInactiveCustomerAutomationEvents(input: {
  database?: PrismaClient;
  now?: Date;
  automationLimit?: number;
  eventLimit?: number;
} = {}) {
  const database = input.database ?? db;
  const now = input.now ?? new Date();
  const automationLimit = Math.max(1, Math.min(input.automationLimit ?? MAX_AUTOMATIONS_PER_CYCLE, MAX_AUTOMATIONS_PER_CYCLE));
  const eventLimit = Math.max(1, Math.min(input.eventLimit ?? MAX_EVENTS_PER_CYCLE, MAX_EVENTS_PER_CYCLE));
  const automations = await database.whatsAppAutomation.findMany({
    where: {
      status: "active",
      triggerType: "inactive_customer",
      connection: { status: "connected", provider: "meta" },
    },
    orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
    take: automationLimit,
    select: { id: true, businessId: true, triggerType: true, triggerConfig: true, connection: { select: { businessId: true, provider: true, status: true } } },
  });

  let emitted = 0;
  let scannedAutomations = 0;
  for (const automation of automations) {
    if (emitted >= eventLimit) break;
    if (automation.connection.businessId !== automation.businessId || automation.connection.provider !== "meta" || automation.connection.status !== "connected") continue;
    let inactiveDays: number;
    try {
      const config = readAutomationTriggerConfig(automation.triggerConfig, automation.triggerType);
      if (!("inactiveDays" in config) || !Number.isSafeInteger(config.inactiveDays)) continue;
      inactiveDays = Number(config.inactiveDays);
    } catch { continue; }
    scannedAutomations += 1;
    const cutoff = new Date(now.getTime() - inactiveDays * 24 * 60 * 60_000);
    const remaining = eventLimit - emitted;
    const candidates = await database.$queryRaw<InactiveCandidate[]>(Prisma.sql`
      WITH customer_activity AS (
        SELECT
          c."id" AS "customerId",
          GREATEST(
            COALESCE((
              SELECT MAX(o."updatedAt") FROM "Order" o
              WHERE o."businessId" = c."businessId" AND o."customerId" = c."id" AND o."status" = 'completed'
            ), '-infinity'::timestamp),
            COALESCE((
              SELECT MAX(b."updatedAt") FROM "Booking" b
              WHERE b."businessId" = c."businessId" AND b."customerId" = c."id" AND b."status" = 'completed'
            ), '-infinity'::timestamp)
          ) AS "lastActivityAt"
        FROM "Customer" c
        WHERE c."businessId" = ${automation.businessId}
      )
      SELECT activity."customerId", contact."id" AS "contactId", activity."lastActivityAt"
      FROM customer_activity activity
      INNER JOIN "Customer" customer
        ON customer."id" = activity."customerId" AND customer."businessId" = ${automation.businessId}
      INNER JOIN "WhatsAppContact" contact
        ON contact."businessId" = ${automation.businessId}
        AND contact."optedOutAt" IS NULL
        AND contact."phoneE164" = CASE
          WHEN customer."phone" ~ '^00[1-9][0-9]{7,14}$' THEN '+' || SUBSTRING(customer."phone" FROM 3)
          WHEN customer."phone" ~ '^966[0-9]{7,12}$' THEN '+' || customer."phone"
          WHEN customer."phone" ~ '^0+[0-9]{7,14}$' THEN '+966' || REGEXP_REPLACE(customer."phone", '^0+', '')
          ELSE NULL
        END
      INNER JOIN "WhatsAppConsent" consent
        ON consent."businessId" = ${automation.businessId}
        AND consent."phoneE164" = contact."phoneE164"
        AND consent."revokedAt" IS NULL
        AND consent."consentedAt" <= ${now}
      WHERE activity."lastActivityAt" > '-infinity'::timestamp
        AND activity."lastActivityAt" <= ${cutoff}
        AND NOT EXISTS (
          SELECT 1 FROM "WhatsAppAutomationEvent" event
          WHERE event."businessId" = ${automation.businessId}
            AND event."automationId" = ${automation.id}
            AND event."source" = 'ir.customer.inactive'
            AND event."subjectId" = activity."customerId"
            AND event."occurredAt" = activity."lastActivityAt" + ${inactiveDays} * INTERVAL '1 day'
        )
      ORDER BY activity."lastActivityAt" ASC, activity."customerId" ASC
      LIMIT ${remaining}
    `);
    if (!candidates.length) continue;
    const result = await ingestWhatsAppAutomationEvents({
      events: candidates.map((candidate) => ({
        businessId: automation.businessId,
        automationId: automation.id,
        source: "ir.customer.inactive",
        externalEventId: `${automation.id}:${candidate.customerId}:${candidate.lastActivityAt.getTime()}`,
        triggerType: "inactive_customer",
        subjectType: "customer.inactive",
        subjectId: candidate.customerId,
        contactId: candidate.contactId,
        occurredAt: new Date(candidate.lastActivityAt.getTime() + inactiveDays * 24 * 60 * 60_000),
      })),
      database,
    });
    emitted += result.count;
  }
  return { emitted, scannedAutomations };
}
