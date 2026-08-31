import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("template sync rejects disabled Meta connections in UI and backend", () => {
  const page = readFileSync(new URL("../app/dashboard/whatsapp/templates/page.tsx", import.meta.url), "utf8");
  const sync = readFileSync(new URL("../app/lib/whatsapp/template-sync.ts", import.meta.url), "utf8");
  assert.match(page, /connection\?\.status === "connected" && !connection\.disabledAt/);
  assert.match(page, /provider: "meta"/);
  assert.match(sync, /status: "connected", disabledAt: null/);
  assert.match(sync, /provider: "meta"/);
});
