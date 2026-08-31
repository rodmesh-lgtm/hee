import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Round 194 documents no Production migration", () => {
  const doc = readFileSync(new URL("../../../docs/WHATSAPP_ROUND_194.md", import.meta.url), "utf8");
  assert.match(doc, /No Production database migration/);
});
