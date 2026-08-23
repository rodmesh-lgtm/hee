import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("OAuth provider and JWKS network calls are bounded and non-cacheable", () => {
  assert.match(oauth, /const OAUTH_FETCH_TIMEOUT_MS = 7000/);
  assert.match(oauth, /AbortSignal\.timeout\(OAUTH_FETCH_TIMEOUT_MS\)/);
  assert.match(oauth, /cache: "no-store"/);
  assert.match(oauth, /https:\/\/oauth2\.googleapis\.com\/token/);
  assert.match(oauth, /https:\/\/appleid\.apple\.com\/auth\/token/);
});
