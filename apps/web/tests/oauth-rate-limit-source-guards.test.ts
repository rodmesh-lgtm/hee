import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const start = readFileSync(new URL("../app/api/auth/oauth/[provider]/route.ts", import.meta.url), "utf8");

test("OAuth starts are rate-limited and fail closed when limiter is unavailable", () => {
  assert.match(start, /scope: `oauth-start-\$\{provider\}`/);
  assert.match(start, /limit: 30/);
  assert.match(start, /windowSeconds: 10 \* 60/);
  assert.match(start, /oauth=start-unavailable/);
  assert.match(start, /Retry-After/);
});
