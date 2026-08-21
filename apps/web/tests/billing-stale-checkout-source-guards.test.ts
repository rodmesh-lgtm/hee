import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("abandoned checkout recovery only cancels provider-less created intents", () => {
  const ledger = source("app/lib/billing-ledger.ts");
  assert.match(ledger, /ABANDONED_CHECKOUT_MS/);
  assert.match(ledger, /"status"='created'/);
  assert.match(ledger, /"providerPaymentId" IS NULL/);
  assert.match(ledger, /"createdAt" <= \$\{abandonedBefore\}/);
  assert.match(ledger, /"status"='canceled'/);
  assert.match(ledger, /initiated\/authorized[\s\S]*canonical provider reconciliation/);
});
