import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("identity-bound checkout amount mismatch cannot leave settled customer money without entitlement", () => {
  const callback = source("app/api/billing/moyasar/callback/route.ts");

  assert.match(callback, /metadataBilling !== billing\.id \|\| metadataBusiness !== billing\.businessId/);
  assert.match(callback, /payment\.amount !== billing\.amount \|\| payment\.currency !== "SAR"/);
  assert.match(callback, /identity_bound_payment_amount_mismatch/);
  assert.match(callback, /\["paid", "captured", "authorized"\]\.includes\(payment\.status\)/);
  assert.match(callback, /reverseMoyasarPayment\(payment\.id\)/);
  assert.match(callback, /return back\("payment-reversed"\)/);
});
