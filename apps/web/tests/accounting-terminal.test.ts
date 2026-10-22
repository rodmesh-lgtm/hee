import assert from "node:assert/strict";
import test from "node:test";
import { dispatchTerminal, reconcileTerminal, terminalRequest, type TerminalAttempt, type TerminalAdapter } from "../app/lib/accounting/terminal-payment";
const attempt: TerminalAttempt = { businessId: "tenant-a", terminalId: "terminal-a", orderId: "order-a", requestId: "request-a", amountMinor: 1250, currency: "SAR", state: "created" };
test("terminal amounts use integer halalas and cannot exceed the balance", () => {
  assert.equal(terminalRequest(attempt, 1250).amountMinor, 1250);
  for (const amountMinor of [0, -1, 12.5, NaN, Infinity, 1251]) assert.throws(() => terminalRequest({ ...attempt, amountMinor }, 1250));
  assert.throws(() => terminalRequest({ ...attempt, terminalId: "" }, 1250));
});
test("response must match tenant, terminal, order, request, amount and currency", () => {
  const result = { ...attempt, state: "approved" as const, providerReference: "provider-1" };
  for (const key of ["businessId", "terminalId", "orderId", "requestId"] as const) assert.throws(() => reconcileTerminal(attempt, { ...result, [key]: "other" }));
  assert.throws(() => reconcileTerminal(attempt, { ...result, amountMinor: 1 }));
  assert.throws(() => reconcileTerminal(attempt, { ...result, providerReference: undefined }));
  const approved = reconcileTerminal(attempt, result);
  assert.equal(reconcileTerminal(approved, result), approved);
  assert.throws(() => reconcileTerminal(approved, { ...result, state: "declined" }));
  assert.throws(() => reconcileTerminal(approved, { ...result, providerReference: "other" }));
});
test("timeouts stay unknown and must never automatically resubmit a charge", async () => {
  let calls = 0;
  const adapter: TerminalAdapter = { purchase: async () => { calls++; throw new Error("Timeout"); }, status: async request => ({ ...request, state: "approved", providerReference: "provider-1" }) };
  const unknown = await dispatchTerminal(attempt, adapter);
  assert.equal(unknown.state, "unknown");
  await assert.rejects(dispatchTerminal(unknown, adapter));
  assert.equal(calls, 1);
  assert.equal(reconcileTerminal(unknown, await adapter.status(unknown)).state, "approved");
});
test("successful dispatch sends exact amount and excludes additional fields", async () => {
  const adapter: TerminalAdapter = { purchase: async request => { assert.equal(request.amountMinor, 1250); assert.equal("state" in request, false); return { ...request, state: "pending" }; }, status: async request => ({ ...request, state: "pending" }) };
  assert.equal((await dispatchTerminal(attempt, adapter)).state, "pending");
});
