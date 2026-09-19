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
