import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production web runtime uses a deliberately small per-isolate PostgreSQL pool", () => {
  const prisma = source("lib/prisma.ts");
  assert.match(prisma, /import \{ isProductionRuntime \} from "\.\.\/app\/lib\/runtime-environment"/);
  assert.match(prisma, /const fallback = isProductionRuntime\(\) \? "2" : "5"/);
  assert.doesNotMatch(prisma, /APP_ENV[^\n]*===\s*["']production["']/);
  assert.match(prisma, /process\.env\.PG_POOL_MAX/);
  assert.match(prisma, /Math\.max\(1, Math\.min\(20, configured\)\)/);
  assert.match(prisma, /idleTimeoutMillis: 30_000/);
  assert.match(prisma, /connectionTimeoutMillis: 5_000/);
});

test("production gates require an explicit reviewed PostgreSQL connection budget", () => {
  const audit = source("scripts/launch-config-audit.ts");
  const webReadiness = source("app/lib/production-runtime-readiness.ts");
  const ready = source("app/api/health/ready/route.ts");
  const launch = source("../../.github/workflows/production-launch-readiness.yml");
  const preflight = source("../../.github/workflows/production-preflight-v2.yml");

  assert.match(audit, /required\("PG_POOL_MAX"\)/);
  assert.match(audit, /PG_POOL_MAX must be between 1 and 5/);
  assert.match(webReadiness, /function productionPoolReady\(\)/);
  assert.match(webReadiness, /value >= 1 && value <= 5/);
  assert.match(ready, /productionWebRuntimeReleaseSha\(\)/);
  assert.match(launch, /PG_POOL_MAX: \$\{\{ vars\.PRODUCTION_PG_POOL_MAX \}\}/);
  assert.match(preflight, /PG_POOL_MAX: \$\{\{ vars\.PRODUCTION_PG_POOL_MAX \}\}/);
  assert.match(preflight, /PG_POOL_MAX must be an integer between 1 and 5/);
});
