import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Moyasar financial state distinguishes full refunds from partial refunds before ledger mutation", () => {
  const core = source("app/lib/moyasar-core.ts");

  assert.match(core, /refunded\?: number/);
  assert.match(core, /captured\?: number/);
  assert.match(core, /payment\.refunded > payment\.amount/);
  assert.match(core, /payment\.captured > payment\.amount/);
  assert.match(core, /payment\.status === "refunded"/);
  assert.match(core, /payment\.refunded === undefined/);
  assert.match(core, /payment\.refunded !== payment\.amount/);
  assert.match(core, /MOYASAR_PARTIAL_REFUND_REQUIRES_OPERATOR/);
});

test("all server-side payment reads, token charges and HEE reversals validate refund amount semantics", () => {
  const core = source("app/lib/moyasar-core.ts");

  assert.match(core, /fetchMoyasarPayment[\s\S]*validateMoyasarPaymentFinancialState\(payment\)/);
  assert.match(core, /createMoyasarTokenPayment[\s\S]*validateMoyasarPaymentFinancialState\(payment\)/);
  assert.match(core, /\/void[\s\S]*validateMoyasarPaymentFinancialState\(reversed\)/);
  assert.match(core, /\/refund[\s\S]*validateMoyasarPaymentFinancialState\(refunded\)/);
});
