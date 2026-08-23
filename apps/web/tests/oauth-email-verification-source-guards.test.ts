import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");
const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");

test("OAuth requires provider-verified email before resolving an account", () => {
  assert.match(oauth, /claims\.email_verified === true \|\| claims\.email_verified === "true"/);
  assert.ok(oauth.includes('if (!subject || !email || !verified) throw new Error("verified-email-required")'));
});

test("only a successfully verified OAuth callback marks HEE email verified", () => {
  assert.match(callback, /const claims = await exchangeOAuthCode/);
  assert.match(callback, /if \(!user\.emailVerifiedAt\)/);
  assert.match(callback, /emailVerifiedAt: new Date\(\)/);
});
