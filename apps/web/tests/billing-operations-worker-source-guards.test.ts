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

test("production billing scheduler is versioned, single-shot, release-pinned and runs every 30 minutes", () => {
  const service = source("../../ops/systemd/hee-billing-renew.service");
  const timer = source("../../ops/systemd/hee-billing-renew.timer");

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

test("production worker deploy requires exact release gates and performs an atomic cutover without killing a running cycle", () => {
  const workflow = source("../../.github/workflows/production-worker-deploy.yml");
  assert.match(workflow, /DEPLOY_EXACT_BILLING_WORKER/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /rc-quality\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /production-preflight\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /production-deploy\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /PRODUCTION_HETZNER_KNOWN_HOSTS/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /git archive --format=tar "\$GITHUB_SHA"/);
  assert.match(workflow, /node -p 'process\.versions\.node\.split/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npx prisma generate/);
  assert.match(workflow, /npm run typecheck/);
  assert.match(workflow, /systemctl stop hee-billing-renew\.timer/);
  assert.doesNotMatch(workflow, /systemctl stop hee-billing-renew\.service/);
  assert.match(workflow, /Existing billing cycle did not finish within 20 minutes/);
  assert.match(workflow, /ln -sfn "releases\/\$\{sha\}" \/srv\/hee\/current\.next/);
  assert.match(workflow, /mv -Tf \/srv\/hee\/current\.next \/srv\/hee\/current/);
  assert.match(workflow, /RELEASE_SHA=%s/);
  assert.match(workflow, /systemctl is-active --quiet hee-billing-renew\.timer/);
});
