import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const audit = readFileSync(new URL("../scripts/launch-config-audit.ts", import.meta.url), "utf8");

test("production launch fails closed if either advertised OAuth provider is absent", () => {
  for (const name of ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"]) {
    assert.match(audit, new RegExp(`(?:required|strongSecret)\\(\\"${name}\\"`));
  }
});
