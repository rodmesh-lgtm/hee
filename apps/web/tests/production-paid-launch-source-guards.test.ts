import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("billing launch status exposes only safe exact-release state", () => {
  const route = source("app/api/billing/launch-status/route.ts");
  assert.match(route, /PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(route, /BILLING_REHEARSAL_USER_EMAIL/);
  assert.match(route, /mode: launchMode\(\)/);
  assert.match(route, /releaseSha: releaseSha\(\)/);
  assert.match(route, /billingOperationsReady/);
  assert.match(route, /renewalEnabled/);
  assert.match(route, /Cache-Control.*no-store/);
  assert.doesNotMatch(route, /rehearsalEmail\s*:/);
  assert.doesNotMatch(route, /BILLING_REHEARSAL_USER_EMAIL[^\n]*[,}]/);
});

test("ordinary Vercel Production sync can only persist the closed paid-launch baseline", () => {
  const sync = source("../../.github/scripts/sync-vercel-production-env.mjs");
  assert.match(sync, /key: "PAID_CHECKOUT_PUBLIC_ENABLED", value: "false"/);
  assert.match(sync, /key: "BILLING_REHEARSAL_USER_EMAIL", value: ""/);
  assert.doesNotMatch(sync, /String\(process\.env\.PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.doesNotMatch(sync, /String\(process\.env\.BILLING_REHEARSAL_USER_EMAIL/);
});

test("every workflow that may move canonical Production shares one non-canceling serialization lock", () => {
  const workflows = [
    "../../.github/workflows/production-deploy.yml",
    "../../.github/workflows/production-enter-maintenance.yml",
    "../../.github/workflows/production-billing-rehearsal.yml",
    "../../.github/workflows/production-open-paid-checkout.yml",
    "../../.github/workflows/production-close-paid-checkout.yml",
  ];
  for (const path of workflows) {
    const workflow = source(path);
    assert.match(workflow, /concurrency:\s*\n\s*group: production-billing-launch-transition\s*\n\s*cancel-in-progress: false/);
  }
});

test("billing launch mode promotion is exact-SHA staged, rollback-armed before mutation, canonically proven, and only then disarmed", () => {
  const script = source("../../.github/scripts/promote-production-billing-launch-mode.sh");
  const capture = script.indexOf("capture-current-vercel-production.mjs");
  const baselineRelease = script.indexOf("previous_release_json=");
  const stage = script.indexOf("deploy --prod --skip-domain");
  const stagedRelease = script.indexOf("curl /api/release --deployment", stage);
  const stagedMaintenance = script.indexOf("curl /api/maintenance/status --deployment", stagedRelease);
  const stagedLaunch = script.indexOf("curl /api/billing/launch-status --deployment", stagedMaintenance);
  const arm = script.indexOf("rollback_armed=true", stagedLaunch);
  const promote = script.indexOf(" promote \"$deployment_url\"", arm);
  const canonical = script.indexOf("https://${canonical_host}/api/billing/launch-status", promote);
  const disarm = script.indexOf("rollback_armed=false", canonical);

  assert.ok(capture >= 0);
  assert.ok(baselineRelease > capture, "captured rollback baseline must be runtime-proven before staging");
  assert.ok(stage > baselineRelease);
  assert.ok(stagedRelease > stage);
  assert.ok(stagedMaintenance > stagedRelease);
  assert.ok(stagedLaunch > stagedMaintenance);
  assert.ok(arm > stagedLaunch, "rollback must arm only after staged proof succeeds");
  assert.ok(promote > arm, "rollback must be armed before the first canonical mutation command");
  assert.ok(canonical > promote, "canonical target state must be proved after promotion");
  assert.ok(disarm > canonical, "rollback may be disarmed only after canonical convergence proof");

  assert.match(script, /targetMode === 'rehearsal' && previousMode !== 'closed'/);
  assert.match(script, /targetMode === 'public' && previousMode !== 'rehearsal'/);
  assert.match(script, /--env RELEASE_SHA="\$GITHUB_SHA"/);
  assert.match(script, /--env PAID_CHECKOUT_PUBLIC_ENABLED="\$public_enabled"/);
  assert.match(script, /--env BILLING_REHEARSAL_USER_EMAIL="\$rehearsal_email"/);
  assert.match(script, /release\.releaseSha !== sha/);
  assert.match(script, /maintenance\.maintenance !== false/);
  assert.match(script, /launch\.mode !== mode/);
  assert.match(script, /trap rollback_if_needed EXIT/);
  assert.match(script, /trap - EXIT/);
  assert.match(script, /rollback "\$previous_url"/);
  assert.match(script, /current_id.*previous_id/);
  assert.match(script, /billing-launch-rollback-proof: PASS/);
  assert.match(script, /exit 70/);
  assert.doesNotMatch(script, /rollback "\$previous_url"[^\n]*\|\| true/);
});

test("rehearsal requires exact release web and worker cutover before opening one account", () => {
  const workflow = source("../../.github/workflows/production-billing-rehearsal.yml");
  const evidence = workflow.indexOf("Require exact-SHA web and worker cutover before rehearsal");
  const closed = workflow.indexOf("Prove canonical Production is exact-SHA closed billing mode");
  const audit = workflow.indexOf("Re-prove billing database and worker state");
  const candidate = workflow.indexOf("Prove rehearsal account is a single verified FREE-plan candidate");
  const promote = workflow.indexOf("Stage and promote exact-SHA rehearsal-only billing mode");
  const baseline = workflow.indexOf("Preserve exact-SHA closed billing rollback baseline");

  assert.ok(evidence >= 0);
  assert.ok(closed > evidence);
  assert.ok(audit > closed);
  assert.ok(candidate > audit);
  assert.ok(promote > candidate);
  assert.ok(baseline > promote);
  assert.match(workflow, /production-preflight-v2\.yml/);
  assert.match(workflow, /production-deploy\.yml/);
  assert.match(workflow, /production-worker-deploy\.yml/);
  assert.match(workflow, /HEE_BILLING_LAUNCH_MODE: rehearsal/);
  assert.match(workflow, /production-billing-launch-proof\.ts candidate/);
  assert.match(workflow, /hee-paid-launch-closed-baseline-\$\{\{ github\.sha \}\}/);
  assert.doesNotMatch(workflow, /api\.moyasar\.com\/v1\/payments[^\n]*-X POST/);
});

test("public paid opening is impossible before a complete exact-SHA live rehearsal proof", () => {
  const workflow = source("../../.github/workflows/production-open-paid-checkout.yml");
  const rehearsal = workflow.indexOf("Resolve successful exact-SHA rehearsal evidence");
  const mode = workflow.indexOf("Prove canonical Production remains exact-SHA rehearsal-only mode");
  const audit = workflow.indexOf("Re-prove billing database and worker state");
  const proof = workflow.indexOf("Prove one complete live rehearsal across HEE ledger, webhook, receipt, renewal token and Moyasar");
  const promote = workflow.indexOf("Stage and promote exact-SHA public paid checkout");
  const health = workflow.indexOf("Prove final runtime readiness after opening public checkout");
  const rollback = workflow.indexOf("Roll back to rehearsal-only mode if post-promotion readiness fails");

  assert.ok(rehearsal >= 0);
  assert.ok(mode > rehearsal);
  assert.ok(audit > mode);
  assert.ok(proof > audit);
  assert.ok(promote > proof);
  assert.ok(health > promote);
  assert.ok(rollback > health);
  assert.match(workflow, /production-billing-rehearsal\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /production-billing-launch-proof\.ts verify/);
  assert.match(workflow, /HEE_BILLING_LAUNCH_MODE: public/);
  assert.match(workflow, /api\/health\/ready/);
  assert.match(workflow, /rollback "\$previous_url"/);
});

test("emergency close uses only the canonical release exact-SHA closed baseline", () => {
  const workflow = source("../../.github/workflows/production-close-paid-checkout.yml");
  const canonical = workflow.indexOf("Resolve currently served exact Production release and billing mode");
  const baseline = workflow.indexOf("Resolve successful rehearsal baseline for the currently served release");
  const verify = workflow.indexOf("Verify baseline deployment is same-SHA closed mode before rollback");
  const rollback = workflow.indexOf("Roll canonical Production back to exact-SHA closed billing baseline");

  assert.ok(canonical >= 0);
  assert.ok(baseline > canonical);
  assert.ok(verify > baseline);
  assert.ok(rollback > verify);
  assert.match(workflow, /head_sha=\$\{HEE_CANONICAL_RELEASE_SHA\}/);
  assert.match(workflow, /hee-paid-launch-closed-baseline-\$\{HEE_CANONICAL_RELEASE_SHA\}/);
  assert.match(workflow, /launch\.mode!=="closed"/);
  assert.match(workflow, /rollback "\$HEE_CLOSED_BASELINE_URL"/);
  assert.doesNotMatch(workflow, /actions\/checkout/);
  assert.doesNotMatch(workflow, /vercel@[^\n]* deploy /);
});

test("Final Readiness requires exact-SHA open-paid evidence and canonical public mode", () => {
  const workflow = source("../../.github/workflows/production-launch-readiness.yml");
  const open = workflow.indexOf("Require successful exact-SHA verified public paid checkout opening");
  const provenance = workflow.indexOf("Verify canonical release provenance");
  const publicMode = workflow.indexOf("Verify canonical exact-SHA public paid launch state");
  const health = workflow.indexOf("Verify live runtime configuration and database readiness");

  assert.ok(open >= 0);
  assert.ok(provenance > open);
  assert.ok(publicMode > provenance);
  assert.ok(health > publicMode);
  assert.match(workflow, /production-open-paid-checkout\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /launch\.releaseSha !== process\.env\.GITHUB_SHA/);
  assert.match(workflow, /launch\.mode !== "public"/);
  assert.match(workflow, /launch\.billingOperationsReady !== true/);
  assert.match(workflow, /launch\.renewalEnabled !== true/);
});
