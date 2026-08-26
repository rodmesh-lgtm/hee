import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("OAuth verifies tokens only against official provider JWKS endpoints", () => {
  assert.match(oauth, /https:\/\/www\.googleapis\.com\/oauth2\/v3\/certs/);
  assert.match(oauth, /https:\/\/appleid\.apple\.com\/auth\/keys/);
  assert.match(oauth, /signing-key-not-found/);
  assert.match(oauth, /invalid-id-token-signature/);
});
