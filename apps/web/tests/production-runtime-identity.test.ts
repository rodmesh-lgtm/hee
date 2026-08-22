import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { isExplicitTestRuntime, isProductionRuntime } from "../app/lib/runtime-environment";

const here = dirname(fileURLToPath(import.meta.url));
function source(path: string) { return readFileSync(join(here, "..", path), "utf8"); }

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}

test("hosting platform Production signal cannot be downgraded by missing or test APP_ENV", () => {
  withEnv({ VERCEL_ENV: "production", APP_ENV: undefined }, () => assert.equal(isProductionRuntime(), true));
  withEnv({ VERCEL_ENV: "production", APP_ENV: "test" }, () => {
    assert.equal(isProductionRuntime(), true);
    assert.equal(isExplicitTestRuntime(), false);
  });
  withEnv({ VERCEL_ENV: "preview", APP_ENV: "test" }, () => assert.equal(isExplicitTestRuntime(), true));
});

test("critical paid billing boundaries use the shared Production identity", () => {
  const billing = source("app/lib/billing.ts");
  const moyasar = source("app/lib/moyasar-core.ts");
  const tax = source("app/lib/billing-tax-core.ts");
  const checkout = source("app/dashboard/billing/checkout/page.tsx");
  const webhook = source("app/api/billing/moyasar/webhook/route.ts");

  assert.match(billing, /isProductionRuntime\(\)/);
  assert.match(billing, /isExplicitTestRuntime\(\)/);
  assert.match(moyasar, /if \(isProductionRuntime\(\)\)/);
  assert.match(moyasar, /pk_live_/);
  assert.match(moyasar, /sk_live_/);
  assert.match(tax, /if \(isProductionRuntime\(\)/);
  assert.match(checkout, /if \(isProductionRuntime\(\)\) return "https:\/\/hee\.sa"/);
  assert.match(webhook, /const production = isProductionRuntime\(\)/);
});

test("critical paid billing runtime files no longer derive Production from APP_ENV alone", () => {
  for (const path of [
    "app/lib/billing.ts",
    "app/lib/moyasar-core.ts",
    "app/lib/billing-tax-core.ts",
    "app/dashboard/billing/checkout/page.tsx",
    "app/api/billing/moyasar/webhook/route.ts",
  ]) {
    assert.doesNotMatch(source(path), /APP_ENV[^\n]*===\s*["']production["']/);
  }
});
