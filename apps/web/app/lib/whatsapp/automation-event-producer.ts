import "server-only";

import type { Prisma } from "@prisma/client";
import { automationMatchesEvent, normalizeAutomationTriggerType } from "./automation-domain";
import { ingestWhatsAppAutomationEvent } from "./automation-processor";
import { normalizeE164 } from "./contact-domain";

export async function emitInternalWhatsAppAutomationEvent(input: {
  database: Prisma.TransactionClient;
  businessId: string;
  source: string;
  externalEventId: string;
  triggerType: string;
  subjectType: string;
  subjectId: string;
  customerPhone: string;
  occurredAt?: Date;
}) {
  const triggerType = normalizeAutomationTriggerType(input.triggerType);
  const automations = await input.database.whatsAppAutomation.findMany({
    where: { businessId: input.businessId, status: "active", triggerType },
    select: { triggerType: true, triggerConfig: true },
  });
  const relevant = automations.some((automation) => {
    try {
      return automationMatchesEvent({ triggerType: automation.triggerType, triggerConfig: automation.triggerConfig, subjectType: input.subjectType });
    } catch {
      return false;
    }
  });
  if (!relevant) return { emitted: false as const, reason: "no_matching_automation" as const };

  const phoneE164 = normalizeE164(input.customerPhone, "966");
  if (!phoneE164) return { emitted: false as const, reason: "phone_invalid" as const };
  const contact = await input.database.whatsAppContact.findFirst({
    where: { businessId: input.businessId, phoneE164 },
    select: { id: true },
  });
  if (!contact) return { emitted: false as const, reason: "contact_not_found" as const };

  const event = await ingestWhatsAppAutomationEvent({
    businessId: input.businessId,
    source: input.source,
    externalEventId: input.externalEventId,
    triggerType,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    contactId: contact.id,
    occurredAt: input.occurredAt ?? new Date(),
    database: input.database,
  });
  return { emitted: true as const, eventId: event.id };
}
