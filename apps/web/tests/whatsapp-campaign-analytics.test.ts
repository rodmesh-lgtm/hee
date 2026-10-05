import test from "node:test";
import assert from "node:assert/strict";
import { campaignAnalytics, reportPageNumber } from "../app/lib/whatsapp/campaign-analytics";

test("delivery distribution reconciles recipients without double counting reads", () => {
  const stats = campaignAnalytics(2000, { sent: 50, delivered: 462, read: 27, queued: 1100, failed: 133, skipped_opt_out: 228 });
  assert.equal(stats.accepted, 539);
  assert.equal(stats.delivered, 489);
  assert.equal(stats.read, 27);
  assert.equal(stats.distribution.reduce((sum, item) => sum + item.value, 0), 2000);
  assert.equal(stats.mismatch, false);
});
test("unclassified and missing states remain visible rather than inventing delivery", () => {
  const stats = campaignAnalytics(10, { failed: 2, delivery_unknown: 3, future_status: 1 });
  assert.equal(stats.distribution.at(-1)?.value, 8);
  assert.equal(stats.delivered, 0);
  assert.equal(stats.accepted, 0);
  assert.equal(stats.mismatch, true);
  assert.equal(stats.distribution.reduce((sum, item) => sum + item.value, 0), 10);
  assert.equal(campaignAnalytics(0, {}).distribution.reduce((sum, item) => sum + item.value, 0), 0);
});
test("report pagination rejects non-finite, fractional, and negative values", () => {
  for (const value of ["NaN", "Infinity", "-1", "1.5", "0"]) assert.equal(reportPageNumber(value), 1);
  assert.equal(reportPageNumber("999999999"), 10000);
  assert.equal(reportPageNumber("2"), 2);
});
