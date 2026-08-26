import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/billing-state-audit.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../scripts/billing-renewal-worker.ts", import.meta.url), "utf8");

test("billing state audit allows an expired past_due row while collection retries are in progress", () => {
  assert.match(worker, /SET "status" = 'past_due'/);
  assert.match(worker, /"endsAt" <= CURRENT_TIMESTAMP/);
  assert.match(audit, /s\."status"='active' AND \(s\."endsAt" IS NULL OR s\."endsAt" <= CURRENT_TIMESTAMP\)/);
  assert.match(audit, /s\."status"='past_due' AND s\."endsAt" IS NULL/);
  assert.doesNotMatch(audit, /s\."status" IN \('active','past_due'\) AND \(s\."endsAt" IS NULL OR s\."endsAt" <= CURRENT_TIMESTAMP\)/);
});

test("paid entitlement leakage is still rejected while a past_due subscription is expired", () => {
  assert.match(audit, /paid business plan without matching unexpired live subscription/);
  assert.match(audit, /s\."status" IN \('active','past_due'\)\s+AND s\."endsAt" > CURRENT_TIMESTAMP/);
});
