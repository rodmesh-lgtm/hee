import assert from "node:assert/strict";
import test from "node:test";
import { assertOutboundEnabled, deliveryIdempotencyKey, isRetryableMetaStatus, outboundRateLimit, parseRetryAfter, retryDelayMs, shouldRetryCampaignReceipt } from "../app/lib/whatsapp/delivery-domain";

test("receipt retries are bounded, temporary-only, and never revive cancelled campaigns", () => {
  const input = { errorCode: "131016", attemptCount: 1, createdAt: new Date("2026-09-26T10:00:00Z"), now: new Date("2026-09-26T11:00:00Z"), campaignStatus: "running", recipientStatus: "sent" };
  assert.equal(shouldRetryCampaignReceipt(input), true);
  assert.equal(shouldRetryCampaignReceipt({ ...input, campaignStatus: "completed" }), true);
  for (const errorCode of [null, "131049", "131026", "190", "132015", "UNKNOWN"]) assert.equal(shouldRetryCampaignReceipt({ ...input, errorCode }), false);
  for (const campaignStatus of ["cancelled", "failed", "ready", "draft"]) assert.equal(shouldRetryCampaignReceipt({ ...input, campaignStatus }), false);
  for (const recipientStatus of ["delivered", "read", "skipped_opt_out", "cancelled"]) assert.equal(shouldRetryCampaignReceipt({ ...input, recipientStatus }), false);
  assert.equal(shouldRetryCampaignReceipt({ ...input, attemptCount: 6 }), false);
  assert.equal(shouldRetryCampaignReceipt({ ...input, now: new Date("2026-09-27T10:00:00Z") }), false);
});

test("missing or malformed Retry-After preserves exponential backoff", () => {
  const now = new Date("2026-09-26T16:00:00Z");
  for (const value of [null, "", " ", "invalid", "-1"]) {
    assert.equal(parseRetryAfter(value, now), null);
    assert.equal(retryDelayMs(3, parseRetryAfter(value, now)), 120_000);
  }
  assert.equal(parseRetryAfter("120", now), 120);
  assert.equal(parseRetryAfter("0", now), 0);
  assert.equal(parseRetryAfter("Sat, 26 Sep 2026 16:02:00 GMT", now), 120);
  assert.equal(parseRetryAfter("Sat, 26 Sep 2026 15:00:00 GMT", now), null);
});

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
