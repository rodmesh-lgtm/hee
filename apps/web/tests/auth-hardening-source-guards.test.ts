import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("login performs password verification even when an account is missing", () => {
  const auth = source("app/actions/auth.ts");
  assert.match(auth, /DUMMY_PASSWORD_HASH/);
  assert.match(auth, /verifyPassword\(parsed\.data\.password,\s*user\?\.passwordHash\s*\?\?\s*DUMMY_PASSWORD_HASH\)/);
});

test("registration does not expose whether an email already exists", () => {
  const auth = source("app/actions/auth.ts");
  assert.doesNotMatch(auth, /هذا البريد موجود مسبقاً/);
  assert.match(auth, /GENERIC_REGISTRATION_ERROR/);
});

test("oauth login failures do not expose account existence", () => {
  const callback = source("app/api/auth/oauth/[provider]/callback/route.ts");
  assert.doesNotMatch(callback, /account-not-found/);
});

test("first-time OAuth login cannot silently attach to a password account by email alone", () => {
  const oauth = source("app/lib/oauth.ts");
  const callback = source("app/api/auth/oauth/[provider]/callback/route.ts");
  assert.match(oauth, /function assertOauthEmailAutoLinkSafe/);
  assert.match(oauth, /if \(user\?\.passwordHash\) throw new Error\("oauth-password-account-link-required"\)/);
  assert.match(oauth, /assertOauthEmailAutoLinkSafe\(existingUser\)/);
  assert.match(oauth, /assertOauthEmailAutoLinkSafe\(activeUser\)/);
  assert.match(callback, /passwordHash: true/);
  assert.match(callback, /safeEmailOnlyUser/);
  assert.match(callback, /!existingUser\.passwordHash/);
  assert.match(callback, /if \(!activeIdentity && !safeEmailOnlyUser\) return errorRedirect\(request, "authentication-failed"\)/);
});

test("production OAuth redirect_uri is pinned to the canonical HEE origin", () => {
  const oauth = source("app/lib/oauth.ts");
  assert.match(oauth, /if \(process\.env\.VERCEL_ENV === "production"\) return "https:\/\/hee\.sa"/);
  assert.match(oauth, /return `\$\{oauthOrigin\(\)\}\/api\/auth\/oauth\/\$\{provider\}\/callback`/);
});

test("real runtimes do not authenticate plaintext legacy database sessions", () => {
  const auth = source("app/lib/auth.ts");
  assert.match(auth, /function allowLegacyPlaintextSessions\(\) \{ return process\.env\.APP_ENV === "test"; \}/);
  assert.match(auth, /if \(!session && allowLegacyPlaintextSessions\(\)\)/);
  assert.match(auth, /NORMAL_SESSION_STORAGE_PREFIX/);
  assert.match(auth, /secure:\s*true/);
  assert.match(auth, /SESSION_COOKIE = "__Host-hee_session"/);
});

test("sensitive owner and token pages are private no-store, noindex, and no-referrer", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /pathname\.startsWith\("\/dashboard"\)/);
  assert.match(proxy, /pathname\.startsWith\("\/admin"\)/);
  assert.match(proxy, /pathname === "\/verify-email"/);
  assert.match(proxy, /pathname === "\/reset-password"/);
  assert.match(proxy, /Cache-Control", "private, no-store, max-age=0"/);
  assert.match(proxy, /X-Robots-Tag", "noindex, nofollow"/);
  assert.match(proxy, /Referrer-Policy", "no-referrer"/);
});

test("JSON write endpoints enforce streaming body limits before parsing", () => {
  const helper = source("app/lib/request-body.ts");
  assert.match(helper, /total > limit/);
  assert.match(helper, /RequestBodyTooLargeError/);
  assert.match(helper, /readBoundedText/);
  for (const path of [
    "app/api/public/orders/route.ts",
    "app/api/public/bookings/route.ts",
    "app/api/public/analytics/route.ts",
    "app/api/business/create/route.ts",
    "app/api/dashboard/business/autosave/route.ts",
  ]) {
    const route = source(path);
    assert.match(route, /readBoundedJson\(/, `${path} must use the bounded JSON reader`);
    assert.doesNotMatch(route, /request\.json\(\)/, `${path} must not bypass the bounded JSON reader`);
  }
});

test("Apple OAuth form_post is bounded before form parsing", () => {
  const callback = source("app/api/auth/oauth/[provider]/callback/route.ts");
  assert.match(callback, /readBoundedText\(request, 64 \* 1024\)/);
  assert.match(callback, /new URLSearchParams\(rawForm\)/);
  assert.doesNotMatch(callback, /request\.formData\(\)/);
});
