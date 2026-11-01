import assert from "node:assert/strict";
import test from "node:test";
import { summarizeRetailEvents, type RetailEvent } from "../app/lib/retail-analytics/ledger";

const scope = { businessId: "a", accountIds: ["shop1", "shop2"], from: "2026-10-01T00:00:00Z", until: "2026-11-01T00:00:00Z" };
const sale: RetailEvent = { businessId: "a", accountId: "shop1", provider: "shopify", eventId: "sale1", occurredAt: "2026-10-20T00:00:00Z", currency: "SAR", kind: "sale", grossMinor: 10000, discountMinor: 1000, taxMinor: 1350, costMinor: 4000 };

test("refunds reverse net sales, tax and actual cost; retries do not duplicate revenue", () => {
  const refund: RetailEvent = { ...sale, eventId: "refund1", kind: "refund", grossMinor: 5000, discountMinor: 500, taxMinor: 675, costMinor: 2000 };
  const [total] = summarizeRetailEvents([sale, sale, refund], scope);
  assert.equal(total.netSalesMinor, 4500);
  assert.equal(total.netTaxMinor, 675);
  assert.equal(total.grossProfitMinor, 2500);
  assert.equal(total.eventCount, 2);
});
test("tenant and account boundaries fail closed", () => {
  assert.throws(() => summarizeRetailEvents([{ ...sale, businessId: "b" }], scope), /SCOPE_MISMATCH/);
  assert.throws(() => summarizeRetailEvents([{ ...sale, accountId: "other" }], scope), /SCOPE_MISMATCH/);
});
test("same provider ID in different accounts remains distinct and currencies never mix", () => {
  const totals = summarizeRetailEvents([sale, { ...sale, accountId: "shop2", currency: "USD" }], scope);
  assert.deepEqual(totals.map(t => [t.currency, t.netSalesMinor]), [["SAR", 9000], ["USD", 9000]]);
});
test("missing cost suppresses profit and conflicting event retries are rejected", () => {
  assert.equal(summarizeRetailEvents([{ ...sale, costMinor: null }], scope)[0].grossProfitMinor, null);
  assert.throws(() => summarizeRetailEvents([sale, { ...sale, grossMinor: 11000 }], scope), /CONFLICTING/);
});
test("period is half-open, invalid amounts and overflow are rejected", () => {
  assert.deepEqual(summarizeRetailEvents([{ ...sale, occurredAt: scope.until }], scope), []);
  assert.throws(() => summarizeRetailEvents([{ ...sale, grossMinor: 1.5 }], scope), /INVALID/);
  assert.throws(() => summarizeRetailEvents([{ ...sale, grossMinor: Number.MAX_SAFE_INTEGER, discountMinor: 0 }, { ...sale, eventId: "next" }], scope), /OVERFLOW/);
});
