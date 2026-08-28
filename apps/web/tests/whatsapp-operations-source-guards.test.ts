import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

test("WhatsApp operations service is maintenance-aware and hardened", () => {
  const service = source("../../ops/systemd/hee-whatsapp-operations.service");
  const timer = source("../../ops/systemd/hee-whatsapp-operations.timer");
  assert.match(service, /ConditionPathExists=!\/etc\/hee\/maintenance\.lock/);
  assert.match(service, /EnvironmentFile=\/srv\/hee\/current\/release\.env/);
  assert.match(service, /ExecStart=\/usr\/bin\/npm run whatsapp:operations/);
  assert.match(service, /NoNewPrivileges=true/);
  assert.match(service, /ProtectSystem=strict/);
  assert.match(timer, /OnUnitInactiveSec=15s/);
  assert.match(timer, /Unit=hee-whatsapp-operations\.service/);
});

test("operations migration constrains release provenance and sanitized errors", () => {
  const migration = source("prisma/migrations/20260828150000_whatsapp_operations_heartbeat/migration.sql");
  assert.match(migration, /WhatsAppOperationsHeartbeat_release_sha_check/);
  assert.match(migration, /\^\[0-9a-f\]\{40\}\$/);
  assert.match(migration, /WhatsAppOperationsHeartbeat_error_code_check/);
  assert.match(migration, /\^\[A-Z0-9_\]\{1,100\}\$/);
});

test("operations entrypoint is disabled by default and never logs provider errors", () => {
  const worker = source("app/lib/whatsapp/operations-worker.ts");
  const entrypoint = source("scripts/whatsapp-operations-worker.ts");
  assert.match(worker, /WHATSAPP_MARKETING_WORKER_ENABLED !== "true"/);
  assert.match(worker, /WHATSAPP_RELEASE_SHA_REQUIRED/);
  assert.match(worker, /shell: false/);
  assert.doesNotMatch(worker, /console\.(log|error)/);
  assert.match(entrypoint, /errorCode:/);
  assert.match(source("scripts/whatsapp-automation-worker.ts"), /await db\.\$disconnect\(\)/);
  assert.match(source("scripts/whatsapp-campaign-scheduler.ts"), /finally \{[\s\S]*await db\.\$disconnect\(\)/);
});

test("exact-SHA worker deployment installs, quiesces, verifies and rolls back WhatsApp units", () => {
  const deployment = source("../../.github/workflows/production-worker-deploy.yml");
  const maintenance = source("../../.github/workflows/production-enter-maintenance.yml");
  const migrations = source("../../.github/workflows/production-migrations.yml");
  const preflight = source("../../.github/workflows/production-preflight-v2.yml");
  assert.match(deployment, /previous_whatsapp_units=false/);
  assert.match(deployment, /systemctl stop hee-whatsapp-operations\.timer/);
  assert.match(deployment, /systemctl is-active --quiet hee-whatsapp-operations\.service/);
  assert.match(deployment, /install .*hee-whatsapp-operations\.service .*\/etc\/systemd\/system\/hee-whatsapp-operations\.service/);
  assert.match(deployment, /systemctl enable hee-whatsapp-operations\.timer/);
  assert.match(deployment, /systemctl is-active --quiet hee-whatsapp-operations\.timer/);
  assert.match(maintenance, /disable --now hee-whatsapp-operations\.timer/);
  assert.match(maintenance, /WhatsApp operations cycle did not finish within 15 minutes/);
  assert.match(migrations, /if sudo -n systemctl is-active --quiet hee-whatsapp-operations\.service/);
  assert.match(preflight, /Installed WhatsApp units have no managed rollback release/);
});
