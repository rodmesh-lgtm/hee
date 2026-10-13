import assert from "node:assert/strict";
import test from "node:test";
import { createBookingAlertTracker } from "../app/lib/booking-alert-tracker";
const signal = (id: string, second = 10) => ({ id, createdAt: `2026-10-13T10:00:${String(second).padStart(2, "0")}.000Z` });
test("booking bell establishes silent baseline then signals new IDs only", () => {
  const track = createBookingAlertTracker();
  assert.equal(track([signal("a")]), 0);
  assert.equal(track([signal("b", 11), signal("a")]), 1);
  assert.equal(track([signal("b", 11), signal("a")]), 0);
  assert.equal(track([signal("d", 11), signal("c", 11), signal("b", 11)]), 2);
  assert.equal(track([signal("old", 1)]), 0);
});
test("empty businesses alert on their first booking and separate trackers never share tenants", () => {
  const a = createBookingAlertTracker(), b = createBookingAlertTracker();
  assert.equal(a([]), 0);
  assert.equal(a([signal("first")]), 1);
  assert.equal(b([signal("first")]), 0);
});
