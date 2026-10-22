/** Provider-neutral ECR domain contract. No provider is enabled by this module.
 * Call only on the server after authorization and a durable, tenant-scoped claim.
 * Adapters must authenticate the provider response before calling reconcileTerminal.
 */
export type TerminalState = "created" | "pending" | "unknown" | "approved" | "declined" | "cancelled";
export type TerminalRequest = Readonly<{
  businessId: string; terminalId: string; orderId: string; requestId: string;
  amountMinor: number; currency: "SAR";
}>;
export type TerminalResult = TerminalRequest & {
  state: Exclude<TerminalState, "created">;
  providerReference?: string;
};
export type TerminalAttempt = TerminalRequest & { state: TerminalState; providerReference?: string };
export interface TerminalAdapter {
  /** Must map requestId to the provider's idempotency/ECR reference. Never auto retry a purchase. */
  purchase(request: TerminalRequest): Promise<TerminalResult>;
  /** Query the SAME transaction after timeout; do not initiate another purchase. */
  status(request: TerminalRequest): Promise<TerminalResult>;
}

export function terminalRequest(input: TerminalRequest, outstandingMinor: number): TerminalRequest {
  if ([input.businessId, input.terminalId, input.orderId, input.requestId].some(x => typeof x !== "string" || !x.trim() || x.length > 200)) throw new Error("Invalid terminal scope");
  if (input.currency !== "SAR" || !Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || !Number.isSafeInteger(outstandingMinor) || input.amountMinor > outstandingMinor) throw new Error("Invalid terminal amount");
  // Whitelist only identifiers and amount; customer/card data never crosses this boundary.
  return { businessId: input.businessId, terminalId: input.terminalId, orderId: input.orderId, requestId: input.requestId, amountMinor: input.amountMinor, currency: "SAR" };
}

export function reconcileTerminal(attempt: TerminalAttempt, result: TerminalResult): TerminalAttempt {
  for (const key of ["businessId", "terminalId", "orderId", "requestId", "amountMinor", "currency"] as const) {
    if (attempt[key] !== result[key]) throw new Error("Terminal response does not match the payment");
  }
  if (!["pending", "unknown", "approved", "declined", "cancelled"].includes(result.state)) throw new Error("Invalid terminal status");
  if (result.state === "approved" && (typeof result.providerReference !== "string" || !result.providerReference.trim() || result.providerReference.length > 200)) throw new Error("Missing provider reference");
  if (["approved", "declined", "cancelled"].includes(attempt.state)) {
    if (attempt.state !== result.state || attempt.providerReference !== result.providerReference) throw new Error("Conflicting final terminal result requires reconciliation");
    return attempt;
  }
  return { ...terminalRequest(attempt, attempt.amountMinor), state: result.state, ...(result.providerReference ? { providerReference: result.providerReference } : {}) };
}

/** Transport failure is ambiguous: the terminal may already have charged the card. */
export async function dispatchTerminal(attempt: TerminalAttempt, adapter: TerminalAdapter): Promise<TerminalAttempt> {
  if (attempt.state !== "created") throw new Error("Purchase already dispatched; query its status");
  const request = terminalRequest(attempt, attempt.amountMinor);
  let result: TerminalResult;
  try { result = await adapter.purchase(request); }
  catch { return { ...request, state: "unknown" }; }
  return reconcileTerminal(attempt, result);
}
