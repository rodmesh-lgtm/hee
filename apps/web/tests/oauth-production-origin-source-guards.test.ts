import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const relative of [
  "../app/lib/oauth.ts",
  "../app/api/auth/oauth/[provider]/route.ts",
  "../app/api/auth/oauth/[provider]/callback/route.ts",
]) {
  test(`${relative} pins production redirects to hee.sa`, () => {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    assert.match(source, /process\.env\.VERCEL_ENV === "production"/);
    assert.match(source, /https:\/\/hee\.sa/);
  });
}
