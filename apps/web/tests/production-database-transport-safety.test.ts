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

test("managed HEE Neon host is forcibly isolated from unrelated neondb schema", () => {
  const dir = mkdtempSync(join(tmpdir(), "hee-production-db-routing-"));
  const githubEnv = join(dir, "github-env");
  try {
    const result = run(
      {
        DATABASE_URL: "postgresql://user:secret@ep-aged-breeze-ap1lcdcz-pooler.c-7.us-east-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require",
        RESTORE_DATABASE_URL: "postgresql://ignored:ignored@restore.example.com/wrong?sslmode=prefer",
        GITHUB_ENV: githubEnv,
      },
      ["DATABASE_URL", "RESTORE_DATABASE_URL"],
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /production-database-routing: PASS source=hee_production restore=hee_restore_production/);
    const persisted = readFileSync(githubEnv, "utf8");
    assert.match(persisted, /DATABASE_URL=postgresql:\/\/user:secret@ep-aged-breeze-ap1lcdcz-pooler\.c-7\.us-east-1\.aws\.neon\.tech\/hee_production\?/);
    assert.match(persisted, /RESTORE_DATABASE_URL=postgresql:\/\/user:secret@ep-aged-breeze-ap1lcdcz-pooler\.c-7\.us-east-1\.aws\.neon\.tech\/hee_restore_production\?/);
    assert.doesNotMatch(persisted, /\/neondb(?:\?|\n|$)/);
    assert.match(persisted, /sslmode=verify-full/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("production database safety rejects local and restore-shaped production sources", () => {
  const local = run({ DATABASE_URL: "postgresql://user:secret@127.0.0.1:5432/hee_prod?sslmode=verify-full" });
  assert.notEqual(local.status, 0);
  assert.match(local.stderr, /must not point to a local host/);

  const restoreAsSource = run({ DATABASE_URL: "postgresql://user:secret@db.example.com:5432/hee_restore_prod?sslmode=verify-full" });
  assert.notEqual(restoreAsSource.status, 0);
  assert.match(restoreAsSource.stderr, /must target the production database/);
});
