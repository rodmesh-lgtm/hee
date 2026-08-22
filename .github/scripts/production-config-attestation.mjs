import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const VERSION = 1;

const releaseCoreKeys = [
  "DATABASE_URL",
  "PG_POOL_MAX",
  "RESEND_API_KEY",
  "HEE_FROM_EMAIL",
  "MOYASAR_PUBLISHABLE_KEY",
  "MOYASAR_SECRET_KEY",
  "MOYASAR_WEBHOOK_SECRET",
  "BILLING_TOKEN_ENCRYPTION_KEY",
  "BILLING_SELLER_LEGAL_NAME_AR",
  "BILLING_SELLER_ADDRESS_AR",
  "BILLING_TAX_STATUS",
  "BILLING_RENEWAL_ENABLED",
  "BILLING_OPERATIONS_READY",
  "PAID_CHECKOUT_PUBLIC_ENABLED",
  "BILLING_REHEARSAL_USER_EMAIL",
  "STORAGE_DRIVER",
  "S3_ENDPOINT",
  "S3_REGION",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_FORCE_PATH_STYLE",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "APPLE_CLIENT_ID",
  "APPLE_TEAM_ID",
  "APPLE_KEY_ID",
  "APPLE_PRIVATE_KEY",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
];

const migrationCoreKeys = [
  "DATABASE_URL",
  "RESTORE_DATABASE_URL",
];

const workerHostKeys = [
  "HETZNER_HOST",
  "HETZNER_USER",
  "HETZNER_KNOWN_HOSTS",
];

function required(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required for Production configuration attestation`);
  return value;
}

function releaseSha() {
  const sha = required("GITHUB_SHA").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("GITHUB_SHA must be a 40-character Git SHA");
  return sha;
}

function canonicalPayload(scope, keys) {
  const values = Object.fromEntries(keys.map((key) => [key, String(process.env[key] ?? "").trim()]));
  return JSON.stringify({ version: VERSION, scope, releaseSha: releaseSha(), values });
}

function digest(scope) {
  if (scope === "release-core") {
    return createHmac("sha256", required("SESSION_SECRET"))
      .update(canonicalPayload(scope, releaseCoreKeys))
      .digest("hex");
  }
  if (scope === "migration-core") {
    return createHmac("sha256", required("PRODUCTION_BACKUP_PASSPHRASE"))
      .update(canonicalPayload(scope, migrationCoreKeys))
      .digest("hex");
  }
  if (scope === "worker-host") {
    return createHmac("sha256", required("HETZNER_SSH_PRIVATE_KEY"))
      .update(canonicalPayload(scope, workerHostKeys))
      .digest("hex");
  }
  throw new Error(`Unsupported attestation scope: ${scope}`);
}

function equalHex(left, right) {
  if (!/^[0-9a-f]{64}$/.test(left) || !/^[0-9a-f]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

async function writeAttestation(path) {
  const body = {
    version: VERSION,
    releaseSha: releaseSha(),
    digests: {
      "release-core": digest("release-core"),
      "migration-core": digest("migration-core"),
      "worker-host": digest("worker-host"),
    },
  };
  await writeFile(path, `${JSON.stringify(body)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`production-config-attestation: WRITE PASS release=${body.releaseSha} scopes=3`);
}

async function verifyAttestation(scope, path) {
  const body = JSON.parse(await readFile(path, "utf8"));
  if (body?.version !== VERSION) throw new Error("Unsupported Production attestation version");
  if (String(body?.releaseSha ?? "").toLowerCase() !== releaseSha()) {
    throw new Error("Production attestation belongs to a different release SHA");
  }
  const expected = String(body?.digests?.[scope] ?? "").toLowerCase();
  const current = digest(scope);
  if (!equalHex(expected, current)) {
    throw new Error(`Production ${scope} configuration changed after the successful Preflight attestation`);
  }
  console.log(`production-config-attestation: VERIFY PASS scope=${scope} release=${releaseSha()}`);
}

const [mode, arg1, arg2] = process.argv.slice(2);
try {
  if (mode === "write" && arg1) await writeAttestation(arg1);
  else if (mode === "verify" && arg1 && arg2) await verifyAttestation(arg1, arg2);
  else throw new Error("Usage: production-config-attestation.mjs write <path> | verify <scope> <path>");
} catch (error) {
  console.error("production-config-attestation: FAIL", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
