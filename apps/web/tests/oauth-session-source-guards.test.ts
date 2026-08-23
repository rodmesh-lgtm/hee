import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callback = readFileSync(new URL("../app/api/auth/oauth/[provider]/callback/route.ts", import.meta.url), "utf8");

test("OAuth creates session only after code exchange and account resolution", () => {
  const exchange = callback.indexOf("await exchangeOAuthCode");
  const resolve = callback.indexOf("await resolveOAuthUser");
  const session = callback.indexOf("await createSession");
  assert.ok(exchange >= 0 && resolve > exchange && session > resolve);
});
