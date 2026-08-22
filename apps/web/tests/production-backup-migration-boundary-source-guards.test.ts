import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production migrations require exact release quality, explicit confirmation, and paused writes", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  assert.match(workflow, /APPLY_PRODUCTION_MIGRATIONS/);
  assert.match(workflow, /PRODUCTION_WRITES_PAUSED/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /conclusion == "success"/);
  assert.match(workflow, /npx prisma migrate deploy/);
  assert.doesNotMatch(workflow, /prisma db push/);
});

test("all production restore-database maintenance is serialized through one lock", () => {
  const migration = source("../../.github/workflows/production-migrations.yml");
  const backup = source("../../.github/workflows/production-backup-proof.yml");
  for (const workflow of [migration, backup]) {
    assert.match(workflow, /concurrency:/);
    assert.match(workflow, /group: production-database-maintenance/);
    assert.match(workflow, /cancel-in-progress: false/);
  }
});

test("production migration restores and proves the exact pre-migration backup before deploy", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  const proof = source("scripts/production-backup-restore-proof.ts");
  assert.match(workflow, /PRODUCTION_RESTORE_DATABASE_URL/);
  assert.match(workflow, /Restore exact pre-migration backup into isolated database/);
  assert.match(workflow, /npm run backup:production-proof/);
  assert.ok(workflow.indexOf("npm run backup:production-proof") < workflow.indexOf("npx prisma migrate deploy"));
  assert.match(proof, /Restore proof refuses identical source and restore URLs/);
  assert.match(proof, /hee_restore/);
  assert.match(proof, /BillingPayment/);
  assert.match(proof, /BillingCheckoutConsent/);
  assert.match(proof, /BillingOperationsHeartbeat/);
  assert.match(proof, /tableExists/);
  assert.match(proof, /exists: false/);
  assert.match(proof, /ROW_TO_JSON/);
  assert.match(proof, /STRING_AGG/);
  assert.match(proof, /digest/);
  assert.match(proof, /checksum/);
  assert.match(proof, /Backup restore Prisma migration history does not exactly match production source/);
  assert.match(proof, /_prisma_migrations/);
});

test("production migration proves pre-existing critical row data is unchanged after deploy", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  const proof = source("scripts/production-migration-data-proof.ts");
  const capture = "migration:production-data-proof -- --capture";
  const deploy = "npx prisma migrate deploy";
  const verify = "migration:production-data-proof -- --verify";

  assert.match(workflow, /Capture pre-migration critical data fingerprint/);
  assert.match(workflow, /Prove critical data unchanged after deploy/);
  assert.ok(workflow.indexOf(capture) < workflow.indexOf(deploy), "critical data fingerprint must be captured before deploy");
  assert.ok(workflow.indexOf(verify) > workflow.indexOf(deploy), "critical data fingerprint must be verified after deploy");
  assert.match(proof, /row_to_json/);
  assert.match(proof, /fingerprint/);
  assert.match(proof, /BillingPayment/);
  assert.match(proof, /BillingOperationsHeartbeat/);
  assert.match(proof, /if \(!before\.exists\) continue/);
  assert.match(proof, /Critical data changed during production migration/);
});

test("scheduled production backups are encrypted, retained, restore-tested, and reject local sources", () => {
  const workflow = source("../../.github/workflows/production-backup-proof.yml");
  assert.match(workflow, /cron: "17 2 \* \* \*"/);
  assert.match(workflow, /pg_dump/);
  assert.match(workflow, /openssl enc -aes-256-cbc -pbkdf2/);
  assert.match(workflow, /pg_restore --dbname="\$RESTORE_DATABASE_URL" --clean --if-exists/);
  assert.match(workflow, /npm run backup:production-proof/);
  assert.match(workflow, /retention-days: 14/);
  assert.match(workflow, /Production source must not be local/);
});
