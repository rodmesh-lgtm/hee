import assert from "node:assert/strict";
import test from "node:test";
import { bookingPollDelay } from "../app/lib/booking-poll-delay";
test("connection failures reduce polling pressure and success restores normal polling", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 50].map(n => bookingPollDelay(n)), [10000, 20000, 40000, 80000, 120000, 120000]);
  assert.equal(bookingPollDelay(0, "30"), 10000);
});
test("server retry delay is respected but bounded and malformed headers are ignored", () => {
  assert.equal(bookingPollDelay(1, "30"), 30000);
  assert.equal(bookingPollDelay(1, "999999999"), 300000);
  for (const value of [null, "bad", "-10", "Infinity"]) assert.equal(bookingPollDelay(1, value), 20000);
});
