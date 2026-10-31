import { normalizeE164 } from "../whatsapp/contact-domain";

export function bookingDiagnosticPhone(value: unknown) {
  if (typeof value !== "string" || value.length > 40) return null;
  const text = value.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632));
  if (/^966[\d\s-]+$/.test(text)) return normalizeE164(`+${text}`);
  return normalizeE164(text, "966");
}

export function bookingDiagnosticReason(order: { eligible: boolean; phoneE164: string | null; paymentStatus: string | null; orderStatus: string | null }) {
  if (!order.phoneE164) return "phone_missing";
  if (order.eligible) return "eligible";
  if (["cancelled", "canceled", "refunded", "failed", "deleted"].includes(order.orderStatus ?? "")) return "order_revoked";
  if (!order.paymentStatus) return "payment_unknown";
  if (!["paid", "captured", "completed", "success", "successful"].includes(order.paymentStatus)) return "payment_unconfirmed";
  return "order_unconfirmed";
}
