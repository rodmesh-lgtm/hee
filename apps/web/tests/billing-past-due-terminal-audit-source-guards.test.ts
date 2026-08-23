import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/billing-state-audit.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../scripts/billing-renewal-worker.ts", import.meta.url), "utf8");

test("expired past_due remains valid only while renewal recovery is still actionable", () => {
  assert.match(worker, /const MAX_ATTEMPTS = 3/);
  assert.match(worker, /if \(latest\.attempt >= MAX_ATTEMPTS\) \{\s*await expireAfterFailedRenewal\(sub\)/);
  assert.match(worker, /bp\."status" IN \('initiated','authorized'\)/);

  assert.match(audit, /const MAX_RENEWAL_ATTEMPTS = 3/);
  assert.match(audit, /expired past_due subscription has no recoverable renewal attempt/);
  assert.match(audit, /bp\."status" IN \('created','initiated','authorized'\)/);
  assert.match(audit, /bp\."status"='failed' AND bp\."attempt" < \$\{MAX_RENEWAL_ATTEMPTS\} AND bp\."nextRetryAt" IS NOT NULL/);
  assert.match(audit, /bp\."attempt" BETWEEN 1 AND \$\{MAX_RENEWAL_ATTEMPTS\}/);
});

test("terminal failed renewal cannot masquerade as a healthy past_due collection state", () => {
  assert.doesNotMatch(audit, /bp\."status"='failed'\s*\)/);
  assert.match(worker, /const nextRetryAt = attempt < MAX_ATTEMPTS \? new Date\(Date\.now\(\) \+ FAILURE_RETRY_MS\) : null/);
});
