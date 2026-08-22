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

test("production billing scheduler is versioned, single-shot and runs every 30 minutes", () => {
  const service = source("../../ops/systemd/hee-billing-renew.service");
  const timer = source("../../ops/systemd/hee-billing-renew.timer");

  assert.match(service, /Type=oneshot/);
  assert.match(service, /User=hee/);
  assert.match(service, /WorkingDirectory=\/srv\/hee\/apps\/web/);
  assert.match(service, /EnvironmentFile=\/etc\/hee\/production\.env/);
  assert.match(service, /ExecStart=\/usr\/bin\/npm run billing:renew/);
  assert.match(service, /NoNewPrivileges=true/);
  assert.match(service, /ProtectSystem=strict/);
  assert.match(timer, /OnCalendar=\*:0\/30/);
  assert.match(timer, /Persistent=true/);
  assert.match(timer, /Unit=hee-billing-renew\.service/);
});
