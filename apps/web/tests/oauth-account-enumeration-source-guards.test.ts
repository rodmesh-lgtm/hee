import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");

test("OAuth login does not reveal whether an account or credential type exists", () => {
  assert.match(callback, /return errorRedirect\(request, "authentication-failed"\)/);
  assert.doesNotMatch(callback, /oauth-password-account-link-required/);
  assert.doesNotMatch(callback, /account-not-found/);
});
