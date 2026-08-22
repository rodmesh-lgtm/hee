import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("billing operations fail closed when webhook recovery schedules a retry", () => {
  const recovery = source("app/lib/moyasar-webhook-processing.ts");
  const worker = source("scripts/billing-webhook-recovery-worker.ts");
  const pkg = source("package.json");

  assert.match(recovery, /let retries = 0/);
  assert.match(recovery, /if \(result === "retry"\) retries \+= 1/);
  assert.match(recovery, /errors: retries/);
  assert.match(worker, /if \(webhook\.errors > 0\) throw new Error\(`WEBHOOK_RECOVERY_ERRORS_/);
  assert.match(worker, /if \(checkout\.errors > 0\) throw new Error\(`OPEN_CHECKOUT_RECONCILIATION_ERRORS_/);
  assert.match(pkg, /billing:webhooks/);
  assert.match(pkg, /billing:renew-only/);
  assert.match(pkg, /billing:state-audit/);
});

test("production billing scheduler is versioned, single-shot, release-pinned, maintenance-interlocked and runs every 30 minutes", () => {
  const service = source("../../ops/systemd/hee-billing-renew.service");
  const timer = source("../../ops/systemd/hee-billing-renew.timer");

  assert.match(service, /ConditionPathExists=!\/etc\/hee\/maintenance\.lock/);
  assert.match(service, /Type=oneshot/);
  assert.match(service, /User=hee/);
  assert.match(service, /WorkingDirectory=\/srv\/hee\/current\/apps\/web/);
  assert.match(service, /EnvironmentFile=\/etc\/hee\/production\.env/);
  assert.match(service, /EnvironmentFile=\/srv\/hee\/current\/release\.env/);
  assert.match(service, /ExecStart=\/usr\/bin\/npm run billing:renew/);
  assert.match(service, /NoNewPrivileges=true/);
  assert.match(service, /ProtectSystem=strict/);
  assert.match(timer, /OnCalendar=\*:0\/30/);
  assert.match(timer, /Persistent=true/);
  assert.match(timer, /Unit=hee-billing-renew\.service/);
});

test("production worker deploy keeps maintenance locked and rollback-armed until exact release cutover is proven", () => {
  const workflow = source("../../.github/workflows/production-worker-deploy.yml");
  assert.match(workflow, /DEPLOY_EXACT_BILLING_WORKER/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /uses: \.\/\.github\/actions\/require-release-quality/);
  assert.match(workflow, /GH_TOKEN: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /count_green_dispatches\(\)/);
  assert.match(workflow, /runs\?head_sha=\$\{GITHUB_SHA\}&status=completed/);
  assert.match(workflow, /count_green_dispatches production-preflight\.yml/);
  assert.match(workflow, /count_green_dispatches production-deploy\.yml/);
  assert.match(workflow, /count_green_dispatches production-enter-maintenance\.yml/);
  assert.match(workflow, /count_green_dispatches production-migrations\.yml/);
  assert.match(workflow, /PRODUCTION_HETZNER_KNOWN_HOSTS/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /https:\/\/hee\.sa\/api\/release/);
  assert.match(workflow, /https:\/\/hee\.sa\/api\/maintenance\/status/);
  assert.match(workflow, /git archive --format=tar "\$GITHUB_SHA"/);
  assert.match(workflow, /node -p 'process\.versions\.node\.split/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npx prisma generate/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /systemctl stop hee-billing-renew\.timer/);
  assert.doesNotMatch(workflow, /systemctl stop hee-billing-renew\.service/);
  assert.match(workflow, /Billing timer remained active after stop/);
  assert.match(workflow, /Existing billing cycle did not finish within 20 minutes/);
  assert.match(workflow, /ln -sfn "releases\/\$\{sha\}" \/srv\/hee\/current\.next/);
  assert.match(workflow, /mv -Tf \/srv\/hee\/current\.next \/srv\/hee\/current/);
  assert.match(workflow, /RELEASE_SHA=%s/);
  assert.match(workflow, /ConditionPathExists=!\/etc\/hee\/maintenance\.lock/);
  assert.match(workflow, /Maintenance lock exists but exact SHA has no fully successful Production Migrations run; refusing unlock/);
  assert.match(workflow, /Maintenance lock disappeared before guarded unlock/);
  assert.match(workflow, /rollback_worker\(\)/);
  assert.match(workflow, /rollback_armed=true/);
  assert.match(workflow, /worker-cutover-rollback-proof: PASS restored/);
  assert.match(workflow, /worker-cutover-rollback-proof: CRITICAL FAIL/);
  assert.doesNotMatch(workflow, /restore_timer_if_safe/);
  assert.match(workflow, /rm -f \/etc\/hee\/maintenance\.lock/);
  assert.match(workflow, /test ! -e \/etc\/hee\/maintenance\.lock/);
  assert.match(workflow, /systemctl is-active --quiet hee-billing-renew\.timer/);

  const lifecycle = workflow.indexOf("Prove maintenance lifecycle before any possible worker unlock");
  const rollbackArm = workflow.indexOf("rollback_armed=true");
  const timerStop = workflow.indexOf("systemctl stop hee-billing-renew.timer", rollbackArm);
  const inactiveProof = workflow.indexOf("Billing timer remained active after stop", timerStop);
  const activate = workflow.indexOf('mv -Tf /srv/hee/current.next /srv/hee/current', inactiveProof);
  const unitProof = workflow.indexOf("ConditionPathExists=!/etc/hee/maintenance.lock", activate);
  const guardedLockProof = workflow.indexOf("Maintenance lock disappeared before guarded unlock", unitProof);
  const unlock = workflow.indexOf("rm -f /etc/hee/maintenance.lock", guardedLockProof);
  const timerStart = workflow.indexOf("systemctl start hee-billing-renew.timer", unlock);
  const successProof = workflow.indexOf("# Successful cutover proof. Rollback remains armed through every assertion here.", timerStart);
  const disarm = workflow.indexOf("rollback_armed=false", successProof);

  assert.ok(lifecycle >= 0 && rollbackArm > lifecycle, "release lifecycle proof must precede rollback arming");
  assert.ok(timerStop > rollbackArm, "timer mutation must occur only after rollback is armed");
  assert.ok(inactiveProof > timerStop, "timer inactivity must be proven before release activation");
  assert.ok(activate > inactiveProof, "worker release may activate only after timer quiescence");
  assert.ok(unitProof > activate, "maintenance-aware unit must be proven after exact worker activation");
  assert.ok(guardedLockProof > unitProof, "expected maintenance lock must be re-proven before unlock");
  assert.ok(unlock > guardedLockProof, "maintenance lock must be removed only after guarded lock proof");
  assert.ok(timerStart > unlock, "billing timer may start only after maintenance lock removal");
  assert.ok(successProof > timerStart, "successful cutover assertions must follow timer activation");
  assert.ok(disarm > successProof, "rollback must remain armed through successful cutover proof");
});
