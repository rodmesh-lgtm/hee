import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const worker = readFileSync(new URL("../app/lib/moyasar-webhook-processing.ts", import.meta.url), "utf8");
const audit = readFileSync(new URL("../scripts/billing-state-audit.ts", import.meta.url), "utf8");

test("settled orphan provider payments remain in the durable retry inbox", () => {
  assert.match(worker, /if \(\["paid", "captured", "authorized"\]\.includes\(payment\.status\)\) \{/);
  assert.match(worker, /settled_orphan_payment/);
  assert.match(worker, /await releaseForRetry\(event, "settled_orphan_payment"\)/);
  assert.doesNotMatch(worker, /completeEvent\(event\.id, null, "settled_orphan_payment"\)/);
});

test("an orphan that never gains a ledger row becomes an audit-visible exhausted webhook", () => {
  assert.match(audit, /Moyasar webhook exhausted durable retry budget/);
  assert.match(audit, /bwe\."attempts" >= 12/);
  assert.match(audit, /bwe\."processedAt" IS NULL/);
});
