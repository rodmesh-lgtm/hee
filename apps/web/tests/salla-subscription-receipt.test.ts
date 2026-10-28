import assert from "node:assert/strict";
import test from "node:test";
import { sallaSubscriptionReceipt, readSallaSubscriptionReceipt, isSallaSubscriptionEvent } from "../app/lib/commerce/salla-subscription-receipt";

const payload = { event: "app.subscription.started", merchant: 321, created_at: "2026-10-27 10:00:00", data: {
  id: 123, subscription_id: 456, item_type: "plan", plan_name: null, plan_type: "recurring", plan_period: "1",
  start_date: "2026-10-27T07:00:00.000000Z", end_date: "2026-11-27T07:00:00.000000Z", store_type: "development",
  features: [{ key: "users", quantity: "3" }], access_token: "private-access", refresh_token: "private-refresh",
  customer: { phone: "private-phone" }, settings: { api_key: "private-key" }, coupon: { name: "private-coupon" },
} };

test("a signed billing receipt retains only identifiers, period and bounded numeric plan features", () => {
  const receipt = sallaSubscriptionReceipt(payload, "123", "321", 180);
  assert.equal(receipt.occurredAt, "2026-10-27T07:00:00.000Z");
  assert.equal(receipt.subscriptionId, "456");
  assert.equal(receipt.itemType, "plan");
  assert.equal(receipt.planName, null);
  assert.deepEqual(receipt.features, [{ key: "users", quantity: 3 }]);
  assert.doesNotMatch(JSON.stringify(receipt), /private-|access_token|refresh_token|customer|settings|coupon/);
  assert.equal("entitlement" in receipt, false);
});

test("another app, merchant or event cannot create a subscription receipt", () => {
  for (const args of [[payload, "124", "321"], [payload, "123", "322"], [{ ...payload, event: "app.store.authorize" }, "123", "321"]] as const) {
    assert.throws(() => sallaSubscriptionReceipt(args[0], args[1], args[2], 180), /SALLA_SUBSCRIPTION_IDENTITY_INVALID/);
  }
  assert.equal(isSallaSubscriptionEvent("app.settings.updated"), false);
  assert.equal(isSallaSubscriptionEvent("app.subscription.renewed"), true);
});

test("numeric provider identifiers cannot silently lose integer precision", () => {
  assert.throws(() => sallaSubscriptionReceipt({ ...payload, data: { ...payload.data, id: Number.MAX_SAFE_INTEGER + 1 } }, String(Number.MAX_SAFE_INTEGER + 1), "321", 180), /SALLA_SUBSCRIPTION_IDENTITY_INVALID/);
  assert.equal(sallaSubscriptionReceipt({ ...payload, data: { ...payload.data, subscription_id: Number.MAX_SAFE_INTEGER + 1 } }, "123", "321", 180).subscriptionId, null);
});

test("trial dates use the explicit deployment zone and invalid dates do not become a paid period", () => {
  const receipt = sallaSubscriptionReceipt({ ...payload, event: "app.trial.started", data: { ...payload.data, start_date: "2026-10-27", end_date: "2026-02-30" } }, "123", "321", 180);
  assert.equal(receipt.itemType, "trial");
  assert.equal(receipt.startsAt, "2026-10-26T21:00:00.000Z");
  assert.equal(receipt.endsAt, null);
});

test("addon and unknown plan events remain distinct and never imply base-plan activation", () => {
  const read = (item_type: unknown) => sallaSubscriptionReceipt({ ...payload, data: { ...payload.data, item_type } }, "123", "321", 180);
  assert.equal(read("addon").itemType, "addon");
  assert.equal(read(undefined).itemType, "unknown");
});

test("feature credential fields, nonnumeric values and unbounded arrays are excluded", () => {
  const features = [{ key: "access_token", quantity: 1 }, { key: "users", quantity: "private-value" }, { key: "bad key", quantity: 2 }, { key: "users", quantity: -1 }, { key: "users", quantity: 1_000_001 }, ...Array.from({ length: 70 }, (_, i) => ({ key: `feature_${i}`, quantity: i }))];
  const receipt = sallaSubscriptionReceipt({ ...payload, data: { ...payload.data, features } }, "123", "321", 180);
  assert.equal(receipt.features.length, 45);
  assert.doesNotMatch(JSON.stringify(receipt), /access_token|private-value|feature_69/);
});

test("admin reads validate the persisted format and strip unrelated properties", () => {
  const receipt = sallaSubscriptionReceipt(payload, "123", "321", 180);
  assert.deepEqual(readSallaSubscriptionReceipt({ ...receipt, access_token: "private" }), receipt);
  assert.equal(readSallaSubscriptionReceipt({ event: payload.event, merchant: "321", data: { omitted: true } }), null);
  assert.equal(readSallaSubscriptionReceipt({ ...receipt, features: [{ key: "password", quantity: 1 }] }), null);
});
