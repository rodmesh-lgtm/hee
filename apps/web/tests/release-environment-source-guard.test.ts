import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("release endpoint reports Vercel production when APP_ENV is not explicitly configured", () => {
  const route = source("app/api/release/route.ts");
  assert.match(route, /appEnvironment, vercelEnvironment/);
  assert.match(route, /const environment = appEnvironment\(\) \|\| vercelEnvironment\(\)/);
  assert.match(route, /environment: environment \|\| null/);
});
