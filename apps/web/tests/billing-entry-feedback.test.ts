import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { billingEntryFeedback } from "../app/lib/billing-entry-feedback";

test("every billing entry redirect has visible and specific feedback", () => {
  const sources = ["app/actions/billing.ts", "app/dashboard/billing/checkout/page.tsx"];
  const outcomes = new Set(sources.flatMap(path => [...readFileSync(path, "utf8").matchAll(/\/dashboard\/branding\?billing=([a-z-]+)/g)].map(match => match[1])));
  assert.ok(outcomes.size >= 8);
  for (const code of outcomes) {
    const message = billingEntryFeedback(code);
    assert.ok(message && message !== billingEntryFeedback("unknown"), `missing explicit feedback: ${code}`);
  }
  assert.equal(billingEntryFeedback(undefined), null);
  assert.equal(billingEntryFeedback(["pending"]), null);
  assert.equal(billingEntryFeedback("__proto__"), billingEntryFeedback("unknown"));
  assert.match(billingEntryFeedback("pending")!, /لا تعِد الدفع/);
  assert.match(billingEntryFeedback("failed")!, /لا تعِد الدفع/);
  assert.match(readFileSync("app/dashboard/branding/page.tsx", "utf8"), /billingEntryFeedback\(Array\.isArray\(params\?\.billing\)/);
});

test("payment script reinitializes after route remount while retaining consent gate", () => {
  const source = readFileSync("components/billing/moyasar-checkout.tsx", "utf8");
  assert.match(source, /onReady=\{\(\) => setScriptReady\(true\)\}/);
  assert.match(source, /if \(!accepted \|\| !scriptReady \|\| initialized\.current/);
  assert.doesNotMatch(source, /onLoad=/);
});
