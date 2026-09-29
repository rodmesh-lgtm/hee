import "server-only";
import { Prisma } from "@prisma/client";
import { applyWhatsAppAutomationCartTransitionInTransaction } from "../whatsapp/automation-cart-lifecycle";
import { sallaCartIdentity, shouldApplySallaCartState, type SallaCartTransition } from "./salla-cart-domain";

export async function processSallaCartTransition(tx: Prisma.TransactionClient, input: {
  businessId: string; integrationId: string; eventId: string; transition: SallaCartTransition; now: Date;
}) {
  const { businessId, integrationId, transition, now } = input;
  const integrations = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "WhatsAppCommerceIntegration" WHERE "id" = ${integrationId}
      AND "businessId" = ${businessId} AND "provider" = 'salla' AND "status" = 'active' FOR SHARE
  `);
  if (!integrations[0]) throw new Error("SALLA_INTEGRATION_INACTIVE");
  const cartId = sallaCartIdentity(integrationId, transition.externalCartId);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`wa-cart:${businessId}:${cartId}`}))`;
  const key = { integrationId_externalCartId: { integrationId, externalCartId: transition.externalCartId } };
  const previous = await tx.sallaCartState.findUnique({ where: key });
  const apply = shouldApplySallaCartState(previous, transition);
  const state = apply ? transition.state : previous!.state as "abandoned" | "recovered";
  const occurredAt = new Date(Math.max(transition.occurredAt.getTime(), previous?.occurredAt.getTime() ?? 0));
  // Persist purchase even before the customer-bearing abandonment event arrives.
  if (apply) await tx.sallaCartState.upsert({ where: key,
    create: { businessId, integrationId, externalCartId: transition.externalCartId, state, occurredAt },
    update: { state, occurredAt },
  });
  const current = await tx.whatsAppAutomationCart.findUnique({ where: { businessId_cartId: { businessId, cartId } }, select: { contactId: true } });
  const contact = transition.phoneE164 ? await tx.whatsAppContact.upsert({
    where: { businessId_phoneE164: { businessId, phoneE164: transition.phoneE164 } },
    create: { businessId, phoneE164: transition.phoneE164, displayName: transition.name, source: "integration" },
    update: {}, // Never overwrite opt-out or manufacture consent from a store event.
    select: { id: true },
  }) : null;
  if (state !== "recovered" && current && contact && current.contactId !== contact.id) return { reason: "cart_contact_conflict", scheduled: 0 };
  const contactId = current?.contactId ?? contact?.id;
  if (!contactId) return { reason: "cart_waiting_for_customer", scheduled: 0 };
  // Updates to the same abandoned cart must not restart the delay or invalidate
  // the original queued reminder's timestamp.
  if (current && previous?.state === "abandoned" && state === "abandoned") return { reason: "same_state", scheduled: 0 };
  const result = await applyWhatsAppAutomationCartTransitionInTransaction({
    businessId, integrationId, integrationProvider: "salla", cartId, contactId,
    externalEventId: input.eventId, state, occurredAt, now,
  }, tx, now);
  return { reason: result.outcome, scheduled: result.scheduled };
}
