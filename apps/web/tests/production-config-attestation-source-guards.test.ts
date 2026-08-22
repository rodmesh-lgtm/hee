import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Preflight writes an exact-SHA scoped HMAC attestation after read-only external proofs", () => {
  const workflow = source("../../.github/workflows/production-preflight.yml");
  const attestation = source("../../.github/scripts/production-config-attestation.mjs");

  const dbProof = workflow.indexOf("Prove production PostgreSQL is reachable read-only");
  const vercelProof = workflow.indexOf("Verify Vercel credential and HEE project read-only");
  const resendProof = workflow.indexOf("Verify Resend hee.sa domain and API credential");
  const moyasarProof = workflow.indexOf("Verify Moyasar live secret credential read-only");
  const workerProof = workflow.indexOf("Verify Hetzner worker host identity and prerequisites read-only");
  const write = workflow.indexOf("Write exact-SHA scoped Production configuration attestation");
  const upload = workflow.indexOf("Preserve exact-SHA Production Preflight attestation");

  assert.ok(dbProof >= 0);
  assert.ok(vercelProof > dbProof);
  assert.ok(resendProof > vercelProof);
  assert.ok(moyasarProof > resendProof);
  assert.ok(workerProof > moyasarProof);
  assert.ok(write > workerProof);
  assert.ok(upload > write);

  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /production-preflight-attestation-\$\{\{ github\.sha \}\}/);
  assert.match(workflow, /retention-days: 14/);
  assert.match(workflow, /StrictHostKeyChecking=yes/);
  assert.match(workflow, /sudo -n test -r \/etc\/hee\/production\.env/);
  assert.doesNotMatch(workflow, /systemctl (?:start|stop|restart|enable|disable)/);
  assert.doesNotMatch(workflow, /vercel(?:@[^ ]+)? deploy/);
  assert.doesNotMatch(workflow, /prisma migrate deploy/);
  assert.doesNotMatch(workflow, /pg_dump/);

  assert.match(attestation, /createHmac\("sha256"/);
  assert.match(attestation, /timingSafeEqual/);
  assert.match(attestation, /releaseSha: releaseSha\(\)/);
  assert.match(attestation, /"release-core"/);
  assert.match(attestation, /"migration-core"/);
  assert.match(attestation, /"worker-host"/);
  assert.doesNotMatch(attestation, /console\.log\([^\n]*values/);
});

test("release quality gate centrally enforces explicit path-based Production attestation policy", () => {
  const action = source("../../.github/actions/require-release-quality/action.yml");
  const policy = source("../../.github/scripts/require-production-workflow-attestations.sh");
  const helper = source("../../.github/scripts/require-production-preflight-attestation.sh");

  assert.match(action, /require-release-quality\.sh/);
  assert.match(action, /require-production-workflow-attestations\.sh/);

  assert.match(policy, /GITHUB_WORKFLOW_REF/);
  assert.doesNotMatch(policy, /GITHUB_WORKFLOW:-/);
  assert.match(policy, /production-enter-maintenance\.yml@\*/);
  assert.match(policy, /verify_scope release-core/);
  assert.match(policy, /production-migrations\.yml@\*/);
  assert.match(policy, /verify_scope migration-core/);
  assert.match(policy, /production-deploy\.yml@\*/);
  assert.match(policy, /production-worker-deploy\.yml@\*/);
  assert.match(policy, /verify_scope worker-host/);
  assert.match(policy, /production-\*\.yml@\*/);
  assert.match(policy, /Unknown Production workflow has no explicit attestation policy/);

  assert.match(helper, /production-preflight\.yml\/runs\?head_sha=\$\{GITHUB_SHA\}/);
  assert.match(helper, /\.conclusion == "success"/);
  assert.match(helper, /\.event == "workflow_dispatch"/);
  assert.match(helper, /\.head_branch == "hee-v6-rc"/);
  assert.match(helper, /production-preflight-attestation-\$\{GITHUB_SHA\}/);
  assert.match(helper, /gh run download/);
  assert.match(helper, /production-config-attestation\.mjs" verify/);
});

test("launch-state variables are part of release-core so normal cutover cannot silently bypass closed Preflight state", () => {
  const attestation = source("../../.github/scripts/production-config-attestation.mjs");
  const preflight = source("../../.github/workflows/production-preflight.yml");

  assert.match(attestation, /"PAID_CHECKOUT_PUBLIC_ENABLED"/);
  assert.match(attestation, /"BILLING_REHEARSAL_USER_EMAIL"/);
  assert.match(attestation, /"BILLING_RENEWAL_ENABLED"/);
  assert.match(attestation, /"BILLING_OPERATIONS_READY"/);
  assert.match(preflight, /Public paid checkout must be closed during preflight\/migration preparation/);
  assert.match(preflight, /Rehearsal account must not be enabled during preflight\/migration preparation/);
});
