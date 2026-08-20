import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("production migrations stay manually gated to the release branch", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /APPLY_PRODUCTION_MIGRATIONS/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /environment: production/);
});

test("production migrations verify an encrypted recovery backup before deploy", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  const verifyIndex = workflow.indexOf("Verify encrypted recovery backup before deploy");
  const migrateIndex = workflow.indexOf("Apply pending migrations");
  assert.ok(verifyIndex >= 0, "encrypted backup verification step must exist");
  assert.ok(migrateIndex > verifyIndex, "backup verification must run before migrations");
  assert.match(workflow, /openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000/);
  assert.match(workflow, /pg_restore --list/);
  assert.match(workflow, /retention-days: 7/);
});
