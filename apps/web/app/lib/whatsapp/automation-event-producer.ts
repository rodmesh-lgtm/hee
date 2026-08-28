import "server-only";

import type { Prisma } from "@prisma/client";
import { appointmentAtRiyadh, automationMatchesEvent, normalizeAutomationTriggerType, readAutomationTriggerConfig } from "./automation-domain";
import { ingestWhatsAppAutomationEvent, ingestWhatsAppAutomationEvents } from "./automation-processor";
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

export async function emitWhatsAppWelcomeEventsForConsentImport(input: {
  database: Prisma.TransactionClient;
  businessId: string;
  importId: string;
  contacts: Array<{ id: string; phoneE164: string }>;
  occurredAt?: Date;
}) {
  if (!input.contacts.length) return { emitted: 0 };
  const automations = await input.database.whatsAppAutomation.findMany({
    where: { businessId: input.businessId, status: "active", triggerType: "welcome" },
    select: { triggerType: true, triggerConfig: true },
  });
  const relevant = automations.some((automation) => {
    try {
      return automationMatchesEvent({
        triggerType: automation.triggerType,
        triggerConfig: automation.triggerConfig,
        subjectType: "contact.consent_granted",
      });
    } catch { return false; }
  });
  if (!relevant) return { emitted: 0 };

  const occurredAt = input.occurredAt ?? new Date();
  const result = await ingestWhatsAppAutomationEvents({
    events: input.contacts.map((contact) => ({
      businessId: input.businessId,
      source: "ir.contacts.consent-import",
      externalEventId: `${input.importId}:${contact.phoneE164}`,
      triggerType: "welcome",
      subjectType: "contact.consent_granted",
      subjectId: contact.id,
      contactId: contact.id,
      occurredAt,
    })),
    database: input.database,
  });
  return { emitted: result.count };
}

export async function scheduleWhatsAppAppointmentReminders(input: {
  database: Prisma.TransactionClient;
  businessId: string;
  bookingId: string;
  bookingDate: string;
  bookingTime: string;
  customerPhone: string;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const appointmentAt = appointmentAtRiyadh(input.bookingDate, input.bookingTime);
  if (!appointmentAt || appointmentAt <= now) return { scheduled: 0, reason: "appointment_not_future" as const };
  const automations = await input.database.whatsAppAutomation.findMany({
    where: { businessId: input.businessId, status: "active", triggerType: "appointment_reminder" },
    select: { id: true, triggerType: true, triggerConfig: true },
  });
  if (!automations.length) return { scheduled: 0, reason: "no_matching_automation" as const };
  const phoneE164 = normalizeE164(input.customerPhone, "966");
  if (!phoneE164) return { scheduled: 0, reason: "phone_invalid" as const };
  const contact = await input.database.whatsAppContact.findFirst({
    where: { businessId: input.businessId, phoneE164 }, select: { id: true },
  });
  if (!contact) return { scheduled: 0, reason: "contact_not_found" as const };

  let scheduled = 0;
  for (const automation of automations) {
    let leadMinutes: number;
    try {
      const config = readAutomationTriggerConfig(automation.triggerConfig, automation.triggerType);
      if (!("leadMinutes" in config) || typeof config.leadMinutes !== "number" || !Number.isSafeInteger(config.leadMinutes)) continue;
      leadMinutes = config.leadMinutes;
    } catch { continue; }
    const processAt = new Date(appointmentAt.getTime() - leadMinutes * 60_000);
    if (processAt <= now) continue;
    await ingestWhatsAppAutomationEvent({
      businessId: input.businessId,
      automationId: automation.id,
      source: "ir.booking.reminder",
      externalEventId: `${input.bookingId}:${automation.id}:${input.bookingDate}:${input.bookingTime}`,
      triggerType: "appointment_reminder",
      subjectType: "booking.reminder",
      subjectId: input.bookingId,
      contactId: contact.id,
      occurredAt: now,
      processAt,
      database: input.database,
    });
    scheduled += 1;
  }
  return { scheduled, appointmentAt };
}

export async function cancelWhatsAppAppointmentReminders(input: {
  database: Prisma.TransactionClient; businessId: string; bookingId: string; now?: Date;
}) {
  const now = input.now ?? new Date();
  const events = await input.database.whatsAppAutomationEvent.findMany({
    where: { businessId: input.businessId, source: "ir.booking.reminder", subjectId: input.bookingId },
    select: { id: true },
  });
  if (!events.length) return { events: 0, jobs: 0 };
  const eventIds = events.map((event) => event.id);
  const runs = await input.database.whatsAppAutomationRun.findMany({
    where: { businessId: input.businessId, eventId: { in: eventIds } }, select: { id: true },
  });
  const runIds = runs.map((run) => run.id);
  const cancelledEvents = await input.database.whatsAppAutomationEvent.updateMany({
    where: { id: { in: eventIds }, businessId: input.businessId, status: { in: ["pending", "retry_scheduled"] } },
    data: { status: "failed", processingErrorCode: "BOOKING_NO_LONGER_CONFIRMED", processedAt: now, leaseOwner: null, leaseExpiresAt: null },
  });
  const cancelledJobs = runIds.length ? await input.database.whatsAppAutomationJob.updateMany({
    where: { businessId: input.businessId, runId: { in: runIds }, status: { in: ["queued", "retry_scheduled"] } },
    data: { status: "cancelled", lastErrorCode: "BOOKING_NO_LONGER_CONFIRMED", leaseOwner: null, leaseExpiresAt: null },
  }) : { count: 0 };
  if (runIds.length) await input.database.whatsAppAutomationRun.updateMany({
    where: { businessId: input.businessId, id: { in: runIds }, status: "queued" },
    data: { status: "failed", skipReason: "booking_no_longer_confirmed", completedAt: now },
  });
  return { events: cancelledEvents.count, jobs: cancelledJobs.count };
}
