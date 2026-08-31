import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign snapshot requires an active Meta connection and Meta template", () => {
  const snapshot = readFileSync(new URL("../app/lib/whatsapp/campaign-snapshot.ts", import.meta.url), "utf8");
  assert.match(snapshot, /connection: \{ select: \{ provider: true, status: true, disabledAt: true \} \}/);
  assert.match(snapshot, /campaign\.connection\.provider !== "meta"/);
  assert.match(snapshot, /campaign\.connection\.disabledAt/);
  assert.match(snapshot, /campaign\.template\.provider !== "meta"/);
});
