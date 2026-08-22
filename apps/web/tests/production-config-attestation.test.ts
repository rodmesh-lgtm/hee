import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
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
    HEE_FROM_EMAIL: "HEE <noreply@hee.sa>",
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
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    APPLE_CLIENT_ID: "",
    APPLE_TEAM_ID: "",
    APPLE_KEY_ID: "",
    APPLE_PRIVATE_KEY: "",
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

test("scoped Production attestation detects drift without exposing values", () => {
  const dir = mkdtempSync(join(tmpdir(), "hee-attestation-"));
  const path = join(dir, "attestation.json");
  try {
    const env = baseEnv();
    const written = run(["write", path], env);
    assert.equal(written.status, 0, written.stderr);
    assert.doesNotMatch(written.stdout, /postgresql:\/\//);
    assert.doesNotMatch(written.stdout, /private-key-material/);

    for (const scope of ["release-core", "migration-core", "worker-host"]) {
      const verified = run(["verify", scope, path], env);
      assert.equal(verified.status, 0, `${scope}: ${verified.stderr}`);
    }

    const releaseDrift = { ...env, HEE_FROM_EMAIL: "Other <other@hee.sa>" };
    assert.notEqual(run(["verify", "release-core", path], releaseDrift).status, 0);
    assert.equal(run(["verify", "migration-core", path], releaseDrift).status, 0);
    assert.equal(run(["verify", "worker-host", path], releaseDrift).status, 0);

    const migrationDrift = {
      ...env,
      RESTORE_DATABASE_URL: "postgresql://hee:secret@restore2.example.com:5432/hee_restore?sslmode=verify-full",
    };
    assert.notEqual(run(["verify", "migration-core", path], migrationDrift).status, 0);
    assert.equal(run(["verify", "release-core", path], migrationDrift).status, 0);

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
