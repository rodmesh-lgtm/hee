import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/launch-config-audit.ts", import.meta.url), "utf8");

test("launch audit has one fail-closed OAuth readiness boundary", () => {
  const calls = audit.match(/productionOauthReadiness\(\);/g) ?? [];
  assert.equal(calls.length, 1);
});
