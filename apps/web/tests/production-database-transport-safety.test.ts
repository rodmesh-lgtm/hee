import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { normalizePostgresDatabaseUrl } from "../lib/database-url";

const script = resolve(process.cwd(), "../../.github/scripts/require-production-database-safety.mjs");

function run(env: Record<string, string>, args = ["DATABASE_URL"]) {
  return spawnSync(process.execPath, [script, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

const source = "postgresql://user:secret@db.example.com:5432/hee_prod?sslmode=verify-full";
const restore = "postgresql://user:secret@restore.example.com:5432/hee_restore_prod?sslmode=verify-full";
const managedHeeHost = "hee-prod.example.com";
const unrelatedNeonHost = "ep-delicate-wave-apf0pirn-pooler.c-7.us-east-1.aws.neon.tech";

test("production database safety accepts only explicit verify-full source transport", () => {
  const ok = run({ DATABASE_URL: source });
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /sslmode=verify-full/);

  for (const mode of ["prefer", "require", "verify-ca", "disable", ""]) {
    const url = `postgresql://user:secret@db.example.com:5432/hee_prod${mode ? `?sslmode=${mode}` : ""}`;
    const result = run({ DATABASE_URL: url });
    assert.notEqual(result.status, 0, `sslmode=${mode || "missing"} must fail`);
    assert.match(result.stderr, /must use sslmode=verify-full/);
  }
});

test("production database safety rejects ambiguous duplicate sslmode parameters", () => {
  const result = run({
    DATABASE_URL: "postgresql://user:secret@db.example.com:5432/hee_prod?sslmode=verify-full&sslmode=disable",
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must contain at most one sslmode parameter/);
});

test("runtime database URL normalization also rejects duplicate sslmode parameters", () => {
  assert.throws(
    () => normalizePostgresDatabaseUrl("postgresql://user:secret@db.example.com:5432/hee_prod?sslmode=verify-full&sslmode=disable"),
    /must contain at most one sslmode parameter/,
  );
  assert.match(
    normalizePostgresDatabaseUrl("postgresql://user:secret@db.example.com:5432/hee_prod?sslmode=require"),
    /sslmode=verify-full/,
  );
});

test("production database safety validates isolated restore transport and naming", () => {
  const ok = run({ DATABASE_URL: source, RESTORE_DATABASE_URL: restore }, ["DATABASE_URL", "RESTORE_DATABASE_URL"]);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /source \+ isolated restore/);

  const weakRestore = run(
    { DATABASE_URL: source, RESTORE_DATABASE_URL: "postgresql://user:secret@restore.example.com:5432/hee_restore_prod?sslmode=prefer" },
    ["DATABASE_URL", "RESTORE_DATABASE_URL"],
  );
  assert.notEqual(weakRestore.status, 0);
  assert.match(weakRestore.stderr, /RESTORE_DATABASE_URL must use sslmode=verify-full/);

  const wrongRestoreName = run(
    { DATABASE_URL: source, RESTORE_DATABASE_URL: "postgresql://user:secret@restore.example.com:5432/hee_prod_copy?sslmode=verify-full" },
    ["DATABASE_URL", "RESTORE_DATABASE_URL"],
  );
  assert.notEqual(wrongRestoreName.status, 0);
  assert.match(wrongRestoreName.stderr, /restore database name must begin with hee_restore/);
});

test("configured HEE Production host is forcibly isolated from unrelated neondb database", () => {
  const dir = mkdtempSync(join(tmpdir(), "hee-production-db-routing-"));
  const githubEnv = join(dir, "github-env");
  try {
    const result = run(
      {
        DATABASE_URL: `postgresql://user:secret@${managedHeeHost}/neondb?channel_binding=require&sslmode=require`,
        RESTORE_DATABASE_URL: "postgresql://ignored:ignored@restore.example.com/wrong?sslmode=prefer",
        EXPECTED_PRODUCTION_DB_HOST: managedHeeHost,
        GITHUB_ENV: githubEnv,
      },
      ["DATABASE_URL", "RESTORE_DATABASE_URL"],
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /production-database-routing: PASS source=hee_production restore=hee_restore_production/);
    const persisted = readFileSync(githubEnv, "utf8");
    assert.match(persisted, new RegExp(`DATABASE_URL=postgresql:\\/\\/user:secret@${managedHeeHost.replaceAll(".", "\\.")}\\/hee_production\\?`));
    assert.match(persisted, new RegExp(`RESTORE_DATABASE_URL=postgresql:\\/\\/user:secret@${managedHeeHost.replaceAll(".", "\\.")}\\/hee_restore_production\\?`));
    assert.doesNotMatch(persisted, /\/neondb(?:\?|\n|$)/);
    assert.match(persisted, /sslmode=verify-full/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("Prisma Postgres accepts only explicit direct source and restore credentials", () => {
  const sourceDirect = "postgresql://production_user:production_secret@db.prisma.io:5432/?sslmode=require";
  const restoreDirect = "postgresql://restore_user:restore_secret@db.prisma.io:5432/?sslmode=require";
  const dir = mkdtempSync(join(tmpdir(), "hee-prisma-postgres-direct-"));
  try {
    const result = run(
      {
        DATABASE_URL: sourceDirect,
        RESTORE_DATABASE_URL: restoreDirect,
        EXPECTED_PRODUCTION_DB_HOST: "db.prisma.io",
        // The production guard deliberately persists its canonical URL to
        // GITHUB_ENV. Never let this subprocess write into the CI job's real
        // environment file, or later Playwright steps inherit test credentials.
        GITHUB_ENV: join(dir, "github-env"),
      },
      ["DATABASE_URL", "RESTORE_DATABASE_URL"],
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /explicit Prisma Postgres direct source and restore credentials/);

    const sameCredential = run(
      {
        DATABASE_URL: sourceDirect,
        RESTORE_DATABASE_URL: sourceDirect,
        EXPECTED_PRODUCTION_DB_HOST: "db.prisma.io",
        GITHUB_ENV: join(dir, "github-env-same"),
      },
      ["DATABASE_URL", "RESTORE_DATABASE_URL"],
    );
    assert.notEqual(sameCredential.status, 0);
    assert.match(sameCredential.stderr, /resolve to the same PostgreSQL database identity/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("unrelated Neon project host is rejected even with verify-full", () => {
  const unrelated = run({
    DATABASE_URL: `postgresql://user:secret@${unrelatedNeonHost}/hee_production?sslmode=verify-full`,
    EXPECTED_PRODUCTION_DB_HOST: managedHeeHost,
  });
  assert.notEqual(unrelated.status, 0);
  assert.match(unrelated.stderr, /must target EXPECTED_PRODUCTION_DB_HOST/);
});

test("legacy managed Neon endpoint is not silently canonicalized", () => {
  const legacy = run({
    DATABASE_URL: "postgresql://user:secret@ep-aged-breeze-ap1lcdcz-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require",
  });
  assert.notEqual(legacy.status, 0);
  assert.match(legacy.stderr, /must use sslmode=verify-full/);
});

test("production database safety rejects local and restore-shaped production sources", () => {
  const local = run({ DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/hee_prod?sslmode=verify-full" });
  assert.notEqual(local.status, 0);
  assert.match(local.stderr, /must not point to a local host/);

  const restoreAsSource = run({ DATABASE_URL: "postgresql://user:secret@db.example.com:5432/hee_restore_prod?sslmode=verify-full" });
  assert.notEqual(restoreAsSource.status, 0);
  assert.match(restoreAsSource.stderr, /must target the production database/);
});
