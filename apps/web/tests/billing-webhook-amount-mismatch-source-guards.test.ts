import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("identity-bound webhook amount or currency mismatches are reversed when funds can be held", () => {
  const worker = source("app/lib/moyasar-webhook-processing.ts");

  assert.match(worker, /function paymentIdentityMatchesBilling/);
  assert.match(worker, /function paymentValueMatchesBilling/);
  assert.match(worker, /payment_amount_currency_mismatch/);
  assert.match(worker, /\["paid", "captured", "authorized"\]\.includes\(payment\.status\)/);
  assert.match(worker, /await reverseAndRecord\(billing, payment\)/);
  assert.match(worker, /payment_amount_currency_mismatch_reversed/);
});

test("identity mismatches stay non-mutating and settled funds remain recoverable", () => {
  const worker = source("app/lib/moyasar-webhook-processing.ts");
  const identityGuard = worker.indexOf("if (!paymentIdentityMatchesBilling(billing, payment))", worker.indexOf("processMoyasarWebhookEvent"));
  const valueGuard = worker.indexOf("if (!paymentValueMatchesBilling(billing, payment))", identityGuard);
  const identityBlock = worker.slice(identityGuard, valueGuard);
  const reversal = worker.indexOf("await reverseAndRecord(billing, payment)", valueGuard);

  assert.notEqual(identityGuard, -1);
  assert.notEqual(valueGuard, -1);
  assert.ok(identityGuard < valueGuard);
  assert.match(identityBlock, /\["paid", "captured", "authorized"\]\.includes\(payment\.status\)/);
  assert.match(identityBlock, /await releaseForRetry\(event, "payment_identity_mismatch"\)/);
  assert.match(identityBlock, /return "retry" as const/);
  assert.doesNotMatch(identityBlock, /reverseAndRecord/);
  assert.ok(reversal > valueGuard);
});