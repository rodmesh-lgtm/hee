import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const VERSION = 2;

const releaseCoreKeys = [
  "DATABASE_URL", "PG_POOL_MAX", "RESEND_API_KEY", "HEE_FROM_EMAIL",
  "MOYASAR_PUBLISHABLE_KEY", "MOYASAR_SECRET_KEY", "MOYASAR_WEBHOOK_SECRET",
  "BILLING_TOKEN_ENCRYPTION_KEY", "BILLING_SELLER_LEGAL_NAME_AR",
  "BILLING_SELLER_ADDRESS_AR", "BILLING_TAX_STATUS", "BILLING_RENEWAL_ENABLED",
  "BILLING_OPERATIONS_READY", "PAID_CHECKOUT_PUBLIC_ENABLED",
  "BILLING_REHEARSAL_USER_EMAIL", "STORAGE_DRIVER", "S3_ENDPOINT", "S3_REGION",
  "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_FORCE_PATH_STYLE",
  "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "APPLE_CLIENT_ID", "APPLE_TEAM_ID",
  "APPLE_KEY_ID", "APPLE_PRIVATE_KEY", "VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID",
];
const migrationCoreKeys = ["DATABASE_URL", "RESTORE_DATABASE_URL"];
const workerHostKeys = ["HETZNER_HOST", "HETZNER_USER", "HETZNER_KNOWN_HOSTS"];

function required(name) {
  const value = String(process.env[name] ?? "").trim();
  if (!value) throw new Error(`${name} is required for Production configuration attestation`);
  return value;
}
function optionalValues(names) {
  return names.map((name) => String(process.env[name] ?? "").trim());
}
function requireAllOrNone(label, names) {
  const values = optionalValues(names);
  const configured = values.some(Boolean);
  if (configured && !values.every(Boolean)) {
    throw new Error(`${label} OAuth must be either fully configured or fully disabled in Production configuration attestation`);
  }
  return configured ? values : null;
}
function validateProductionOauth() {
  const google = requireAllOrNone("Google", ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  if (google) {
    const [googleId, googleSecret] = google;
    if (!googleId.endsWith(".apps.googleusercontent.com")) throw new Error("GOOGLE_CLIENT_ID must be a Google OAuth web client id");
    if (googleSecret.length < 16 || googleId === googleSecret) throw new Error("GOOGLE_CLIENT_SECRET must be a valid distinct production secret");
  }
  const apple = requireAllOrNone("Apple", ["APPLE_CLIENT_ID", "APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"]);
  if (apple) {
    const [appleClientId, appleTeamId, appleKeyId, rawApplePrivateKey] = apple;
    const applePrivateKey = rawApplePrivateKey.replace(/\\n/g, "\n");
    if (!appleClientId.includes(".")) throw new Error("APPLE_CLIENT_ID must be an Apple Services ID");
    if (!/^[A-Z0-9]{10}$/.test(appleTeamId)) throw new Error("APPLE_TEAM_ID must be a 10-character Apple Team ID");
    if (!/^[A-Z0-9]{10}$/.test(appleKeyId)) throw new Error("APPLE_KEY_ID must be a 10-character Apple key ID");
    if (!applePrivateKey.includes("-----BEGIN PRIVATE KEY-----") || !applePrivateKey.includes("-----END PRIVATE KEY-----")) {
      throw new Error("APPLE_PRIVATE_KEY must contain a PKCS#8 private key");
    }
  }
}
function releaseSha() {
  const sha = required("GITHUB_SHA").toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error("GITHUB_SHA must be a 40-character Git SHA");
  return sha;
}
function keysFor(scope) {
  if (scope === "release-core") return releaseCoreKeys;
  if (scope === "migration-core") return migrationCoreKeys;
  if (scope === "worker-host") return workerHostKeys;
  throw new Error(`Unsupported attestation scope: ${scope}`);
}
function signingKeyFor(scope) {
  if (scope === "release-core") return required("SESSION_SECRET");
  if (scope === "migration-core") return required("PRODUCTION_BACKUP_PASSPHRASE");
  if (scope === "worker-host") return required("HETZNER_SSH_PRIVATE_KEY");
  throw new Error(`Unsupported attestation scope: ${scope}`);
}
function canonicalPayload(scope, keys) {
  const values = Object.fromEntries(keys.map((key) => [key, String(process.env[key] ?? "").trim()]));
  return JSON.stringify({ version: VERSION, scope, releaseSha: releaseSha(), values });
}
function digest(scope) {
  if (scope === "release-core") {
    validateProductionOauth();
    return createHmac("sha256", signingKeyFor(scope)).update(canonicalPayload(scope, keysFor(scope))).digest("hex");
  }
  if (scope === "migration-core" || scope === "worker-host") {
    return createHmac("sha256", signingKeyFor(scope)).update(canonicalPayload(scope, keysFor(scope))).digest("hex");
  }
  throw new Error(`Unsupported attestation scope: ${scope}`);
}
function keyFingerprint(scope, key) {
  const value = String(process.env[key] ?? "").trim();
  return createHmac("sha256", signingKeyFor(scope))
    .update(JSON.stringify({ version: VERSION, scope, releaseSha: releaseSha(), key, value }))
    .digest("hex");
}
function fingerprints(scope) {
  if (scope === "release-core") validateProductionOauth();
  return Object.fromEntries(keysFor(scope).map((key) => [key, keyFingerprint(scope, key)]));
}
function billingWorkerRequired() {
  return ["BILLING_RENEWAL_ENABLED", "BILLING_OPERATIONS_READY"].some(
    (name) => String(process.env[name] ?? "").trim().toLowerCase() === "true",
  );
}
function equalHex(left, right) {
  if (!/^[0-9a-f]{64}$/.test(left) || !/^[0-9a-f]{64}$/.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}
async function writeAttestation(path) {
  const digests = {
    "release-core": digest("release-core"),
    "migration-core": digest("migration-core"),
  };
  if (billingWorkerRequired()) digests["worker-host"] = digest("worker-host");
  const scopes = Object.keys(digests);
  const keyFingerprints = Object.fromEntries(scopes.map((scope) => [scope, fingerprints(scope)]));
  const body = { version: VERSION, releaseSha: releaseSha(), digests, keyFingerprints };
  await writeFile(path, `${JSON.stringify(body)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`production-config-attestation: WRITE PASS release=${body.releaseSha} scopes=${scopes.length}`);
}
async function verifyAttestation(scope, path) {
  const body = JSON.parse(await readFile(path, "utf8"));
  if (body?.version !== VERSION) throw new Error("Unsupported Production attestation version");
  if (String(body?.releaseSha ?? "").toLowerCase() !== releaseSha()) throw new Error("Production attestation belongs to a different release SHA");
  const expected = String(body?.digests?.[scope] ?? "").toLowerCase();
  const current = digest(scope);
  if (!equalHex(expected, current)) {
    const expectedFingerprints = body?.keyFingerprints?.[scope] ?? {};
    const changed = keysFor(scope).filter((key) => !equalHex(String(expectedFingerprints[key] ?? "").toLowerCase(), keyFingerprint(scope, key)));
    const detail = changed.length ? ` changed keys: ${changed.join(",")}` : " fingerprint detail unavailable";
    throw new Error(`Production ${scope} configuration changed after the successful Preflight attestation;${detail}`);
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
