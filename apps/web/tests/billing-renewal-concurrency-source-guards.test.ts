import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("renewals do not charge early and serialize customer cancellation with state changes", () => {
  const worker = source("scripts/billing-renewal-worker.ts");
  const actions = source("app/actions/billing.ts");

  assert.match(worker, /const DUE_WINDOW_MS = 0/);
  assert.match(worker, /billing-business:\$\{businessId\}/);
  assert.match(actions, /billing-business:\$\{business\.id\}/);
  assert.match(worker, /s\."autoRenew"=true/);
  assert.match(worker, /pm\."status"='active'/);
  assert.match(worker, /Preserve the original paid-through timestamp/);
  assert.doesNotMatch(worker, /SET "status" = 'replaced', "endsAt" = \$\{now\}/);
  assert.match(worker, /"status" IN \('created','initiated','authorized','failed'\)/);
});
