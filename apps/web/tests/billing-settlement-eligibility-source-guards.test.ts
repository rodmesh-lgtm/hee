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

test("checkout rendering and consent both re-prove current eligibility before a provider form can open", () => {
  const page = source("app/dashboard/billing/checkout/page.tsx");
  const consent = source("app/lib/billing-consent.ts");

  assert.match(page, /if \(!user\.emailVerifiedAt\) redirect/);
  assert.match(page, /id: billing\.businessId, ownerId: user\.id, deletedAt: null/);
  assert.match(page, /id: billing\.planId, isActive: true/);

  assert.match(consent, /JOIN "User" u ON u\."id" = b\."ownerId"/);
  assert.match(consent, /u\."emailVerifiedAt" IS NOT NULL/);
  assert.match(consent, /p\."isActive" = true/);
  assert.match(consent, /FOR UPDATE OF bp, b, u, p/);
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

  assert.match(worker, /JOIN "User" u ON u\."id"=b\."ownerId" AND u\."deletedAt" IS NULL AND u\."emailVerifiedAt" IS NOT NULL/);
  assert.match(worker, /FOR UPDATE OF s, b, u, p/);
  assert.match(worker, /FOR KEY SHARE OF b, u, p/);
  assert.match(worker, /reverseUnactivatableRenewal/);
  assert.match(worker, /reverseMoyasarPayment\(payment\.id\)/);
  assert.match(worker, /\["ineligible-target", "stale", "terminal-state", "unclaimed"\]/);
  assert.doesNotMatch(worker, /result !== "activated" && result !== "already-paid" && result !== "stale"/);
});

test("expired subscriptions cannot remain live merely because renewal became ineligible or cancellation happened after past-due", () => {
  const worker = source("scripts/billing-renewal-worker.ts");

  assert.match(worker, /async function expireIneligibleDueRenewals/);
  assert.match(worker, /b\."deletedAt" IS NOT NULL/);
  assert.match(worker, /u\."emailVerifiedAt" IS NULL/);
  assert.match(worker, /pm\."id" IS NULL/);
  assert.match(worker, /pm\."status" <> 'active'/);
  assert.match(worker, /SET "status" = 'canceled', "autoRenew" = false/);
  assert.match(worker, /UPDATE "BillingPaymentMethod"[\s\S]*SET "status" = 'revoked'/);

  const nonRenewingStart = worker.indexOf("async function expireEndedNonRenewingSubscriptions");
  const nonRenewingEnd = worker.indexOf("async function expireIneligibleDueRenewals", nonRenewingStart);
  const nonRenewing = worker.slice(nonRenewingStart, nonRenewingEnd);
  assert.match(nonRenewing, /"status" IN \('active','past_due'\)/);
  assert.doesNotMatch(nonRenewing, /b\."deletedAt" IS NULL/);

  assert.match(worker, /payment\.status === "voided" \|\| payment\.status === "refunded"/);
  assert.match(worker, /setAttemptState\(billing\.id, payment\.status, payment\.id, null\)/);
});

test("in-flight renewals stay reconcilable after eligibility changes without permitting a new charge", () => {
  const worker = source("scripts/billing-renewal-worker.ts");

  const expireStart = worker.indexOf("async function expireIneligibleDueRenewals");
  const dueStart = worker.indexOf("async function dueSubscriptions", expireStart);
  const expire = worker.slice(expireStart, dueStart);
  assert.match(expire, /NOT EXISTS \([\s\S]*bp\."status" IN \('initiated','authorized'\)/);
  assert.match(expire, /AS "inFlight"/);
  assert.match(expire, /if \(!current \|\| current\.inFlight\) return/);
  assert.match(expire, /AND "status" IN \('created','failed'\)/);

  const dueEnd = worker.indexOf("async function latestAttempt", dueStart);
  const due = worker.slice(dueStart, dueEnd);
  assert.match(due, /FROM "Subscription" s/);
  assert.match(due, /s\."autoRenew" = true/);
  assert.match(due, /s\."provider" = 'moyasar'/);
  assert.doesNotMatch(due, /JOIN "User"/);
  assert.doesNotMatch(due, /JOIN "BillingPaymentMethod"/);

  const createStart = worker.indexOf("async function createAttempt");
  const claimStart = worker.indexOf("async function claimAttemptForProviderSubmission", createStart);
  const createAttempt = worker.slice(createStart, claimStart);
  assert.match(createAttempt, /SELECT s\."id", p\."monthlyPrice"/);
  assert.match(createAttempt, /const amount = eligible\[0\]\.monthlyPrice \* 100/);

  const claimEnd = worker.indexOf("async function setAttemptState", claimStart);
  const claim = worker.slice(claimStart, claimEnd);
  assert.match(claim, /SELECT s\."id", pm\."encryptedToken"/);
  assert.match(claim, /FOR UPDATE OF s, b, u, p, pm/);
  assert.match(claim, /return claimed\[0\] \? eligible\[0\]\.encryptedToken : null/);

  assert.match(worker, /const encryptedToken = await claimAttemptForProviderSubmission\(sub, billing\)/);
  assert.match(worker, /token: decryptProviderToken\(encryptedToken\)/);
  assert.match(worker, /const preClosed = await expireIneligibleDueRenewals\(\)/);
  assert.match(worker, /const postClosed = await expireIneligibleDueRenewals\(\)/);
});
