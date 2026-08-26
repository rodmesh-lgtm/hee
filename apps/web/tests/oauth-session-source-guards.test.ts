import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");
const oauth = readFileSync(new URL("../app/lib/oauth.ts", import.meta.url), "utf8");
const oauthStart = readFileSync(new URL("../app/api/auth/oauth/[provider]/route.ts", import.meta.url), "utf8");

test("OAuth creates session only after code exchange and account resolution", () => {
  const exchange = callback.indexOf("await exchangeOAuthCode");
  const resolve = callback.indexOf("await resolveOAuthUser");
  const session = callback.indexOf("await createSession");
  assert.ok(exchange >= 0 && resolve > exchange && session > resolve);
});

test("first-time OAuth linking accepts verified local accounts but blocks unverified password accounts", () => {
  assert.match(callback, /passwordHash: true, emailVerifiedAt: true/);
  assert.match(callback, /!existingUser\.passwordHash \|\| existingUser\.emailVerifiedAt/);
  assert.match(oauth, /passwordHash\?: string \| null; emailVerifiedAt\?: Date \| null/);
  assert.match(oauth, /user\?\.passwordHash && !user\.emailVerifiedAt/);
});

test("social registration remains consent-gated", () => {
  assert.match(oauthStart, /mode"\) === "register"/);
  assert.match(oauthStart, /\/register\?oauth=consent-required/);
});