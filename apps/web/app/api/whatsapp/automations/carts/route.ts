import { NextResponse } from "next/server";
import { readBoundedJson, RequestBodyTooLargeError } from "../../../../lib/request-body";
import { authenticateWhatsAppAutomationApiRequest } from "../../../../lib/whatsapp/automation-api-auth";
import { applyWhatsAppAutomationCartTransition, type WhatsAppAutomationCartState } from "../../../../lib/whatsapp/automation-cart-lifecycle";

type CartPayload = { eventId?: unknown; cartId?: unknown; state?: unknown; occurredAt?: unknown; contactId?: unknown; phoneE164?: unknown };
const states = new Set<WhatsAppAutomationCartState>(["abandoned", "recovered", "completed"]);

function authFailure(error: string, status: number, retryAfter?: number) {
  return NextResponse.json({ error }, { status, headers: { ...(status === 401 ? { "WWW-Authenticate": "Bearer" } : {}), ...(retryAfter ? { "Retry-After": String(retryAfter) } : {}) } });
}

export async function POST(request: Request) {
  const auth = await authenticateWhatsAppAutomationApiRequest({ request, scope: "carts" });
  if (!auth.ok) return authFailure(auth.error, auth.status, auth.retryAfter);
  let payload: CartPayload;
  try { payload = (await readBoundedJson(request, 16 * 1024)) as CartPayload; }
  catch (error) { return NextResponse.json({ error: error instanceof RequestBodyTooLargeError ? "payload_too_large" : "invalid_json" }, { status: error instanceof RequestBodyTooLargeError ? 413 : 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || Object.keys(payload).some((field) => !["eventId", "cartId", "state", "occurredAt", "contactId", "phoneE164"].includes(field))) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  const eventId = typeof payload.eventId === "string" ? payload.eventId.trim() : "";
  const cartId = typeof payload.cartId === "string" ? payload.cartId.trim() : "";
  const state = typeof payload.state === "string" ? payload.state.trim() as WhatsAppAutomationCartState : "" as WhatsAppAutomationCartState;
  const contactId = typeof payload.contactId === "string" ? payload.contactId.trim() : "";
  const phoneE164 = typeof payload.phoneE164 === "string" ? payload.phoneE164.trim() : "";
  const occurredAt = typeof payload.occurredAt === "string" ? new Date(payload.occurredAt) : new Date(Number.NaN);
  const now = new Date();
  if (!/^[A-Za-z0-9_.:-]{1,100}$/.test(eventId) || !/^[A-Za-z0-9_.:-]{1,120}$/.test(cartId) || !states.has(state)
    || Number.isNaN(occurredAt.getTime()) || occurredAt > new Date(now.getTime() + 5 * 60_000) || occurredAt < new Date(now.getTime() - 30 * 24 * 60 * 60_000)
    || (Boolean(contactId) === Boolean(phoneE164)) || (contactId && !/^[0-9a-f-]{36}$/i.test(contactId)) || (phoneE164 && !/^\+[1-9]\d{7,14}$/.test(phoneE164))) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
  try {
    const result = await applyWhatsAppAutomationCartTransition({
      businessId: auth.key.businessId, apiKeyId: auth.key.id, externalEventId: eventId, cartId, state,
      occurredAt, contactId: contactId || undefined, phoneE164: phoneE164 || undefined, now,
    });
    return NextResponse.json({ accepted: true, ...result }, { status: 202 });
  } catch (error) {
    const code = error instanceof Error ? error.message : "WHATSAPP_AUTOMATION_CART_FAILED";
    if (code === "WHATSAPP_AUTOMATION_API_KEY_REVOKED") return authFailure("unauthorized", 401);
    if (code.endsWith("IDEMPOTENCY_CONFLICT") || code.endsWith("STATE_CONFLICT")) return NextResponse.json({ error: code.toLowerCase() }, { status: 409 });
    if (code.endsWith("CONTACT_NOT_FOUND") || code.endsWith("CONTACT_NOT_ELIGIBLE")) return NextResponse.json({ error: code.toLowerCase() }, { status: 422 });
    return NextResponse.json({ error: "cart_transition_failed" }, { status: 500 });
  }
}
