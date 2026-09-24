import "server-only";
import type { Prisma } from "@prisma/client";
import { ingestWhatsAppAutomationEvent } from "../whatsapp/automation-processor";

/** Called only from verified live webhooks, never historical order imports. */
export async function enqueueSallaOrderConfirmation(input: {
  database: Prisma.TransactionClient;
  businessId: string;
  eligibilityId: string;
  phoneE164: string | null;
  receivedAt: Date;
}) {
  if (!input.phoneE164) return;
  // A purchase is not consent. Consent is checked again by both workers.
  const consent = await input.database.whatsAppConsent.findFirst({
    where: { businessId: input.businessId, phoneE164: input.phoneE164, revokedAt: null, consentedAt: { lte: input.receivedAt } },
    select: { id: true },
  });
  if (!consent) return;
  const contact = await input.database.whatsAppContact.upsert({
    where: { businessId_phoneE164: { businessId: input.businessId, phoneE164: input.phoneE164 } },
    create: { businessId: input.businessId, phoneE164: input.phoneE164, source: "salla_order_confirmation" },
    update: {},
    select: { id: true, optedOutAt: true },
  });
  if (contact.optedOutAt) return;
  // Only the most recently activated route can send for an order, even if an
  // earlier route was accidentally left active on a different sender.
  const automation = await input.database.whatsAppAutomation.findFirst({
    where: { businessId: input.businessId, triggerType: "salla_order_confirmation", status: "active", activatedAt: { lte: input.receivedAt } },
    orderBy: [{ activatedAt: "desc" }, { id: "asc" }],
    select: { id: true },
  });
  if (!automation) return;
  await ingestWhatsAppAutomationEvent({
    database: input.database, businessId: input.businessId, automationId: automation.id,
    source: "salla.order-confirmation", externalEventId: `${input.eligibilityId}:${automation.id}`,
    triggerType: "salla_order_confirmation", subjectType: "salla.order.confirmed",
    subjectId: input.eligibilityId, contactId: contact.id, occurredAt: input.receivedAt,
  });
}
