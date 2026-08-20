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

test("real runtimes do not authenticate plaintext legacy database sessions", () => {
  const auth = source("app/lib/auth.ts");
  assert.match(auth, /function allowLegacyPlaintextSessions\(\) \{ return process\.env\.APP_ENV === "test"; \}/);
  assert.match(auth, /if \(!session && allowLegacyPlaintextSessions\(\)\)/);
  assert.match(auth, /NORMAL_SESSION_STORAGE_PREFIX/);
  assert.match(auth, /secure:\s*true/);
  assert.match(auth, /SESSION_COOKIE = "__Host-hee_session"/);
});
