import { NextResponse } from "next/server";
import { db } from "../../../../lib/db";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../lib/request-body";
import { authenticateWhatsAppAutomationApiRequest } from "../../../../lib/whatsapp/automation-api-auth";
import { automationMatchesEvent, normalizeAutomationApiEventName } from "../../../../lib/whatsapp/automation-domain";
import { ingestWhatsAppAutomationEvent } from "../../../../lib/whatsapp/automation-processor";

type EventPayload = { eventId?: unknown; eventName?: unknown; subjectId?: unknown; contactId?: unknown; phoneE164?: unknown };
function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "WWW-Authenticate": "Bearer" } });
}

export async function POST(request: Request) {
  const auth = await authenticateWhatsAppAutomationApiRequest({ request, scope: "events" });
  if (!auth.ok) return auth.status === 401 ? unauthorized() : NextResponse.json({ error: auth.error }, { status: auth.status, headers: auth.retryAfter ? { "Retry-After": String(auth.retryAfter) } : undefined });
  const key = auth.key;

  let payload: EventPayload;
  try { payload = (await readBoundedJson(request, 16 * 1024)) as EventPayload; }
  catch (error) {
    return NextResponse.json({ error: error instanceof RequestBodyTooLargeError ? "payload_too_large" : "invalid_json" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || Object.keys(payload).some((field) => !["eventId", "eventName", "subjectId", "contactId", "phoneE164"].includes(field))) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const eventId = typeof payload.eventId === "string" ? payload.eventId.trim() : "";
  const subjectId = typeof payload.subjectId === "string" ? payload.subjectId.trim() : eventId;
  const contactId = typeof payload.contactId === "string" ? payload.contactId.trim() : "";
  const phoneE164 = typeof payload.phoneE164 === "string" ? payload.phoneE164.trim() : "";
  if (!/^[A-Za-z0-9_.:-]{1,160}$/.test(eventId) || !/^[A-Za-z0-9_.:-]{1,160}$/.test(subjectId)
    || (Boolean(contactId) === Boolean(phoneE164)) || (contactId && !/^[0-9a-f-]{36}$/i.test(contactId))
    || (phoneE164 && !/^\+[1-9]\d{7,14}$/.test(phoneE164))) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  let eventName: string;
  try { eventName = normalizeAutomationApiEventName(typeof payload.eventName === "string" ? payload.eventName : ""); }
  catch { return NextResponse.json({ error: "invalid_event_name" }, { status: 400 }); }
  const subjectType = `api.event.${eventName}`;

  const result = await db.$transaction(async (tx) => {
    const activeKeys = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "WhatsAppAutomationApiKey"
      WHERE "id" = ${key.id} AND "businessId" = ${key.businessId} AND "status" = 'active'
      FOR SHARE
    `;
    if (!activeKeys[0]) return { kind: "key_revoked" as const };
    const contact = await tx.whatsAppContact.findFirst({
      where: { businessId: key.businessId, optedOutAt: null, ...(contactId ? { id: contactId } : { phoneE164 }) },
      select: { id: true, phoneE164: true },
    });
    if (!contact) return { kind: "contact_not_eligible" as const };
    const consent = await tx.whatsAppConsent.findUnique({
      where: { businessId_phoneE164: { businessId: key.businessId, phoneE164: contact.phoneE164 } }, select: { revokedAt: true },
    });
    if (!consent || consent.revokedAt) return { kind: "contact_not_eligible" as const };
    const automations = await tx.whatsAppAutomation.findMany({
      where: { businessId: key.businessId, status: "active", triggerType: "api_event" }, select: { triggerType: true, triggerConfig: true },
    });
    const matched = automations.some((automation) => {
      try { return automationMatchesEvent({ ...automation, subjectType }); } catch { return false; }
    });
    if (!matched) return { kind: "event_not_configured" as const };
    const previous = await tx.whatsAppAutomationEvent.findUnique({
      where: { businessId_source_externalEventId: { businessId: key.businessId, source: "tenant.api", externalEventId: eventId } },
      select: { id: true, status: true, subjectType: true, subjectId: true, contactId: true },
    });
    if (previous && (previous.subjectType !== subjectType || previous.subjectId !== subjectId || previous.contactId !== contact.id)) {
      return { kind: "idempotency_conflict" as const };
    }
    const event = await ingestWhatsAppAutomationEvent({
      businessId: key.businessId, source: "tenant.api", externalEventId: eventId, triggerType: "api_event",
      subjectType, subjectId, contactId: contact.id, occurredAt: new Date(), database: tx,
    });
    await tx.whatsAppAutomationApiKey.updateMany({ where: { id: key.id, businessId: key.businessId, status: "active" }, data: { lastUsedAt: new Date() } });
    return { kind: "accepted" as const, event };
  });
  if (result.kind === "key_revoked") return unauthorized();
  if (result.kind === "idempotency_conflict") return NextResponse.json({ error: result.kind }, { status: 409 });
  if (result.kind !== "accepted") return NextResponse.json({ error: result.kind }, { status: 422 });
  return NextResponse.json({ accepted: true, eventId: result.event.id, status: result.event.status }, { status: 202 });
}
