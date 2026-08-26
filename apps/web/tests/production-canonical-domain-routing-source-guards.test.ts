import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const script = readFileSync(resolve(process.cwd(), "../../.github/scripts/sync-vercel-production-env.mjs"), "utf8");

test("production sync repairs canonical ir.sa ownership before environment sync", () => {
  assert.match(script, /CANONICAL_HOST\s*=\s*"ir\.sa"/);
  assert.match(script, /WWW_HOST\s*=\s*"www\.ir\.sa"/);
  assert.match(script, /\/v1\/domains\/\$\{encodeURIComponent\(CANONICAL_HOST\)\}\/project-domains/);
  assert.match(script, /\/domains\/\$\{encodeURIComponent\(name\)\}\/move/);
  assert.match(script, /projectId:\s*process\.env\.VERCEL_PROJECT_ID/);
  assert.match(script, /redirectStatusCode\s*=\s*308/);
  assert.match(script, /item\.verified\s*!==\s*true/);

  const domainRepair = script.indexOf("await ensureCanonicalDomain(CANONICAL_HOST, null)");
  const envSync = script.indexOf("/env?upsert=true");
  assert.ok(domainRepair >= 0, "canonical domain repair call must exist");
  assert.ok(envSync >= 0, "production environment sync endpoint must exist");
  assert.ok(domainRepair < envSync, "canonical domains must be repaired before Production env sync/promotion path");
});
