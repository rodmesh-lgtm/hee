import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production migrations require exact release quality and explicit confirmation", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  assert.match(workflow, /APPLY_PRODUCTION_MIGRATIONS/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /conclusion == "success"/);
  assert.match(workflow, /npx prisma migrate deploy/);
  assert.doesNotMatch(workflow, /prisma db push/);
});

test("production migration executions are serialized", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  assert.match(workflow, /concurrency:/);
  assert.match(workflow, /group: production-database-migrations/);
  assert.match(workflow, /cancel-in-progress: false/);
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
  assert.match(proof, /ROW_TO_JSON/);
  assert.match(proof, /STRING_AGG/);
  assert.match(proof, /digest/);
  assert.match(proof, /checksum/);
  assert.match(proof, /Backup restore Prisma migration history does not exactly match production source/);
  assert.match(proof, /_prisma_migrations/);
});

test("scheduled production backups are encrypted, retained, and restore-tested", () => {
  const workflow = source("../../.github/workflows/production-backup-proof.yml");
  assert.match(workflow, /cron: "17 2 \* \* \*"/);
  assert.match(workflow, /pg_dump/);
  assert.match(workflow, /openssl enc -aes-256-cbc -pbkdf2/);
  assert.match(workflow, /pg_restore --dbname="\$RESTORE_DATABASE_URL" --clean --if-exists/);
  assert.match(workflow, /npm run backup:production-proof/);
  assert.match(workflow, /retention-days: 14/);
});
