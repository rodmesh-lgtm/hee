import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");

test("OAuth validates signature, issuer, audience, expiry and nonce", () => {
  assert.match(oauth, /header\.alg !== "RS256"/);
  assert.match(oauth, /cryptoVerify\("RSA-SHA256"/);
  assert.match(oauth, /invalid-id-token-audience/);
  assert.match(oauth, /expired-id-token/);
  assert.match(oauth, /invalid-id-token-nonce/);
  assert.match(oauth, /invalid-id-token-issuer/);
});

test("Google authorization uses PKCE and both providers use bounded one-time state", () => {
  assert.match(oauth, /code_challenge_method: "S256"/);
  assert.match(oauth, /code_verifier/);
  assert.match(oauth, /expiresAt: new Date\(Date\.now\(\) \+ 10 \* 60 \* 1000\)/);
  assert.match(oauth, /oauth-state-reused/);
});

test("OAuth refuses unsafe unverified password-account auto-linking", () => {
  assert.match(oauth, /passwordHash\?: string \| null; emailVerifiedAt\?: Date \| null/);
  assert.match(oauth, /if \(user\?\.passwordHash && !user\.emailVerifiedAt\) throw new Error\("oauth-password-account-link-required"\)/);
  assert.match(oauth, /pg_advisory_xact_lock/);
});