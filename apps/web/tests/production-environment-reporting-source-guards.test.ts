import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production provenance endpoints report Vercel production when APP_ENV is absent", () => {
  const release = source("app/api/release/route.ts");
  const launch = source("app/api/billing/launch-status/route.ts");

  for (const endpoint of [release, launch]) {
    assert.match(endpoint, /appEnvironment/);
    assert.match(endpoint, /vercelEnvironment/);
    assert.match(endpoint, /appEnvironment\(\) \|\| vercelEnvironment\(\) \|\| null/);
  }
});
