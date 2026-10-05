import assert from "node:assert/strict";
import test from "node:test";
import { preservedOperationalFlags } from "./preserve-operational-flags.mjs";
const key = "WHATSAPP_OUTBOUND_ENABLED";
const record = (value, extra = {}) => ({ key, type: "plain", target: ["production"], value, ...extra });
test("live enablement and live disablement both survive deployment sync", () => {
  for (const value of ["true", "false"]) assert.deepEqual([...preservedOperationalFlags([record(value)], [key])], [key]);
});
test("missing flags bootstrap from reviewed GitHub config; preview and branch overrides are excluded", () => {
  assert.equal(preservedOperationalFlags([], [key]).size, 0);
  assert.equal(preservedOperationalFlags([record("true", { target: ["preview"] }), record("true", { gitBranch: "feature" })], [key]).size, 0);
});
test("ambiguous or malformed live flags fail before any environment mutation", () => {
  for (const records of [[record("true"), record("false")], [record("encrypted", { type: "sensitive" })], [record("yes")]]) {
    assert.throws(() => preservedOperationalFlags(records, [key]), /Cannot safely preserve/);
  }
});
