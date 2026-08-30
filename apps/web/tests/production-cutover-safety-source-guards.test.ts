import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production deploy stages and proves exact-SHA core-ready Production before any canonical promotion", () => {
  const workflow = source("../../.github/workflows/production-deploy.yml");

  const capture = workflow.indexOf("Capture current canonical Production deployment for rollback");
  const stage = workflow.indexOf("Stage exact checkout as Production deployment without assigning domains");
  const stageSmoke = workflow.indexOf("Verify staged exact-SHA core web readiness before promotion");
  const promote = workflow.indexOf("Promote verified staged deployment to Production domains");
  const canonical = workflow.indexOf("Verify canonical domain serves exact-SHA core-ready Production after promotion");
  const canonicalSmoke = workflow.indexOf("Verify baseline customer surfaces after canonical promotion");
  const rollback = workflow.indexOf("Roll back canonical Production on any post-stage promotion failure");

  assert.ok(capture >= 0, "current canonical production must be captured");
  assert.ok(stage > capture, "staging must occur after rollback target capture");
  assert.ok(stageSmoke > stage, "staged exact-SHA core-ready deployment must be proven before promotion");
  assert.ok(promote > stageSmoke, "promotion must happen only after staged proof succeeds");
  assert.ok(canonical > promote, "canonical exact-SHA core-ready state must be checked after promotion");
  assert.ok(canonicalSmoke > canonical, "customer surfaces must be checked after canonical convergence");
  assert.ok(rollback > canonicalSmoke, "rollback handler must follow all post-promotion verification steps");

  assert.match(workflow, /VERCEL_CLI_VERSION: 59\.3\.0/);
  assert.doesNotMatch(workflow, /vercel@latest/);
  assert.match(workflow, /deploy --prod --skip-domain --yes/);
  assert.match(workflow, /curl --silent --show-error --fail --max-time 20 "\$\{deployment_url%\/\}\/api\/release"/);
  assert.match(workflow, /curl --silent --show-error --fail --max-time 20 "\$\{deployment_url%\/\}\/api\/maintenance\/status"/);
  assert.match(workflow, /curl --silent --show-error --fail --max-time 20 "\$\{deployment_url%\/\}\/api\/health\/web-ready"/);
  assert.match(workflow, /curl --silent --show-error --fail --max-time 20 "\$\{deployment_url%\/\}\$\{path\}"/);
  assert.doesNotMatch(workflow, /vercel@\$\{VERCEL_CLI_VERSION\}" curl/);
  assert.match(workflow, /release\.releaseSha !== sha/);
  assert.match(workflow, /status\.maintenance !== false/);
  assert.match(workflow, /webReady\.ready !== true/);
  assert.match(workflow, /https:\/\/ir\.sa\/api\/health\/web-ready/);
  assert.match(workflow, /v10\/projects\/\$\{VERCEL_PROJECT_ID\}\/promote\/\$\{deployment_id\}/);
  assert.match(workflow, /Staged deployment belongs to an unexpected Vercel project/);
  assert.match(workflow, /failure\(\) && steps\.stage_smoke\.outcome == 'success'/);
  assert.match(workflow, /v1\/projects\/\$\{VERCEL_PROJECT_ID\}\/rollback\/\$\{previous_id\}/);
  assert.doesNotMatch(workflow, /vercel@\$\{VERCEL_CLI_VERSION\}" (?:promote|rollback)/);
  assert.match(workflow, /\[ "\$current_id" = "\$previous_id" \]/);
});

test("canonical rollback target capture fails closed on deployment identity", () => {
  const script = source("../../.github/scripts/capture-current-vercel-production.mjs");

  assert.match(script, /v13\/deployments\/\$\{encodeURIComponent\(canonicalHost\)\}/);
  assert.match(script, /teamId/);
  assert.match(script, /withGitRepoInfo/);
  assert.match(script, /state !== "READY"/);
  assert.match(script, /target !== "production"/);
  assert.match(script, /did not expose a project identity/);
  assert.match(script, /resolvedProjectId !== projectId/);
  assert.match(script, /aliases\.includes\(canonicalHost\)/);
  assert.match(script, /mode: 0o600/);
});

test("rollback cannot run for pre-stage failures", () => {
  const workflow = source("../../.github/workflows/production-deploy.yml");
  assert.match(workflow, /if: \$\{\{ failure\(\) && steps\.stage_smoke\.outcome == 'success' \}\}/);
  assert.doesNotMatch(workflow, /if: \$\{\{ failure\(\) \}\}\s*\n\s*working-directory: \.\s*\n\s*run:[\s\S]*?rollback/);
});
