import { normalizeE164 } from "../whatsapp/contact-domain";
import { sallaEventType, sallaMerchantId } from "./salla-domain";

// Official payload examples: https://docs.salla.dev/433812m0
export const SALLA_CART_EVENTS = ["abandoned.cart", "abandoned.cart.updated", "abandoned.cart.status.changed", "abandoned.cart.purchased"] as const;
export type SallaCartTransition = { externalCartId: string; state: "abandoned" | "recovered"; occurredAt: Date; phoneE164: string | null; name: string | null };
const record = (value: unknown): Record<string, unknown> | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function mapSallaCartWebhook(payload: unknown, merchantId: string, now = new Date()):
  { kind: "cart"; transition: SallaCartTransition } | { kind: "ignored"; reason: string } {
  const event = sallaEventType(payload);
  if (!(SALLA_CART_EVENTS as readonly string[]).includes(event)) return { kind: "ignored", reason: "event_unsupported" };
  if (sallaMerchantId(payload) !== merchantId) return { kind: "ignored", reason: "merchant_mismatch" };
  const root = record(payload), data = record(root?.data), customer = record(data?.customer);
  const id = typeof data?.id === "number" && Number.isSafeInteger(data.id) ? String(data.id) : typeof data?.id === "string" ? data.id : "";
  if (!/^[1-9]\d{0,31}$/.test(id)) return { kind: "ignored", reason: "cart_id_invalid" };
  const dateText = typeof root?.created_at === "string" ? root.created_at : "";
  const occurredAt = new Date(dateText);
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/.test(dateText) || !Number.isFinite(occurredAt.getTime()) || occurredAt.getTime() > now.getTime() + 300_000) return { kind: "ignored", reason: "cart_date_invalid" };
  const purchased = data?.status === "purchased";
  if ((event === "abandoned.cart.status.changed" || event === "abandoned.cart.purchased") && !purchased) return { kind: "ignored", reason: "cart_status_unsupported" };
  if (data?.status != null && !["purchased", "abandoned"].includes(String(data.status))) return { kind: "ignored", reason: "cart_status_unsupported" };
  return { kind: "cart", transition: {
    externalCartId: id, state: purchased ? "recovered" : "abandoned", occurredAt,
    phoneE164: normalizeE164(customer?.mobile),
    name: typeof customer?.name === "string" ? customer.name.trim().slice(0, 160) || null : null,
  } };
}

export function sallaCartIdentity(integrationId: string, externalCartId: string) { return `salla:${integrationId}:${externalCartId}`; }

export function shouldApplySallaCartState(current: { state: string; occurredAt: Date } | null, next: SallaCartTransition) {
  if (!current) return true;
  // A purchased cart can never be reopened by an out-of-order abandonment notification.
  if (current.state === "recovered") return false;
  if (next.state === "recovered") return true;
  return next.occurredAt > current.occurredAt;
}
