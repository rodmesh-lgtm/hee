import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workflow = readFileSync(
  resolve(process.cwd(), "../../.github/workflows/production-canonical-cutover-orchestrator.yml"),
  "utf8",
);

test("canonical cutover runs only after green release-branch RC and explicit commit marker", () => {
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows: \["RC Quality"\]/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'hee-v6-rc'/);
  assert.match(workflow, /\[production-cutover\]/);
  assert.match(workflow, /branch_sha[^\n]*TARGET_SHA|test "\$branch_sha" = "\$TARGET_SHA"/);
});

test("canonical cutover dispatches Preflight before Production Web Deploy and pins both to exact head", () => {
  const preflightDispatch = workflow.indexOf("Dispatch exact-head Production Preflight V2");
  const preflightProof = workflow.indexOf("Require successful exact-SHA Production Preflight V2");
  const headProof = workflow.indexOf("Re-prove unchanged release head before Production mutation");
  const deployDispatch = workflow.indexOf("Dispatch exact-head Production Web Deploy");
  const deployProof = workflow.indexOf("Require successful exact-SHA Production Web Deploy");
  const canonicalProof = workflow.indexOf("Verify canonical ir.sa exact release and security baseline");

  assert.ok(preflightDispatch >= 0);
  assert.ok(preflightProof > preflightDispatch);
  assert.ok(headProof > preflightProof);
  assert.ok(deployDispatch > headProof);
  assert.ok(deployProof > deployDispatch);
  assert.ok(canonicalProof > deployProof);
  assert.match(workflow, /production-preflight-v2\.yml\/dispatches/);
  assert.match(workflow, /VERIFY_PRODUCTION_PREFLIGHT/);
  assert.match(workflow, /production-deploy\.yml\/dispatches/);
  assert.match(workflow, /DEPLOY_EXACT_RELEASE_TO_PRODUCTION/);
  assert.match(workflow, /head_sha===sha/);
  assert.match(workflow, /head_branch==='hee-v6-rc'/);
});

test("canonical cutover does not open paid checkout or bypass official deployment rollback machinery", () => {
  assert.doesNotMatch(workflow, /production-open-paid-checkout\.yml\/dispatches/);
  assert.doesNotMatch(workflow, /PAID_CHECKOUT_PUBLIC_ENABLED.*true/);
  assert.doesNotMatch(workflow, /vercel\s+(?:deploy|promote|alias|rollback)/);
  assert.doesNotMatch(workflow, /prisma migrate deploy/);
  assert.match(workflow, /https:\/\/ir\.sa\/api\/release/);
  assert.match(workflow, /https:\/\/admin\.ir\.sa\//);
  assert.match(workflow, /https:\/\/www\.ir\.sa\//);
  assert.match(workflow, /Legacy canonical domain still appears on live homepage/);
});
