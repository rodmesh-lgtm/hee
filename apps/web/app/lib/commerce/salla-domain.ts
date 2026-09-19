import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { normalizeE164 } from "../whatsapp/contact-domain";

type UnknownRecord = Record<string, unknown>;

export type SallaOrderEligibility = {
  externalOrderId: string;
  phoneE164: string | null;
  paymentStatus: string | null;
  orderStatus: string | null;
  eligible: boolean;
  providerUpdatedAt: Date | null;
};

export type SallaWebhookMapping =
  | { kind: "order"; order: SallaOrderEligibility }
  | { kind: "ignored"; reason: "event_unsupported" | "payload_invalid" | "order_id_missing" };

const PAID_STATUSES = new Set(["paid", "captured", "completed", "success", "successful"]);
const CONFIRMED_ORDER_STATUSES = new Set([
  "under_review",
  "in_progress",
  "processing",
  "ready",
  "shipped",
  "delivering",
  "delivered",
  "completed",
]);
const TERMINAL_INELIGIBLE_STATUSES = new Set([
  "cancelled",
  "canceled",
  "refunded",
  "failed",
  "deleted",
  "payment_pending",
  "awaiting_payment",
]);

function record(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : null;
}

function scalar(value: unknown) {
  if (typeof value === "string") return value.normalize("NFKC").trim();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return "";
}

function normalizedStatus(value: unknown): string | null {
  const direct = scalar(value);
  if (direct) return direct.toLowerCase().replace(/[\s-]+/g, "_").slice(0, 80);
  const nested = record(value);
  return normalizedStatus(nested?.slug ?? nested?.status ?? nested?.code ?? nested?.name) || null;
}

function payloadDate(order: UnknownRecord) {
  for (const value of [order.updated_at, order.date, order.created_at]) {
    if (typeof value !== "string") continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function orderPhone(order: UnknownRecord) {
  const customer = record(order.customer);
  const shipping = record(order.shipping);
  const shippingAddress = record(shipping?.address);
  const billingAddress = record(order.billing_address);
  for (const candidate of [
    customer?.mobile,
    customer?.phone,
    order.mobile,
    order.phone,
    shippingAddress?.mobile,
    shippingAddress?.phone,
    billingAddress?.mobile,
    billingAddress?.phone,
  ]) {
    const direct = normalizeE164(candidate);
    if (direct) return direct;
    if (typeof candidate === "string") {
      const local = normalizeE164(candidate, "966");
      if (local) return local;
    }
  }
  return null;
}

export function sallaMerchantId(payload: unknown) {
  const root = record(payload);
  const merchant = record(root?.merchant);
  return scalar(merchant?.id ?? root?.merchant_id ?? root?.merchant);
}

export function sallaEventType(payload: unknown) {
  const root = record(payload);
  return scalar(root?.event ?? root?.event_type ?? root?.type).toLowerCase().slice(0, 100);
}

export function sallaWebhookEventId(rawBody: string, merchantId: string, suppliedId?: string | null) {
  const safe = scalar(suppliedId);
  const identity = safe || createHash("sha256").update(rawBody, "utf8").digest("hex");
  return `salla:${merchantId}:${createHash("sha256").update(identity, "utf8").digest("hex")}`;
}

export function verifySallaWebhookSignature(rawBody: string, header: string | null, secret: string) {
  if (!header || secret.length < 16) return false;
  const presented = header.trim().replace(/^sha256=/i, "");
  const expectedHex = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const expectedBase64 = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  return [expectedHex, expectedBase64].some((expected) => {
    const left = Buffer.from(presented, "utf8");
    const right = Buffer.from(expected, "utf8");
    return left.length === right.length && timingSafeEqual(left, right);
  });
}

export function mapSallaOrderWebhook(payload: unknown): SallaWebhookMapping {
  const eventType = sallaEventType(payload);
  if (!eventType.startsWith("order.")) return { kind: "ignored", reason: "event_unsupported" };
  const root = record(payload);
  const order = record(root?.data ?? root?.order);
  if (!order) return { kind: "ignored", reason: "payload_invalid" };
  const externalOrderId = scalar(order.id ?? order.order_id ?? order.reference_id);
  if (!externalOrderId) return { kind: "ignored", reason: "order_id_missing" };

  const payment = record(order.payment);
  const paymentStatus = normalizedStatus(order.payment_status ?? payment?.status ?? order.payment_state);
  const orderStatus = normalizedStatus(order.status ?? order.order_status);
  const revokedByEvent = ["order.cancelled", "order.canceled", "order.refunded", "order.deleted"].includes(eventType);
  const paid = Boolean(paymentStatus && PAID_STATUSES.has(paymentStatus));
  const confirmed = Boolean(orderStatus && CONFIRMED_ORDER_STATUSES.has(orderStatus));
  const terminal = Boolean(orderStatus && TERMINAL_INELIGIBLE_STATUSES.has(orderStatus));

  return {
    kind: "order",
    order: {
      externalOrderId: externalOrderId.slice(0, 160),
      phoneE164: orderPhone(order),
      paymentStatus,
      orderStatus,
      eligible: paid && confirmed && !terminal && !revokedByEvent,
      providerUpdatedAt: payloadDate(order),
    },
  };
}
