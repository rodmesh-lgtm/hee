import assert from "node:assert/strict";
import test from "node:test";
import { mapSallaCartWebhook, sallaCartIdentity, shouldApplySallaCartState } from "../app/lib/commerce/salla-cart-domain";

const now = new Date("2026-09-29T08:00:00Z");
const base = { event: "abandoned.cart", merchant: 123, created_at: "Tue Sep 29 2026 10:00:00 GMT+0300", data: { id: 456, customer: { mobile: "+966500000001", name: "عميل" } } };
test("Salla official cart examples map without inventing consent, phone codes or revenue", () => {
  const cart = mapSallaCartWebhook(base, "123", now);
  assert.equal(cart.kind, "cart");
  if (cart.kind !== "cart") return;
  assert.equal(cart.transition.phoneE164, "+966500000001");
  assert.equal(cart.transition.occurredAt.toISOString(), "2026-09-29T07:00:00.000Z");
  assert.equal(cart.transition.state, "abandoned");
  const purchase = mapSallaCartWebhook({ ...base, event: "abandoned.cart.purchased", data: { id: 456, status: "purchased" } }, "123", now);
  assert.equal(purchase.kind, "cart");
  if (purchase.kind === "cart") { assert.equal(purchase.transition.state, "recovered"); assert.equal(purchase.transition.phoneE164, null); }
  const local = mapSallaCartWebhook({ ...base, data: { id: 456, customer: { mobile: "0500000001" } } }, "123", now);
  if (local.kind === "cart") assert.equal(local.transition.phoneE164, null);
});
test("Salla mapper rejects foreign merchant, invalid identities, ambiguous dates and unknown statuses", () => {
  for (const payload of [{ ...base, merchant: 321 }, { ...base, data: { id: 0 } }, { ...base, data: { id: 1.1 } },
    { ...base, created_at: "2026-09-29 10:00:00" }, { ...base, created_at: "2026-10-29T10:00:00Z" },
    { ...base, event: "abandoned.cart.status.changed", data: { id: 456, status: "mystery" } }]) {
    assert.equal(mapSallaCartWebhook(payload, "123", now).kind, "ignored");
  }
});
test("purchases dominate late abandonment and store identities do not collide", () => {
  const abandoned = { externalCartId: "456", state: "abandoned" as const, occurredAt: now, phoneE164: null, name: null };
  assert.equal(shouldApplySallaCartState({ state: "recovered", occurredAt: new Date(0) }, abandoned), false);
  assert.equal(shouldApplySallaCartState({ state: "abandoned", occurredAt: now }, { ...abandoned, state: "recovered", occurredAt: new Date(0) }), true);
  assert.equal(shouldApplySallaCartState({ state: "abandoned", occurredAt: now }, abandoned), false);
  assert.notEqual(sallaCartIdentity("store-a", "456"), sallaCartIdentity("store-b", "456"));
});
