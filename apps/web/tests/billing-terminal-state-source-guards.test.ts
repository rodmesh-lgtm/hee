import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("terminal billing states cannot be resurrected by late provider events", () => {
  const ledger = source("app/lib/billing-ledger.ts");
  assert.match(ledger, /\["refunded",\s*"voided",\s*"canceled"\]\.includes\(billing\.status\)/);
  assert.match(ledger, /return "terminal-state" as const/);
  assert.match(ledger, /"status" IN \('created','initiated','authorized','failed'\)/);
});
