import assert from "node:assert/strict";
import test from "node:test";
import { assertOutboundEnabled, deliveryIdempotencyKey, isRetryableMetaStatus, outboundRateLimit, retryDelayMs } from "../app/lib/whatsapp/delivery-domain";

test("delivery idempotency keys are stable and tenant scoped", () => {
  assert.equal(deliveryIdempotencyKey("a", "c", "r"), deliveryIdempotencyKey("a", "c", "r"));
  assert.notEqual(deliveryIdempotencyKey("a", "c", "r"), deliveryIdempotencyKey("b", "c", "r"));
});

test("retry policy is bounded and limited to transient HTTP failures", () => {
  assert.equal(retryDelayMs(1), 30_000);
  assert.equal(retryDelayMs(6), 960_000);
  assert.equal(retryDelayMs(1, 9_999), 3_600_000);
  assert.equal(isRetryableMetaStatus(429), true);
  assert.equal(isRetryableMetaStatus(503), true);
  assert.equal(isRetryableMetaStatus(400), false);
});

test("outbound and rate controls fail closed", () => {
  assert.throws(() => assertOutboundEnabled({ NODE_ENV: "test" }), /WHATSAPP_OUTBOUND_DISABLED/);
  assert.doesNotThrow(() => assertOutboundEnabled({ NODE_ENV: "test", WHATSAPP_OUTBOUND_ENABLED: "true" }));
  assert.equal(outboundRateLimit({ NODE_ENV: "test" }), 20);
  assert.throws(() => outboundRateLimit({ NODE_ENV: "test", WHATSAPP_SEND_MAX_PER_MINUTE: "0" }), /RATE_LIMIT_INVALID/);
  assert.throws(() => outboundRateLimit({ NODE_ENV: "test", WHATSAPP_SEND_MAX_PER_MINUTE: "1001" }), /RATE_LIMIT_INVALID/);
});
