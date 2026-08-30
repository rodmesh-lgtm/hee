import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const script = resolve(process.cwd(), "../../.github/scripts/production-config-attestation.mjs");
const sha = "a".repeat(40);

function baseEnv() {
  return {
    ...process.env,
    GITHUB_SHA: sha,
    SESSION_SECRET: "session-secret-" + "s".repeat(40),
    PRODUCTION_BACKUP_PASSPHRASE: "backup-passphrase-" + "b".repeat(40),
    HETZNER_SSH_PRIVATE_KEY: "private-key-material-" + "k".repeat(40),
    DATABASE_URL: "postgresql://hee:secret@db.example.com:5432/hee?sslmode=verify-full",
    RESTORE_DATABASE_URL: "postgresql://hee:secret@restore.example.com:5432/hee_restore?sslmode=verify-full",
    PG_POOL_MAX: "2",
    RESEND_API_KEY: "re_live_example",
    HEE_FROM_EMAIL: "HEE <noreply@ir.sa>",
    MOYASAR_PUBLISHABLE_KEY: "pk_live_example",
    MOYASAR_SECRET_KEY: "sk_live_example",
    MOYASAR_WEBHOOK_SECRET: "webhook-secret-example-123456789",
    BILLING_TOKEN_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
    BILLING_SELLER_LEGAL_NAME_AR: "HEE",
    BILLING_SELLER_ADDRESS_AR: "Riyadh",
    BILLING_TAX_STATUS: "not_registered",
    BILLING_RENEWAL_ENABLED: "false",
    BILLING_OPERATIONS_READY: "false",
    PAID_CHECKOUT_PUBLIC_ENABLED: "false",
    BILLING_REHEARSAL_USER_EMAIL: "",
    STORAGE_DRIVER: "database",
    S3_ENDPOINT: "",
    S3_REGION: "",
    S3_BUCKET: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    S3_FORCE_PATH_STYLE: "",
    GOOGLE_CLIENT_ID: "hee-production.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "google-production-secret-example",
    APPLE_CLIENT_ID: "sa.hee.web",
    APPLE_TEAM_ID: "ABCDE12345",
    APPLE_KEY_ID: "FGHIJ67890",
    APPLE_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----\nTEST-ONLY-PKCS8-MATERIAL\n-----END PRIVATE KEY-----",
    VERCEL_TOKEN: "vercel-token",
    VERCEL_ORG_ID: "team_test",
    VERCEL_PROJECT_ID: "prj_test",
    HETZNER_HOST: "worker.example.com",
    HETZNER_USER: "deploy",
    HETZNER_KNOWN_HOSTS: "worker.example.com ssh-ed25519 AAAATEST",
  };
}

function run(args: string[], env: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [script, ...args], {
    env,
    encoding: "utf8",
  });
}

test("web-only Production attestation excludes worker-host while detecting release and migration drift", () => {
  const dir = mkdtempSync(join(tmpdir(), "hee-attestation-web-"));
  const path = join(dir, "attestation.json");
  try {
    const env = baseEnv();
    const written = run(["write", path], env);
    assert.equal(written.status, 0, written.stderr);
    assert.doesNotMatch(written.stdout, /postgresql:\/\//);
    assert.doesNotMatch(written.stdout, /private-key-material/);

    const body = JSON.parse(readFileSync(path, "utf8"));
    assert.deepEqual(Object.keys(body.digests).sort(), ["migration-core", "release-core"]);

    for (const scope of ["release-core", "migration-core"]) {
      const verified = run(["verify", scope, path], env);
      assert.equal(verified.status, 0, `${scope}: ${verified.stderr}`);
    }

    const rotatedDatabaseCredentials = {
      ...env,
      DATABASE_URL: "postgresql://rotated-user:rotated-secret@db.example.com:5432/hee?sslmode=verify-full&api_key=rotated-token",
      RESTORE_DATABASE_URL: "postgresql://rotated-user:rotated-secret@restore.example.com:5432/hee_restore?api_key=rotated-token&sslmode=verify-full",
    };
    assert.equal(run(["verify", "release-core", path], rotatedDatabaseCredentials).status, 0);
    assert.equal(run(["verify", "migration-core", path], rotatedDatabaseCredentials).status, 0);

    assert.notEqual(run(["verify", "worker-host", path], env).status, 0);

    const releaseDrift = { ...env, HEE_FROM_EMAIL: "Other <other@ir.sa>" };
    assert.notEqual(run(["verify", "release-core", path], releaseDrift).status, 0);
    assert.equal(run(["verify", "migration-core", path], releaseDrift).status, 0);

    const migrationDrift = {
      ...env,
      RESTORE_DATABASE_URL: "postgresql://hee:secret@restore2.example.com:5432/hee_restore?sslmode=verify-full",
    };
    assert.notEqual(run(["verify", "migration-core", path], migrationDrift).status, 0);
    assert.equal(run(["verify", "release-core", path], migrationDrift).status, 0);

    const shaDrift = { ...env, GITHUB_SHA: "b".repeat(40) };
    for (const scope of ["release-core", "migration-core"]) {
      assert.notEqual(run(["verify", scope, path], shaDrift).status, 0);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("billing-enabled Production attestation includes worker-host and detects worker drift", () => {
  const dir = mkdtempSync(join(tmpdir(), "hee-attestation-worker-"));
  const path = join(dir, "attestation.json");
  try {
    const env = { ...baseEnv(), BILLING_RENEWAL_ENABLED: "true" };
    const written = run(["write", path], env);
    assert.equal(written.status, 0, written.stderr);

    const body = JSON.parse(readFileSync(path, "utf8"));
    assert.deepEqual(Object.keys(body.digests).sort(), ["migration-core", "release-core", "worker-host"]);

    for (const scope of ["release-core", "migration-core", "worker-host"]) {
      const verified = run(["verify", scope, path], env);
      assert.equal(verified.status, 0, `${scope}: ${verified.stderr}`);
    }

    const workerDrift = { ...env, HETZNER_HOST: "other-worker.example.com" };
    assert.notEqual(run(["verify", "worker-host", path], workerDrift).status, 0);
    assert.equal(run(["verify", "release-core", path], workerDrift).status, 0);

    const shaDrift = { ...env, GITHUB_SHA: "b".repeat(40) };
    for (const scope of ["release-core", "migration-core", "worker-host"]) {
      assert.notEqual(run(["verify", scope, path], shaDrift).status, 0);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
