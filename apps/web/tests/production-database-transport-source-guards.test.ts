import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

const validator = "require-production-database-safety.mjs";

function assertGuardPrecedes(workflow: string, dangerousToken: string) {
  const guardIndex = workflow.indexOf(validator);
  const dangerousIndex = workflow.indexOf(dangerousToken);
  assert.ok(guardIndex >= 0, `${validator} must be present`);
  assert.ok(dangerousIndex >= 0, `${dangerousToken} must be present`);
  assert.ok(guardIndex < dangerousIndex, `${validator} must run before ${dangerousToken}`);
}

test("shared production DB validator rejects weak and ambiguous TLS configuration", () => {
  const guard = source("../../.github/scripts/require-production-database-safety.mjs");
  assert.match(guard, /searchParams\.getAll\("sslmode"\)/);
  assert.match(guard, /sslModes\.length > 1/);
  assert.match(guard, /must contain at most one sslmode parameter/);
  assert.match(guard, /sslMode !== "verify-full"/);
});

test("runtime database URL normalization rejects ambiguous duplicate sslmode", () => {
  const runtime = source("lib/database-url.ts");
  assert.match(runtime, /searchParams\.getAll\("sslmode"\)/);
  assert.match(runtime, /sslModes\.length > 1/);
  assert.match(runtime, /must contain at most one sslmode parameter/);
});

test("preflight requires verify-full before its first PostgreSQL probe", () => {
  const workflow = source("../../.github/workflows/production-preflight.yml");
  assert.match(workflow, /DATABASE_URL RESTORE_DATABASE_URL/);
  assert.match(workflow, /searchParams\.getAll\('sslmode'\)/);
  assert.match(workflow, /sslModes\.length > 1/);
  assert.match(workflow, /ssl !== 'verify-full'/);
  assertGuardPrecedes(workflow, 'psql "$DATABASE_URL"');
});

test("scheduled backup requires verify-full before pg_dump and restore mutation", () => {
  const workflow = source("../../.github/workflows/production-backup-proof.yml");
  assert.match(workflow, /DATABASE_URL RESTORE_DATABASE_URL/);
  assertGuardPrecedes(workflow, 'pg_dump "$DATABASE_URL"');
  assertGuardPrecedes(workflow, 'DROP SCHEMA IF EXISTS public CASCADE');
});

test("production migrations require verify-full before Prisma, backup and restore tooling", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  assert.match(workflow, /DATABASE_URL RESTORE_DATABASE_URL/);
  assertGuardPrecedes(workflow, "npx prisma migrate status");
  assertGuardPrecedes(workflow, 'pg_dump "$DATABASE_URL"');
  assertGuardPrecedes(workflow, 'DROP SCHEMA IF EXISTS public CASCADE');
  assertGuardPrecedes(workflow, "npx prisma migrate deploy");
});

test("production web deploy and final readiness require verify-full before Prisma CLI", () => {
  for (const path of [
    "../../.github/workflows/production-deploy.yml",
    "../../.github/workflows/production-launch-readiness.yml",
  ]) {
    const workflow = source(path);
    assert.match(workflow, /require-production-database-safety\.mjs DATABASE_URL/);
    assertGuardPrecedes(workflow, "npx prisma migrate status");
  }
});

test("launch configuration contract accepts only one explicit verify-full mode", () => {
  const audit = source("scripts/launch-config-audit.ts");
  assert.match(audit, /searchParams\.getAll\("sslmode"\)/);
  assert.match(audit, /sslModes\.length > 1/);
  assert.match(audit, /must contain at most one sslmode parameter/);
  assert.match(audit, /sslMode !== "verify-full"/);
  assert.match(audit, /all production operational tooling enforce certificate and hostname verification consistently/);
  assert.doesNotMatch(audit, /new Set\(\["verify-full", "verify-ca", "require", "prefer"\]\)/);
});
