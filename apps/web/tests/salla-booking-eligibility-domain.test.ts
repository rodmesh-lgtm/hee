import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { mapSallaOrderWebhook, sallaEventType, sallaMerchantId, verifySallaWebhookSignature } from "../app/lib/commerce/salla-domain";

const paidOrder = {
  event: "order.updated",
  merchant: 7654321,
  data: {
    id: 987654,
    payment_status: "paid",
    status: { slug: "under_review" },
    customer: { mobile: "0564212464" },
    updated_at: "2026-09-19T15:00:00.000Z",
  },
};

test("paid confirmed Salla orders grant booking eligibility using normalized Saudi phones", () => {
  const result = mapSallaOrderWebhook(paidOrder);
  assert.equal(result.kind, "order");
  if (result.kind === "order") {
    assert.equal(result.order.externalOrderId, "987654");
    assert.equal(result.order.phoneE164, "+966564212464");
    assert.equal(result.order.paymentStatus, "paid");
    assert.equal(result.order.orderStatus, "under_review");
    assert.equal(result.order.eligible, true);
    assert.deepEqual(result.order.providerUpdatedAt, new Date("2026-09-19T15:00:00.000Z"));
  }
});

test("unpaid, cancelled and refunded orders fail closed", () => {
  const unpaid = mapSallaOrderWebhook({ ...paidOrder, data: { ...paidOrder.data, payment_status: "pending" } });
  const cancelled = mapSallaOrderWebhook({ ...paidOrder, event: "order.cancelled", data: { ...paidOrder.data, status: { slug: "cancelled" } } });
  const refunded = mapSallaOrderWebhook({ ...paidOrder, event: "order.refunded" });
  for (const result of [unpaid, cancelled, refunded]) {
    assert.equal(result.kind, "order");
    if (result.kind === "order") assert.equal(result.order.eligible, false);
  }
});

test("merchant and event identity are extracted without trusting nested order data", () => {
  assert.equal(sallaMerchantId(paidOrder), "7654321");
  assert.equal(sallaEventType(paidOrder), "order.updated");
  assert.deepEqual(mapSallaOrderWebhook({ event: "customer.created", merchant: 1, data: {} }), { kind: "ignored", reason: "event_unsupported" });
});

test("Salla webhook signature accepts exact hex or base64 HMAC and rejects tampering", () => {
  const raw = JSON.stringify(paidOrder);
  const secret = "salla-webhook-secret-for-tests";
  const hex = createHmac("sha256", secret).update(raw).digest("hex");
  const base64 = createHmac("sha256", secret).update(raw).digest("base64");
  assert.equal(verifySallaWebhookSignature(raw, hex, secret), true);
  assert.equal(verifySallaWebhookSignature(raw, `sha256=${hex}`, secret), true);
  assert.equal(verifySallaWebhookSignature(raw, base64, secret), true);
  assert.equal(verifySallaWebhookSignature(`${raw} `, hex, secret), false);
});

const lightOrder = {
  id: 123, status: { slug: "in_progress" }, customer: { mobile: "0501234567" },
  total: { amount: 16.39, currency: "SAR" },
  payment_actions: {
    remaining_action: { has_remaining_amount: false, paid_amount: { amount: "16.39", currency: "SAR" }, remaining_amount: { amount: 0, currency: "SAR" } },
    refund_action: { refunded_transactions: [], pending_refund_amount: null, refund_amount: { amount: 0, currency: "SAR" } },
  },
};
function eligibleLight(data: object) { const result = mapSallaOrderWebhook({ event: "order.updated", data }); assert.equal(result.kind, "order"); return result.kind === "order" && result.order.eligible; }
test("current Salla light response uses explicit paid and remaining amounts", () => {
  assert.equal(eligibleLight(lightOrder), true);
  const { total, ...rest } = lightOrder;
  assert.equal(eligibleLight({ ...rest, amounts: { total } }), true);
});
test("light payment evidence rejects COD, partial payments, refunds, currency mismatch and missing amounts", () => {
  for (const mutate of [
    (o: typeof lightOrder) => { o.payment_actions.remaining_action.paid_amount.amount = "0"; },
    (o: typeof lightOrder) => { o.payment_actions.remaining_action.paid_amount.amount = "10"; },
    (o: typeof lightOrder) => { o.payment_actions.remaining_action.remaining_amount.amount = 1; },
    (o: typeof lightOrder) => { o.payment_actions.refund_action.refund_amount.amount = 1; },
    (o: typeof lightOrder) => { o.payment_actions.remaining_action.paid_amount.currency = "USD"; },
    (o: typeof lightOrder) => { o.payment_actions.remaining_action.has_remaining_amount = true; },
    (o: typeof lightOrder) => { o.total.amount = 0; },
  ]) { const order = structuredClone(lightOrder); mutate(order); assert.equal(eligibleLight(order), false); }
  assert.equal(eligibleLight({ ...lightOrder, payment_actions: {} }), false);
  assert.equal(eligibleLight({ ...lightOrder, payment_status: "pending" }), false);
  assert.equal(eligibleLight({ ...lightOrder, status: { slug: "cancelled" } }), false);
  assert.equal(eligibleLight({ ...lightOrder, is_pending_payment: true }), false);
});


test("completed Salla orders allow booking without inventing payment evidence", () => {
  for (const payment_status of [undefined, "pending", "paid"]) {
    const result = mapSallaOrderWebhook({ event: "order.updated", data: { id: 1, status: { slug: "completed" }, payment_status, customer: { mobile: "0501234567" } } });
    assert.equal(result.kind, "order");
    if (result.kind === "order") { assert.equal(result.order.eligible, true); assert.equal(result.order.paymentStatus, payment_status ?? null); }
  }
  for (const data of [
    { status: { slug: "under_review" } }, { status: { slug: "cancelled" } },
    { status: { slug: "completed" }, payment_status: "refunded" },
    { status: { slug: "completed" }, payment_actions: { refund_action: { refund_amount: { amount: 1 } } } },
    { status: { slug: "completed" }, draft: true },
  ]) assert.equal(eligibleLight({ id: 1, customer: { mobile: "0501234567" }, ...data }), false);
});
