import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, "../app/api/billing/moyasar/callback/route.ts"), "utf8");

test("billing callback redirects are pinned to the canonical origin in either Production signal", () => {
  assert.match(source, /APP_ENV/);
  assert.match(source, /VERCEL_ENV/);
  assert.match(source, /appEnv === "production" \|\| vercelEnv === "production"/);
  assert.match(source, /return "https:\/\/ir\.sa"/);
});
