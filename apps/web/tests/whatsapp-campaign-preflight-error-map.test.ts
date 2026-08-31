import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("campaign launch action maps internal preflight failures to safe UI codes", () => {
  const action = readFileSync(new URL("../app/actions/whatsapp-campaign-launch.ts", import.meta.url), "utf8");
  for (const code of ["connection-not-ready", "template-not-approved", "empty-snapshot", "not-due", "not-queueable", "not-found"]) {
    assert.match(action, new RegExp(code));
  }
});
