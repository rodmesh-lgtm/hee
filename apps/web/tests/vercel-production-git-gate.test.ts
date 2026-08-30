import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("main cannot bypass the reviewed production deployment workflow through Vercel Git auto-deploy", () => {
  const config = JSON.parse(source("vercel.json")) as {
    git?: { deploymentEnabled?: Record<string, boolean> | boolean };
  };
  assert.equal(typeof config.git?.deploymentEnabled, "object");
  const deploymentEnabled = config.git?.deploymentEnabled as Record<string, boolean>;
  assert.equal(deploymentEnabled.main, false);
  assert.equal(deploymentEnabled["hee-v6-rc"], undefined, "RC Preview deployments must remain available for verification");

  const workflow = source("../../.github/workflows/production-deploy.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /Require content-proven RC Quality for release/);
  assert.match(workflow, /Production Preflight V2/);
  assert.match(workflow, /deploy --prod --skip-domain --yes/);
  assert.match(workflow, /promote \"\$deployment_url\" --yes --timeout 5m --token \"\$VERCEL_TOKEN\" --scope \"\$VERCEL_ORG_ID\"/);
});
