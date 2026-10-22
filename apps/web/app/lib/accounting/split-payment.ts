import { terminalRequest, type TerminalAttempt } from "./terminal-payment";

function amount(value: number) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Invalid amount in halalas");
  return value;
}

/** Pure planning only. The caller must lock the order, persist each allocation and
 * reserve the terminal amount atomically before dispatch. Cash means received cash,
 * not an intention to pay. This function does not post a payment or ledger entry.
 */
export function planSplitPayment(input: { totalMinor: number; alreadyPaidMinor: number; cashReceivedMinor: number; terminalMinor: number }) {
  const total = amount(input.totalMinor), paid = amount(input.alreadyPaidMinor);
  const cash = amount(input.cashReceivedMinor), terminal = amount(input.terminalMinor);
  if (paid > total || cash > total - paid || terminal > total - paid - cash) throw new Error("Payment exceeds outstanding balance");
  if (cash === 0 && terminal === 0) throw new Error("No payment selected");
  return { cashMinor: cash, terminalMinor: terminal, outstandingAfterCashMinor: total - paid - cash, remainingAfterApprovalMinor: total - paid - cash - terminal };
}

/** Recompute UI totals from an authenticated attempt and persisted payment snapshot.
 * alreadyPaidMinor EXCLUDES this attempt; it includes previously posted cash/other
 * allocations. Do not add this derived card amount to a ledger: posting must be
 * atomic and unique by attempt/provider reference in the persistence layer.
 */
export function splitPaymentBalance(input: { businessId: string; orderId: string; totalMinor: number; alreadyPaidMinor: number; attempt: TerminalAttempt }) {
  const total = amount(input.totalMinor), paid = amount(input.alreadyPaidMinor);
  if (paid > total) throw new Error("Paid amount exceeds order total");
  const attempt = input.attempt;
  if (attempt.businessId !== input.businessId || attempt.orderId !== input.orderId) throw new Error("Payment belongs to another order or tenant");
  terminalRequest(attempt, total - paid);
  if (!["created", "pending", "unknown", "approved", "declined", "cancelled"].includes(attempt.state)) throw new Error("Invalid terminal status");
  if (attempt.state === "approved" && !attempt.providerReference?.trim()) throw new Error("Missing approved payment reference");
  const terminalPaidMinor = attempt.state === "approved" ? attempt.amountMinor : 0;
  const reservedMinor = ["created", "pending", "unknown"].includes(attempt.state) ? attempt.amountMinor : 0;
  const remainingMinor = total - paid - terminalPaidMinor;
  return {
    paidMinor: paid + terminalPaidMinor, terminalPaidMinor, remainingMinor, reservedMinor,
    availableToCollectMinor: remainingMinor - reservedMinor,
    needsStatusCheck: attempt.state === "unknown",
    canStartReplacement: attempt.state === "cancelled" || attempt.state === "declined",
    status: remainingMinor === 0 ? "paid" as const : paid + terminalPaidMinor > 0 ? "partially_paid" as const : "unpaid" as const,
  };
}
