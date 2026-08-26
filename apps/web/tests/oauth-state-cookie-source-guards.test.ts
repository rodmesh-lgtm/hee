import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

for (const relative of [
  "../app/api/auth/oauth/[provider]/route.ts",
  "../app/api/auth/oauth/[provider]/callback/route.ts",
]) {
  test(`${relative} uses provider-scoped state cookie names`, () => {
    const source = readFileSync(new URL(relative, import.meta.url), "utf8");
    assert.match(source, /`hee_oauth_state_\$\{provider\}`/);
  });
}
