import "server-only";
import type { Prisma } from "@prisma/client";
import { ingestWhatsAppAutomationEvent } from "../whatsapp/automation-processor";
import { readSallaOrderStatusConfig, sallaOrderScenarioStatus } from "../whatsapp/salla-order-journey-domain";

/** Only verified live order webhooks may invoke this; historical sync never sends. */
export async function enqueueSallaOrderStatus(input: {
  database: Prisma.TransactionClient; businessId: string; eligibilityId: string;
  phoneE164: string | null; previousStatus: string | null; orderStatus: string | null; receivedAt: Date;
}) {
  const status = sallaOrderScenarioStatus(input.orderStatus);
  if (!status || !input.phoneE164 || status === sallaOrderScenarioStatus(input.previousStatus)) return;
  const consent = await input.database.whatsAppConsent.findFirst({
    where: { businessId: input.businessId, phoneE164: input.phoneE164, revokedAt: null, consentedAt: { lte: input.receivedAt } },
    select: { id: true },
  });
  if (!consent) return;
  const contact = await input.database.whatsAppContact.upsert({
    where: { businessId_phoneE164: { businessId: input.businessId, phoneE164: input.phoneE164 } },
    create: { businessId: input.businessId, phoneE164: input.phoneE164, source: "salla_order_status" }, update: {},
    select: { id: true, optedOutAt: true },
  });
  if (contact.optedOutAt) return;
  // JSON filtering avoids a scan of other scenarios. Latest activation owns the
  // route; a duplicate configuration never creates two sends for the same state.
  const automation = await input.database.whatsAppAutomation.findFirst({
    where: { businessId: input.businessId, triggerType: "salla_order_status", status: "active",
      activatedAt: { lte: input.receivedAt }, triggerConfig: { path: ["orderStatus"], equals: status } },
    orderBy: [{ activatedAt: "desc" }, { id: "asc" }], select: { id: true, triggerConfig: true },
  });
  if (!automation) return;
  const config = readSallaOrderStatusConfig(automation.triggerConfig);
  await ingestWhatsAppAutomationEvent({
    database: input.database, businessId: input.businessId, automationId: automation.id,
    source: "salla.order-status", externalEventId: `${input.eligibilityId}:${status}`,
    triggerType: "salla_order_status", subjectType: `salla.order.status.${status}`,
    subjectId: input.eligibilityId, contactId: contact.id, occurredAt: input.receivedAt,
    processAt: new Date(input.receivedAt.getTime() + config.delayMinutes * 60_000),
  });
}
