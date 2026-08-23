import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

test("OAuth start binds state to a short-lived secure provider callback cookie", () => {
  const start = read("../app/api/auth/oauth/[provider]/route.ts");
  assert.match(start, /httpOnly: true/);
  assert.match(start, /sameSite: provider === "apple" \? "none" : "lax"/);
  assert.match(start, /secure: true/);
  assert.match(start, /path: `\/api\/auth\/oauth\/\$\{provider\}\/callback`/);
  assert.match(start, /maxAge: 10 \* 60/);
});

test("OAuth callback rejects browser-state mismatch before consuming provider code", () => {
  const callback = read("../app/api/auth/oauth/[provider]/callback/route.ts");
  assert.match(callback, /timingSafeEqual/);
  assert.match(callback, /if \(!browserState .* !safeEqual\(browserState, input\.state\)\) return errorRedirect\(request, "invalid-state"\)/s);
  assert.match(callback, /consumeOAuthState\(provider, input\.state\)/);
});
