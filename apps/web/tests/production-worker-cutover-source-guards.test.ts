import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function workflowSource() {
  return readFileSync(
    resolve(process.cwd(), "../../.github/workflows/production-worker-deploy.yml"),
    "utf8",
  );
}

test("worker cutover captures a coherent managed rollback baseline before mutation", () => {
  const workflow = workflowSource();
  const baseline = workflow.indexOf("worker-cutover-baseline:");
  const serviceDrift = workflow.indexOf("Installed worker service unit has drifted from current release");
  const timerDrift = workflow.indexOf("Installed worker timer unit has drifted from current release");
  const trap = workflow.indexOf("trap 'rollback_worker $?'");
  const arm = workflow.indexOf("rollback_armed=true", trap);
  const stopTimer = workflow.indexOf("systemctl stop hee-billing-renew.timer", arm);
  const inactiveProof = workflow.indexOf("Billing timer remained active after stop", stopTimer);
  const switchCurrent = workflow.indexOf("mv -Tf /srv/hee/current.next /srv/hee/current", inactiveProof);
  const disarm = workflow.indexOf("rollback_armed=false", switchCurrent);

  assert.ok(serviceDrift >= 0 && serviceDrift < baseline, "installed service unit must match the rollback release before capture");
  assert.ok(timerDrift >= 0 && timerDrift < baseline, "installed timer unit must match the rollback release before capture");
  assert.ok(baseline >= 0, "worker baseline must be captured");
  assert.ok(trap > baseline, "rollback trap must be installed after baseline capture");
  assert.ok(arm > trap, "rollback must arm before the first worker mutation");
  assert.ok(stopTimer > arm, "timer mutation must happen only after rollback is armed");
  assert.ok(inactiveProof > stopTimer, "timer inactivity must be proven before release switching");
  assert.ok(switchCurrent > inactiveProof, "release switch must happen only after timer quiescence");
  assert.ok(disarm > switchCurrent, "rollback may disarm only after release activation");
  assert.doesNotMatch(workflow.slice(arm, inactiveProof), /systemctl stop hee-billing-renew\.timer[^\n]*\|\| true/);
});

test("worker rollback restores release, exact systemd units, maintenance interlock and timer state", () => {
  const workflow = workflowSource();
  const rollback = workflow.slice(workflow.indexOf("rollback_worker()"), workflow.indexOf("trap 'rollback_worker $?'") + 30);

  assert.match(workflow, /previous_release="\$\(readlink -f \/srv\/hee\/current/);
  assert.match(workflow, /previous_timer_active=true/);
  assert.match(workflow, /previous_lock_state=true/);
  assert.match(rollback, /ln -sfn "\$previous_release" \/srv\/hee\/current\.rollback/);
  assert.match(rollback, /"\$previous_release\/ops\/systemd\/hee-billing-renew\.service"/);
  assert.match(rollback, /"\$previous_release\/ops\/systemd\/hee-billing-renew\.timer"/);
  assert.match(rollback, /cmp -s "\$previous_release\/ops\/systemd\/hee-billing-renew\.service"/);
  assert.match(rollback, /cmp -s "\$previous_release\/ops\/systemd\/hee-billing-renew\.timer"/);
  assert.match(rollback, /worker-cutover-rollback-proof: PASS restored/);
  assert.match(rollback, /worker-cutover-rollback-proof: CRITICAL FAIL/);
  assert.match(rollback, /exit 71/);
  assert.doesNotMatch(workflow, /restore_timer_if_safe/);
});

test("worker success is proven completely before rollback is disarmed", () => {
  const workflow = workflowSource();
  const successMarker = workflow.indexOf("# Successful cutover proof. Rollback remains armed through every assertion here.");
  const activeProof = workflow.indexOf("systemctl is-active --quiet hee-billing-renew.timer", successMarker);
  const currentProof = workflow.indexOf('test "$(readlink -f /srv/hee/current)" = "$release"', activeProof);
  const shaProof = workflow.indexOf('grep -qx "RELEASE_SHA=${sha}" /srv/hee/current/release.env', currentProof);
  const serviceProof = workflow.indexOf('cmp -s "$release/ops/systemd/hee-billing-renew.service"', shaProof);
  const timerProof = workflow.indexOf('cmp -s "$release/ops/systemd/hee-billing-renew.timer"', serviceProof);
  const disarm = workflow.indexOf("rollback_armed=false", timerProof);
  const trapClear = workflow.indexOf("trap - EXIT", disarm);
  const success = workflow.indexOf("worker-cutover-proof: PASS", trapClear);

  assert.ok(successMarker >= 0);
  assert.ok(activeProof > successMarker);
  assert.ok(currentProof > activeProof);
  assert.ok(shaProof > currentProof);
  assert.ok(serviceProof > shaProof);
  assert.ok(timerProof > serviceProof);
  assert.ok(disarm > timerProof, "rollback must remain armed until all worker proofs pass");
  assert.ok(trapClear > disarm);
  assert.ok(success > trapClear);
});
