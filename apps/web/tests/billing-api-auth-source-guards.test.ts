import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("billing POST APIs return JSON 401 instead of navigation redirects", () => {
  for (const path of [
    "app/api/billing/consent/route.ts",
    "app/api/billing/moyasar/created/route.ts",
  ]) {
    const value = source(path);
    assert.match(value, /getCurrentUserForApiWrite/);
    assert.doesNotMatch(value, /getCurrentUserForWrites/);
    assert.match(value, /status:\s*401/);
  }
});
