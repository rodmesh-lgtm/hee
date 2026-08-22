import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("settled checkout activation re-proves a live verified owner and active plan under row locks", () => {
  const ledger = source("app/lib/billing-ledger.ts");

  assert.match(ledger, /JOIN "User" u ON u\."id" = b\."ownerId"/);
  assert.match(ledger, /u\."deletedAt" IS NULL/);
  assert.match(ledger, /u\."emailVerifiedAt" IS NOT NULL/);
  assert.match(ledger, /p\."isActive" = true/);
  assert.match(ledger, /FOR KEY SHARE OF b, u, p/);
  assert.match(ledger, /return "ineligible-target" as const/);

  // Historical billing ownership remains reconcilable even if the business is soft-deleted;
  // the activation transaction itself is what decides whether entitlement is still allowed.
  const ownedStart = ledger.indexOf("export async function getOwnedBillingPayment");
  const ownedEnd = ledger.indexOf("export async function findBillingPaymentByProviderId", ownedStart);
  const ownedQuery = ledger.slice(ownedStart, ownedEnd);
  assert.match(ownedQuery, /b\."ownerId"=\$\{userId\}/);
  assert.doesNotMatch(ownedQuery, /b\."deletedAt" IS NULL/);
});

test("all customer and durable reconciliation paths reverse verified settled money when activation cannot complete", () => {
  const callback = source("app/api/billing/moyasar/callback/route.ts");
  const created = source("app/api/billing/moyasar/created/route.ts");
  const webhook = source("app/lib/moyasar-webhook-processing.ts");

  for (const value of [callback, created, webhook]) {
    assert.match(value, /result !== "activated" && result !== "already-paid"/);
    assert.match(value, /reverseMoyasarPayment\(payment\.id\)/);
    assert.match(value, /markBillingPaymentState\(billing\.id, reversed\)/);
  }
  assert.match(created, /PAYMENT_REVERSED/);
  assert.match(webhook, /activation_\$\{result\}_reversed/);
});

test("renewal charging and settlement both re-prove account eligibility and reverse terminal paid races", () => {
  const worker = source("scripts/billing-renewal-worker.ts");

  assert.match(worker, /JOIN "User" u ON u\."id" = b\."ownerId" AND u\."deletedAt" IS NULL AND u\."emailVerifiedAt" IS NOT NULL/);
  assert.match(worker, /FOR UPDATE OF s, b, u, p/);
  assert.match(worker, /FOR KEY SHARE OF b, u, p/);
  assert.match(worker, /reverseUnactivatableRenewal/);
  assert.match(worker, /reverseMoyasarPayment\(payment\.id\)/);
  assert.match(worker, /\["ineligible-target", "stale", "terminal-state", "unclaimed"\]/);
  assert.doesNotMatch(worker, /result !== "activated" && result !== "already-paid" && result !== "stale"/);
});
