import assert from "node:assert/strict";
import test from "node:test";
import { sallaWebhookStoragePayload } from "../app/lib/commerce/salla-webhook-storage";

test("partner authorization tokens and merchant secrets never enter the operational inbox", () => {
  for (const event of ["app.store.authorize", "app.settings.updated", "app.subscription.started", "app.uninstalled"]) {
    const stored = sallaWebhookStoragePayload({ event, merchant: 123, data: {
      access_token: "private-access", refresh_token: "private-refresh", settings: { arbitrary_vendor_key: "private-setting" },
    }, secret: "private-root" }, event, "123");
    assert.deepEqual(stored, { event, merchant: "123", data: { omitted: true } });
    assert.doesNotMatch(JSON.stringify(stored), /private-|access_token|refresh_token|arbitrary_vendor_key/);
  }
});

test("order and cart processors retain their original verified business payload", () => {
  for (const event of ["order.created", "order.status.updated", "cart.abandoned"]) {
    const payload = { event, merchant: 123, data: { id: 456, status: "paid" } };
    assert.equal(sallaWebhookStoragePayload(payload, event, "123"), payload);
  }
});
