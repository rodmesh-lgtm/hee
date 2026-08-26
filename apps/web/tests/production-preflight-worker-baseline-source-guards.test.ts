import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function workflowSource() {
  return readFileSync(
    resolve(process.cwd(), "../../.github/workflows/production-preflight-v2.yml"),
    "utf8",
  );
}

test("production preflight V2 proves the exact managed worker rollback baseline before maintenance", () => {
  const workflow = workflowSource();
  const workerStep = workflow.indexOf("Verify Hetzner worker rollback baseline and prerequisites read-only");
  const current = workflow.indexOf('readlink -f /srv/hee/current', workerStep);
  const managed = workflow.indexOf('/srv/hee/releases/*', current);
  const releaseEnv = workflow.indexOf('RELEASE_SHA=[0-9a-f]{40}', managed);
  const service = workflow.indexOf('ops/systemd/hee-billing-renew.service', releaseEnv);
  const timer = workflow.indexOf('ops/systemd/hee-billing-renew.timer', service);
  const serviceCmp = workflow.indexOf('cmp -s "$current_release/ops/systemd/hee-billing-renew.service"', timer);
  const timerCmp = workflow.indexOf('cmp -s "$current_release/ops/systemd/hee-billing-renew.timer"', serviceCmp);
  const serviceCat = workflow.indexOf('systemctl cat hee-billing-renew.service', timerCmp);
  const timerCat = workflow.indexOf('systemctl cat hee-billing-renew.timer', serviceCat);
  const proof = workflow.indexOf('worker-rollback-baseline-preflight: PASS', timerCat);
  const attestation = workflow.indexOf('Write exact-SHA scoped Production configuration attestation', proof);

  assert.ok(workerStep >= 0);
  assert.ok(current > workerStep);
  assert.ok(managed > current);
  assert.ok(releaseEnv > managed);
  assert.ok(service > releaseEnv);
  assert.ok(timer > service);
  assert.ok(serviceCmp > timer);
  assert.ok(timerCmp > serviceCmp);
  assert.ok(serviceCat > timerCmp);
  assert.ok(timerCat > serviceCat);
  assert.ok(proof > timerCat);
  assert.ok(attestation > proof, "worker rollback baseline must be proven before preflight attestation is written");
});

test("remote worker baseline proof remains read-only", () => {
  const workflow = workflowSource();
  const stepStart = workflow.indexOf("Verify Hetzner worker rollback baseline and prerequisites read-only");
  const remoteStartMarker = "<<'REMOTE'";
  const remoteStart = workflow.indexOf(remoteStartMarker, stepStart);
  const remoteBodyStart = remoteStart + remoteStartMarker.length;
  const remoteEnd = workflow.indexOf("\n          REMOTE", remoteBodyStart);
  const remoteBody = workflow.slice(remoteBodyStart, remoteEnd);

  assert.ok(stepStart >= 0);
  assert.ok(remoteStart > stepStart);
  assert.ok(remoteEnd > remoteBodyStart);
  assert.match(remoteBody, /sudo -n cmp -s/);
  assert.match(remoteBody, /sudo -n systemctl cat/);
  assert.doesNotMatch(remoteBody, /systemctl\s+(?:start|stop|restart|enable|disable|daemon-reload)/);
  assert.doesNotMatch(remoteBody, /\b(?:rm|mv|cp|install|touch|tee|ln)\b/);
  assert.doesNotMatch(remoteBody, /maintenance\.lock[^\n]*(?:rm|touch)/);
});
