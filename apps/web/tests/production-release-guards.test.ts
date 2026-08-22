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

test("production migrations verify and restore an encrypted recovery backup into a clean isolated schema before deploy", () => {
  const workflow = source("../../.github/workflows/production-migrations.yml");
  const decryptIndex = workflow.indexOf("Verify encrypted backup can be decrypted and parsed");
  const resetIndex = workflow.indexOf("Reset isolated restore schema");
  const restoreIndex = workflow.indexOf("Restore exact pre-migration backup into isolated database");
  const proofIndex = workflow.indexOf("npm run backup:production-proof");
  const migrateIndex = workflow.indexOf("Apply pending migrations");

  assert.ok(decryptIndex >= 0, "encrypted backup decrypt/parse verification step must exist");
  assert.ok(resetIndex > decryptIndex, "isolated restore schema must reset after decrypt verification");
  assert.ok(restoreIndex > resetIndex, "restore must run after clean isolated schema reset");
  assert.ok(proofIndex > restoreIndex, "restore proof must run after isolated restore");
  assert.ok(migrateIndex > proofIndex, "verified restore proof must complete before migrations");

  assert.match(workflow, /openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000/);
  assert.match(workflow, /pg_restore --list/);
  assert.match(workflow, /DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public/);
  assert.match(workflow, /pg_restore --exit-on-error --dbname="\$RESTORE_DATABASE_URL" --no-owner --no-privileges/);
  assert.match(workflow, /npm run backup:production-proof/);
  assert.match(workflow, /retention-days: 14/);
});

test("production preflight proves external prerequisites read-only before maintenance", () => {
  const workflow = source("../../.github/workflows/production-preflight.yml");
  assert.match(workflow, /VERIFY_PRODUCTION_PREFLIGHT/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /PRODUCTION_DATABASE_URL/);
  assert.match(workflow, /PRODUCTION_RESTORE_DATABASE_URL/);
  assert.match(workflow, /RESTORE_DATABASE_URL must name hee_restore/);
  assert.match(workflow, /must explicitly enable TLS/);
  assert.match(workflow, /api\.resend\.com\/domains\?limit=100/);
  assert.match(workflow, /api\.moyasar\.com\/v1\/payments\?page=1/);
  assert.match(workflow, /PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(workflow, /Rehearsal account must not be enabled during preflight/);
  assert.match(workflow, /no production mutation performed/);

  // The preflight may only prove reachability/configuration. It must never become a
  // deployment, migration, backup/restore, billing worker, or SQL mutation path.
  assert.doesNotMatch(workflow, /prisma migrate deploy/);
  assert.doesNotMatch(workflow, /prisma db push/);
  assert.doesNotMatch(workflow, /billing:renew/);
  assert.doesNotMatch(workflow, /pg_dump/);
  assert.doesNotMatch(workflow, /pg_restore/);
  assert.doesNotMatch(workflow, /\bDROP\s+(?:TABLE|DATABASE|SCHEMA)\b/i);
  assert.doesNotMatch(workflow, /\bDELETE\s+FROM\b/i);
  assert.doesNotMatch(workflow, /\bUPDATE\s+[^\n]+\s+SET\b/i);
  assert.doesNotMatch(workflow, /\bINSERT\s+INTO\b/i);
});

test("production launch readiness proves exact RC, deployed SHA, verified email domain, live runtime, database, billing liveness and canonical surfaces", () => {
  const workflow = source("../../.github/workflows/production-launch-readiness.yml");
  const audit = source("scripts/launch-config-audit.ts");
  const release = source("app/api/release/route.ts");
  const ready = source("app/api/health/ready/route.ts");
  assert.match(workflow, /VERIFY_PRODUCTION_READINESS/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/hee-v6-rc'/);
  assert.match(workflow, /environment: production/);
  assert.match(workflow, /head_sha=\$\{GITHUB_SHA\}/);
  assert.match(workflow, /conclusion == "success"/);
  assert.match(workflow, /npm run launch:config-audit/);
  assert.match(workflow, /api\.resend\.com\/domains\?limit=100/);
  assert.match(workflow, /Resend hee\.sa domain is missing or not verified/);
  assert.match(workflow, /sending capability is not enabled/);
  assert.match(workflow, /npx prisma migrate status/);
  assert.match(workflow, /npm run billing:state-audit/);
  assert.doesNotMatch(workflow, /--record-heartbeat/);
  assert.match(workflow, /PRODUCTION_PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(workflow, /PRODUCTION_BILLING_REHEARSAL_USER_EMAIL/);
  assert.match(workflow, /https:\/\/hee\.sa\/api\/release/);
  assert.match(workflow, /release_sha/);
  assert.match(workflow, /test "\$release_sha" = "\$GITHUB_SHA"/);
  assert.match(workflow, /release_env/);
  assert.match(workflow, /https:\/\/hee\.sa\/api\/health\/ready/);
  assert.match(workflow, /Canonical production runtime reports not ready/);
  assert.match(workflow, /\/register/);
  assert.match(workflow, /\/login/);
  assert.match(workflow, /\/demo/);
  assert.match(workflow, /strict-transport-security/);
  assert.match(workflow, /content-security-policy/);
  assert.match(workflow, /noindex/);
  assert.match(release, /VERCEL_GIT_COMMIT_SHA/);
  assert.match(release, /RELEASE_SHA/);
  assert.match(release, /Cache-Control/);
  assert.match(release, /no-store/);
  assert.match(release, /X-Robots-Tag/);
  assert.match(ready, /APP_ENV/);
  assert.match(ready, /pk_live_/);
  assert.match(ready, /sk_live_/);
  assert.match(ready, /PAID_CHECKOUT_PUBLIC_ENABLED/);
  assert.match(ready, /BILLING_REHEARSAL_USER_EMAIL/);
  assert.match(ready, /billingOperationsHeartbeat/);
  assert.match(ready, /FREE/);
  assert.match(ready, /BUSINESS/);
  assert.match(ready, /PRO/);
  assert.match(ready, /status: ready \? 200 : 503/);
  assert.match(audit, /sslmode=verify-full/);
  assert.match(audit, /DATABASE_URL must explicitly enable PostgreSQL TLS/);
  assert.match(audit, /PAID_CHECKOUT_PUBLIC_ENABLED must be true/);
  assert.match(audit, /BILLING_REHEARSAL_USER_EMAIL must be removed/);
  assert.doesNotMatch(workflow, /prisma db push/);
  assert.doesNotMatch(workflow, /prisma migrate deploy/);
  assert.doesNotMatch(workflow, /billing:renew/);
});
