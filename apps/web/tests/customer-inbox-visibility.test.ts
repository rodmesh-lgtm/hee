import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../app/dashboard/inbox/page.tsx"), "utf8");

test("customer inbox never hides actionable orders behind history limit", () => {
  assert.match(source, /activeOrderStatuses=\["pending","confirmed","processing"\]/);
  assert.match(source, /status:\{in:\[\.\.\.activeOrderStatuses\]\}/);
  assert.match(source, /status:\{notIn:\[\.\.\.activeOrderStatuses\]\}/);
  assert.match(source, /take:HISTORY_LIMIT/);
});

test("customer inbox never hides actionable bookings behind history limit", () => {
  assert.match(source, /activeBookingStatuses=\["pending","confirmed"\]/);
  assert.match(source, /status:\{in:\[\.\.\.activeBookingStatuses\]\}/);
  assert.match(source, /status:\{notIn:\[\.\.\.activeBookingStatuses\]\}/);
  assert.match(source, /bookingDate:"asc"/);
});

test("completed history is bounded while actionable records are unbounded", () => {
  assert.match(source, /HISTORY_LIMIT=50/);
  const activeQueries = source.match(/findMany\(\{where:\{businessId:business\.id,status:\{in:/g) ?? [];
  const historyQueries = source.match(/findMany\(\{where:\{businessId:business\.id,status:\{notIn:/g) ?? [];
  assert.equal(activeQueries.length, 2);
  assert.equal(historyQueries.length, 2);
});
