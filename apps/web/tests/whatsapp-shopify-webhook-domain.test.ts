import assert from "node:assert/strict";
import test from "node:test";
import { mapShopifyCommerceWebhook } from "../app/lib/whatsapp/shopify-webhook-domain";

const receivedAt = new Date("2026-08-28T20:00:00.000Z");

test("Shopify checkout events remain active and never infer abandonment or consent", () => {
  const result = mapShopifyCommerceWebhook({
    topic: "checkouts/update",
    payload: { id: 123, token: "checkout-token", phone: "+966564212464", updated_at: "2026-08-28T19:59:00.000Z" },
    triggeredAt: null,
    receivedAt,
  });
  assert.deepEqual(result, {
    kind: "transition",
    transition: { cartId: "shopify:checkout-token", state: "active", occurredAt: new Date("2026-08-28T19:59:00.000Z"), phoneE164: "+966564212464" },
    eligibility: null,
  });
});

test("Shopify order completion maps to the same checkout token", () => {
  const result = mapShopifyCommerceWebhook({
    topic: "orders/create",
    payload: { id: 999, checkout_token: "checkout-token", financial_status: "paid", customer: { phone: "+966564212464" } },
    triggeredAt: receivedAt,
    receivedAt,
  });
  assert.equal(result.kind, "transition");
  if (result.kind === "transition") {
    assert.equal(result.transition.cartId, "shopify:checkout-token");
    assert.equal(result.transition.state, "completed");
    assert.equal(result.eligibility?.eligible, true);
    assert.equal(result.eligibility?.externalOrderId, "999");
  }
});

test("Shopify order updates revoke booking eligibility after cancellation", () => {
  const result = mapShopifyCommerceWebhook({
    topic: "orders/updated",
    payload: { id: 999, financial_status: "paid", cancelled_at: "2026-08-28T20:01:00Z", phone: "+966564212464" },
    triggeredAt: receivedAt,
    receivedAt,
  });
  assert.equal(result.kind, "eligibility");
  if (result.kind === "eligibility") assert.equal(result.eligibility.eligible, false);
});

test("unsupported topics and payloads without checkout identity are ignored", () => {
  assert.deepEqual(mapShopifyCommerceWebhook({ topic: "customers/create", payload: {}, triggeredAt: null, receivedAt }), { kind: "ignored", reason: "topic_unsupported" });
  assert.deepEqual(mapShopifyCommerceWebhook({ topic: "checkouts/create", payload: { phone: "+966564212464" }, triggeredAt: null, receivedAt }), { kind: "ignored", reason: "cart_id_missing" });
});

test("local Shopify phone numbers are not guessed into a country", () => {
  const result = mapShopifyCommerceWebhook({ topic: "checkouts/create", payload: { token: "x", phone: "0564212464" }, triggeredAt: null, receivedAt });
  assert.equal(result.kind, "transition");
  if (result.kind === "transition") assert.equal(result.transition.phoneE164, null);
});
