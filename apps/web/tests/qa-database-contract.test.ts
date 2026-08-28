import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { EXPECTED_PREVIEW_LATEST_MIGRATION, EXPECTED_PREVIEW_MIGRATIONS } from "../app/lib/qa-database-contract";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "../prisma/migrations");

function repositoryMigrations() {
  return readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_[A-Za-z0-9_]+$/.test(name))
    .filter((name) => statSync(join(migrationsDir, name)).isDirectory())
    .sort();
}

test("Preview database readiness contract contains every PostgreSQL migration", () => {
  const actual = repositoryMigrations();
  assert.deepEqual([...EXPECTED_PREVIEW_MIGRATIONS].sort(), actual);
  assert.equal(EXPECTED_PREVIEW_MIGRATIONS.length, actual.length);
  assert.equal(EXPECTED_PREVIEW_LATEST_MIGRATION, actual.at(-1));
});

test("Preview readiness contract includes registration and billing schema boundaries", () => {
  assert.ok(EXPECTED_PREVIEW_MIGRATIONS.includes("20260820110000_legal_consent_audit"));
  assert.ok(EXPECTED_PREVIEW_MIGRATIONS.includes("20260821114500_user_email_verification"));
  assert.ok(EXPECTED_PREVIEW_MIGRATIONS.includes("20260822050000_billing_operations_heartbeat"));
  assert.ok(EXPECTED_PREVIEW_MIGRATIONS.includes("20260828150000_whatsapp_operations_heartbeat"));
});
