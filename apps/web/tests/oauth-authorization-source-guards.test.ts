import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("Google and Apple authorization requests ask only for identity scopes", () => {
  assert.match(oauth, /scope: "openid email profile"/);
  assert.match(oauth, /scope: "name email"/);
  assert.match(oauth, /prompt: "select_account"/);
});
