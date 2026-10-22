import assert from "node:assert/strict";
import test from "node:test";
import { planSplitPayment, splitPaymentBalance } from "../app/lib/accounting/split-payment";
import { reconcileTerminal, type TerminalAttempt } from "../app/lib/accounting/terminal-payment";
const attempt: TerminalAttempt = { businessId: "a", orderId: "o", requestId: "r", terminalId: "t", currency: "SAR", amountMinor: 7000, state: "pending" };
const snapshot = { businessId: "a", orderId: "o", totalMinor: 10000, alreadyPaidMinor: 3000 };

test("100 SAR order splits into 30 cash and exactly 70 on the terminal", () => {
  assert.deepEqual(planSplitPayment({ totalMinor: 10000, alreadyPaidMinor: 0, cashReceivedMinor: 3000, terminalMinor: 7000 }), { cashMinor: 3000, terminalMinor: 7000, outstandingAfterCashMinor: 7000, remainingAfterApprovalMinor: 0 });
  const pending = splitPaymentBalance({ ...snapshot, attempt });
  assert.equal(pending.paidMinor, 3000);
  assert.equal(pending.reservedMinor, 7000);
  assert.equal(pending.availableToCollectMinor, 0);
  assert.equal(pending.status, "partially_paid");
});

test("confirmed device cancellation releases only the card allocation and retains cash", () => {
  const cancelled = reconcileTerminal(attempt, { ...attempt, state: "cancelled" });
  const balance = splitPaymentBalance({ ...snapshot, attempt: cancelled });
  assert.equal(balance.paidMinor, 3000);
  assert.equal(balance.terminalPaidMinor, 0);
  assert.equal(balance.remainingMinor, 7000);
  assert.equal(balance.availableToCollectMinor, 7000);
  assert.equal(balance.canStartReplacement, true);
  assert.deepEqual(splitPaymentBalance({ ...snapshot, attempt: reconcileTerminal(cancelled, { ...cancelled, state: "cancelled" }) }), balance);
});

test("unknown is never cancellation; a late approval settles the reserved amount", () => {
  const unknown = reconcileTerminal(attempt, { ...attempt, state: "unknown" });
  const unresolved = splitPaymentBalance({ ...snapshot, attempt: unknown });
  assert.equal(unresolved.availableToCollectMinor, 0);
  assert.equal(unresolved.canStartReplacement, false);
  assert.equal(unresolved.needsStatusCheck, true);
  const approved = reconcileTerminal(unknown, { ...unknown, state: "approved", providerReference: "p" });
  const balance = splitPaymentBalance({ ...snapshot, attempt: approved });
  assert.equal(balance.status, "paid");
  assert.equal(balance.paidMinor, 10000);
  assert.equal(balance.remainingMinor, 0);
  assert.deepEqual(splitPaymentBalance({ ...snapshot, attempt: approved }), balance);
  assert.throws(() => reconcileTerminal(approved, { ...approved, state: "cancelled" }));
});

test("supports prior payments, partial collection and halala precision", () => {
  assert.equal(planSplitPayment({ totalMinor: 10001, alreadyPaidMinor: 2000, cashReceivedMinor: 3000, terminalMinor: 4001 }).remainingAfterApprovalMinor, 1000);
  assert.equal(planSplitPayment({ totalMinor: 10001, alreadyPaidMinor: 0, cashReceivedMinor: 10001, terminalMinor: 0 }).remainingAfterApprovalMinor, 0);
});

test("rejects overpayment, bad amounts and cross-tenant/order snapshots", () => {
  const plan = { totalMinor: 10000, alreadyPaidMinor: 0, cashReceivedMinor: 3000, terminalMinor: 7000 };
  for (const terminalMinor of [-1, 7001, 1.1, Infinity, NaN]) assert.throws(() => planSplitPayment({ ...plan, terminalMinor }));
  assert.throws(() => planSplitPayment({ ...plan, cashReceivedMinor: 0, terminalMinor: 0 }));
  assert.throws(() => splitPaymentBalance({ ...snapshot, businessId: "other", attempt }));
  assert.throws(() => splitPaymentBalance({ ...snapshot, orderId: "other", attempt }));
  assert.throws(() => splitPaymentBalance({ ...snapshot, alreadyPaidMinor: 4000, attempt }));
});
