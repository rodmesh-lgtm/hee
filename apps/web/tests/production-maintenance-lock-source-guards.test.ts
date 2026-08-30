import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("proxy maintenance gate covers all application traffic and keeps only read-only controls open", () => {
  const proxy = source("proxy.ts");
  assert.match(proxy, /PRODUCTION_MAINTENANCE_MODE/);
  assert.match(proxy, /APP_ENV/);
  assert.match(proxy, /request\.method !== "GET" && request\.method !== "HEAD"/);
  assert.match(proxy, /pathname === "\/api\/release" \|\| pathname === "\/api\/maintenance\/status"/);
  assert.match(proxy, /status: 503/);
  assert.match(proxy, /Retry-After/);
  assert.match(proxy, /noindex, nofollow, noarchive/);
  assert.match(proxy, /matcher: \["\/\(\(\?!_next\/static\|_next\/image\|favicon\.ico\)\.\*\)"\]/);
});

test("maintenance status is read-only, exact-release addressable and non-cacheable", () => {
  const route = source("app/api/maintenance/status/route.ts");
  assert.match(route, /export async function GET/);
  assert.doesNotMatch(route, /export async function POST/);
  assert.match(route, /PRODUCTION_MAINTENANCE_MODE/);
  assert.match(route, /RELEASE_SHA/);
  assert.match(route, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(route, /no-store/);
  assert.match(route, /noindex, nofollow, noarchive/);
});

test("production maintenance is staged and proven before canonical promotion", () => {
  const workflow = source("../../.github/workflows/production-enter-maintenance.yml");
  const capture = workflow.indexOf("Capture current canonical Production deployment for rollback");
  const stage = workflow.indexOf("Stage exact release in maintenance mode without assigning domains");
  const smoke = workflow.indexOf("Prove staged maintenance blocks UI and write API before promotion");
  const promote = workflow.indexOf("Promote verified maintenance deployment to canonical Production");
  const canonical = workflow.indexOf("Prove canonical Production is exact-SHA maintenance");
  const workerLock = workflow.indexOf("Lock and quiesce billing worker without killing an active cycle");

  assert.match(workflow, /ENTER_PRODUCTION_MAINTENANCE/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /production-preflight-v2\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /deploy --prod --skip-domain/);
  assert.match(workflow, /--env PRODUCTION_MAINTENANCE_MODE=true/);
  assert.match(workflow, /--build-env PRODUCTION_MAINTENANCE_MODE=true/);
  assert.match(workflow, /\$\{deployment_url%\/\}\/register/);
  assert.match(workflow, /\$\{deployment_url%\/\}\/api\/public\/orders/);
  assert.doesNotMatch(workflow, /vercel@\$\{VERCEL_CLI_VERSION\}" curl/);
  assert.match(workflow, /test "\$ui_code" = "503"/);
  assert.match(workflow, /test "\$write_code" = "503"/);
  assert.match(workflow, /https:\/\/ir\.sa\/api\/maintenance\/status/);
  assert.match(workflow, /test "\$code" = "503"/);
  assert.match(workflow, /ConditionPathExists=!\/etc\/hee\/maintenance\.lock/);
  assert.match(workflow, /systemctl disable --now hee-billing-renew\.timer/);
  assert.doesNotMatch(workflow, /systemctl stop hee-billing-renew\.service/);

  assert.ok(capture >= 0 && stage > capture, "rollback target must be captured before maintenance staging");
  assert.ok(smoke > stage, "staged maintenance must be proven before promotion");
  assert.ok(promote > smoke, "maintenance may promote only after staged proof");
  assert.ok(canonical > promote, "canonical maintenance must be proven after promotion");
  assert.ok(workerLock > canonical, "worker may be locked only after canonical traffic is blocked");

  assert.match(workflow, /failure\(\) && steps\.stage_smoke\.outcome == 'success' && steps\.canonical_maintenance\.outcome != 'success'/);
});

test("production migrations reject textual write-pause confirmation without live technical proof", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  const maintenanceRun = workflow.indexOf("Require successful exact-SHA maintenance entry workflow");
  const canonicalProof = workflow.indexOf("Prove canonical web is still exact-SHA maintenance before any database access");
  const workerProof = workflow.indexOf("Prove billing worker maintenance lock and quiescence");
  const reprove = workflow.indexOf("Re-prove maintenance immediately before taking production backup");
  const backup = workflow.indexOf("Create encrypted pre-migration backup");
  const migrate = workflow.indexOf("Apply pending migrations");
  const postProof = workflow.indexOf("Prove maintenance remains active after migration");

  assert.match(workflow, /PRODUCTION_WRITES_PAUSED/);
  assert.match(workflow, /production-enter-maintenance\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /https:\/\/ir\.sa\/api\/maintenance\/status/);
  assert.match(workflow, /release_sha" = "\$GITHUB_SHA/);
  assert.match(workflow, /test "\$code" = "503"/);
  assert.match(workflow, /test -f \/etc\/hee\/maintenance\.lock/);
  assert.match(workflow, /ConditionPathExists=!\/etc\/hee\/maintenance\.lock/);
  assert.match(workflow, /! sudo -n systemctl is-active --quiet hee-billing-renew\.timer/);
  assert.match(workflow, /! sudo -n systemctl is-active --quiet hee-billing-renew\.service/);

  assert.ok(maintenanceRun >= 0 && canonicalProof > maintenanceRun, "exact maintenance workflow must precede live proof");
  assert.ok(workerProof > canonicalProof, "worker quiescence must be proven before database tooling");
  assert.ok(reprove > workerProof && backup > reprove, "maintenance must be re-proven immediately before backup");
  assert.ok(migrate > backup && postProof > migrate, "maintenance must remain active through migration completion");
});

test("Vercel environment sync never persists maintenance mode", () => {
  const sync = source("../../.github/scripts/sync-vercel-production-env.mjs");
  assert.match(sync, /must remain deployment-scoped/);
  assert.doesNotMatch(sync, /"PRODUCTION_MAINTENANCE_MODE",\n\s*"BILLING_SELLER/);
  assert.match(sync, /Object\.prototype\.hasOwnProperty\.call\(process\.env, "PRODUCTION_MAINTENANCE_MODE"\)/);
});

test("final launch and live readiness reject maintenance and require verify-full TLS", () => {
  const audit = source("scripts/launch-config-audit.ts");
  const webReadiness = source("app/lib/production-runtime-readiness.ts");
  const ready = source("app/api/health/ready/route.ts");
  assert.match(audit, /PRODUCTION_MAINTENANCE_MODE must be false before general production launch/);
  assert.match(webReadiness, /enabled\("PRODUCTION_MAINTENANCE_MODE"\)/);
  assert.match(webReadiness, /getAll\("sslmode"\)/);
  assert.match(webReadiness, /sslModes\.length === 1/);
  assert.match(webReadiness, /verify-full/);
  assert.doesNotMatch(webReadiness, /verify-ca/);
  assert.doesNotMatch(webReadiness, /new Set\(\["verify-full", "verify-ca", "require", "prefer"\]\)/);
  assert.match(ready, /productionWebRuntimeReleaseSha\(\)/);
});
