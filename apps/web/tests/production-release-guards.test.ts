import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production migrations stay manually gated to the release branch with writes paused", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /APPLY_PRODUCTION_MIGRATIONS/);
  assert.match(workflow, /PRODUCTION_WRITES_PAUSED/);
  assert.match(workflow, /inputs\.writes_paused_confirmation == 'PRODUCTION_WRITES_PAUSED'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /environment: production/);
});

test("production migrations verify and restore an encrypted recovery backup before deploy", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  const decryptIndex = workflow.indexOf("Verify encrypted backup can be decrypted and parsed");
  const restoreIndex = workflow.indexOf("Restore exact pre-migration backup into isolated database");
  const proofIndex = workflow.indexOf("npm run backup:production-proof");
  const migrateIndex = workflow.indexOf("Apply pending migrations");

  assert.ok(decryptIndex >= 0, "encrypted backup decrypt/parse verification step must exist");
  assert.ok(restoreIndex > decryptIndex, "restore must run after encrypted backup verification");
  assert.ok(proofIndex > restoreIndex, "restore proof must run after isolated restore");
  assert.ok(migrateIndex > proofIndex, "verified restore proof must complete before migrations");

  assert.match(workflow, /openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000/);
  assert.match(workflow, /pg_restore --list/);
  assert.match(workflow, /pg_restore --dbname="\$RESTORE_DATABASE_URL" --clean --if-exists/);
  assert.match(workflow, /npm run backup:production-proof/);
  assert.match(workflow, /retention-days: 14/);
});
