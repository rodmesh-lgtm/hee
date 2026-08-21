import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("all entitlement-changing billing paths share one business-wide advisory lock", () => {
  const ledger = source("app/lib/billing-ledger.ts");
  const worker = source("scripts/billing-renewal-worker.ts");
  const actions = source("app/actions/billing.ts");

  assert.match(ledger, /billing-business:\$\{businessId\}/);
  assert.match(worker, /billing-business:\$\{businessId\}/);
  assert.match(actions, /billing-business:\$\{business\.id\}/);
  assert.doesNotMatch(ledger, /billing-payment:\$\{billingId\}/);
  assert.doesNotMatch(ledger, /billing-refund:\$\{billingId\}/);
});
