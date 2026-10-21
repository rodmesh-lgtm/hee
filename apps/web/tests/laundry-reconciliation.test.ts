import test from "node:test";
import assert from "node:assert/strict";
import { laundryBankBalance, laundryReconciliation } from "../app/lib/laundry-reconciliation-domain";
test("bank reconciliation adjusts both deposits in transit and outstanding withdrawals", () => {
  const lines = [{ id: "deposit", debit: 10000, credit: 0 }, { id: "withdrawal", debit: 0, credit: 3000 }, { id: "cleared", debit: 5000, credit: 0 }];
  assert.deepEqual(laundryReconciliation({ bookBalance: 12000, statementBalance: 5000, lines, outstandingIds: ["deposit", "withdrawal"] }), { outstanding: 7000, adjustedStatement: 12000, difference: 0, matchedIds: ["cleared"] });
  assert.equal(laundryReconciliation({ bookBalance: 12000, statementBalance: 4999, lines, outstandingIds: ["deposit", "withdrawal"] }).difference, 1);
});
test("bank reconciliation refuses unknown, duplicate, fractional and unsafe inputs", () => {
  const good = { bookBalance: 100, statementBalance: 0, lines: [{ id: "one", debit: 100, credit: 0 }], outstandingIds: ["one"] };
  for (const input of [{ ...good, outstandingIds: ["foreign"] }, { ...good, outstandingIds: ["one", "one"] }, { ...good, lines: [...good.lines, ...good.lines] }, { ...good, bookBalance: 1.1 }, { ...good, statementBalance: Number.MAX_SAFE_INTEGER + 1 }]) assert.throws(() => laundryReconciliation(input));
});
test("bank balances support overdrafts and aggregate balances without floating point rounding", () => {
  assert.equal(laundryBankBalance("-100.01"), -10001);
  assert.equal(laundryBankBalance("250000.15"), 25000015);
  assert.equal(laundryBankBalance("0.1"), 10);
  for (const value of ["", "1e3", "1.001", "NaN", "10000000000", "--1", "1,000"]) assert.throws(() => laundryBankBalance(value));
});
