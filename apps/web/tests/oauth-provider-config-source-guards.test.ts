import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("runtime refuses partially configured OAuth providers", () => {
  assert.match(oauth, /process\.env\.GOOGLE_CLIENT_ID && process\.env\.GOOGLE_CLIENT_SECRET/);
  assert.match(oauth, /process\.env\.APPLE_CLIENT_ID && process\.env\.APPLE_TEAM_ID && process\.env\.APPLE_KEY_ID && process\.env\.APPLE_PRIVATE_KEY/);
  assert.match(oauth, /provider-not-configured/);
});
