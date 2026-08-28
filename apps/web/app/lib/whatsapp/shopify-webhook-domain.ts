import { createHash } from "node:crypto";
import { normalizeE164 } from "./contact-domain";

type RecordValue = Record<string, unknown>;

export type ShopifyCartTransition = {
  cartId: string;
  state: "active" | "completed";
  occurredAt: Date;
  phoneE164: string | null;
};

export type ShopifyWebhookMapping =
  | { kind: "transition"; transition: ShopifyCartTransition }
  | { kind: "ignored"; reason: "topic_unsupported" | "payload_invalid" | "cart_id_missing" };

function record(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function scalarId(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  return "";
}

function boundedCartId(value: string) {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return null;
  const raw = `shopify:${normalized}`;
  if (raw.length <= 120 && /^[\x21-\x7e]+$/.test(raw)) return raw;
  return `shopify:sha256:${createHash("sha256").update(normalized, "utf8").digest("hex")}`;
}

function payloadDate(payload: RecordValue, fallback: Date) {
  for (const value of [payload.updated_at, payload.created_at]) {
    if (typeof value !== "string") continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return fallback;
}

function phone(payload: RecordValue) {
  const customer = record(payload.customer);
  const defaultAddress = record(customer?.default_address);
  const billingAddress = record(payload.billing_address);
  const shippingAddress = record(payload.shipping_address);
  for (const value of [payload.phone, customer?.phone, defaultAddress?.phone, billingAddress?.phone, shippingAddress?.phone]) {
    const normalized = normalizeE164(value);
    if (normalized) return normalized;
  }
  return null;
}

export function mapShopifyCommerceWebhook(input: {
  topic: string;
  payload: unknown;
  triggeredAt: Date | null;
  receivedAt: Date;
}): ShopifyWebhookMapping {
  if (!["checkouts/create", "checkouts/update", "orders/create"].includes(input.topic)) {
    return { kind: "ignored", reason: "topic_unsupported" };
  }
  const payload = record(input.payload);
  if (!payload) return { kind: "ignored", reason: "payload_invalid" };
  const order = input.topic === "orders/create";
  const identity = order
    ? scalarId(payload.checkout_token) || scalarId(payload.checkout_id) || scalarId(payload.cart_token)
    : scalarId(payload.token) || scalarId(payload.id) || scalarId(payload.cart_token);
  const cartId = boundedCartId(identity);
  if (!cartId) return { kind: "ignored", reason: "cart_id_missing" };
  const occurredAt = input.triggeredAt ?? payloadDate(payload, input.receivedAt);
  return {
    kind: "transition",
    transition: {
      cartId,
      state: order || Boolean(payload.completed_at) ? "completed" : "active",
      occurredAt,
      phoneE164: phone(payload),
    },
  };
}
