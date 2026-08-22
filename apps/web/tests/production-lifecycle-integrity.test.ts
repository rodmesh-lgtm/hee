import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production web and maintenance cutovers share one reviewed Vercel environment sync implementation", () => {
  const deploy = source("../../.github/workflows/production-deploy.yml");
  const maintenance = source("../../.github/workflows/production-enter-maintenance.yml");
  const sync = source("../../.github/scripts/sync-vercel-production-env.mjs");

  assert.match(deploy, /node \.github\/scripts\/sync-vercel-production-env\.mjs/);
  assert.match(maintenance, /node \.github\/scripts\/sync-vercel-production-env\.mjs/);
  assert.doesNotMatch(deploy, /node - <<'NODE'/);
  assert.match(sync, /PRODUCTION_MAINTENANCE_MODE must remain deployment-scoped/);
  assert.doesNotMatch(sync, /"PRODUCTION_MAINTENANCE_MODE"\s*,\s*target/);
});

test("billing worker cannot clear a maintenance lock without a fully successful exact-SHA migration lifecycle", () => {
  const workflow = source("../../.github/workflows/production-worker-deploy.yml");

  const lifecycleEvidence = workflow.indexOf("Resolve exact-SHA Production lifecycle evidence");
  const canonicalProof = workflow.indexOf("Prove canonical web is exact-SHA and out of maintenance before worker cutover");
  const lifecycleProof = workflow.indexOf("Prove maintenance lifecycle before any possible worker unlock");
  const prepare = workflow.indexOf("Prepare and atomically activate exact worker release");
  const unlock = workflow.indexOf("Only now may this exact worker release clear the maintenance interlock");
  const postProof = workflow.indexOf("Re-prove canonical exact-SHA non-maintenance after worker unlock");

  assert.ok(lifecycleEvidence >= 0);
  assert.ok(canonicalProof > lifecycleEvidence);
  assert.ok(lifecycleProof > canonicalProof);
  assert.ok(prepare > lifecycleProof);
  assert.ok(unlock > prepare);
  assert.ok(postProof > unlock);

  assert.match(workflow, /production-enter-maintenance\.yml/);
  assert.match(workflow, /production-migrations\.yml/);
  assert.match(workflow, /Maintenance lock exists but exact SHA has no fully successful Production Migrations run; refusing unlock/);
  assert.match(workflow, /successful maintenance entry but no successful migration run, while the maintenance lock is absent/);
  assert.match(workflow, /status\.releaseSha !== sha/);
  assert.match(workflow, /status\.maintenance !== false/);
  assert.match(workflow, /Maintenance lock disappeared before guarded unlock/);
  assert.match(workflow, /sudo -n rm -f \/etc\/hee\/maintenance\.lock/);
});
