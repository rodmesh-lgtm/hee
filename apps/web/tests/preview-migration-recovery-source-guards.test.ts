import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("deployment builds cannot mutate migration history or run database tooling", () => {
  const script = readFileSync(new URL("../scripts/sync-rc-preview-schema.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(script, /spawnSync|execSync|child_process|migrate[\s\S]*--rolled-back|--applied|prisma\(/);
  assert.match(script, /DISABLED/);
});
