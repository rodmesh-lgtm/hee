import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../../../.github/workflows/production-launch-readiness.yml", import.meta.url), "utf8");
const pkg = readFileSync(new URL("../package.json", import.meta.url), "utf8");

test("final Production Launch Readiness invokes the launch configuration audit", () => {
  assert.match(workflow, /npm run launch:config-audit/);
  assert.match(pkg, /"launch:config-audit": "tsx scripts\/launch-config-audit\.ts"/);
});
