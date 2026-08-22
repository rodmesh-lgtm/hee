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

test("worker cutover captures a managed rollback baseline before mutation", () => {
  const workflow = workflowSource();
  const baseline = workflow.indexOf("worker-cutover-baseline:");
  const trap = workflow.indexOf("trap 'rollback_worker $?'");
  const arm = workflow.indexOf("rollback_armed=true", trap);
  const stopTimer = workflow.indexOf("systemctl stop hee-billing-renew.timer", arm);
  const switchCurrent = workflow.indexOf("mv -Tf /srv/hee/current.next /srv/hee/current", stopTimer);
  const disarm = workflow.indexOf("rollback_armed=false", switchCurrent);

  assert.ok(baseline >= 0, "worker baseline must be captured");
  assert.ok(trap > baseline, "rollback trap must be installed after baseline capture");
  assert.ok(arm > trap, "rollback must arm before the first worker mutation");
  assert.ok(stopTimer > arm, "timer mutation must happen only after rollback is armed");
  assert.ok(switchCurrent > stopTimer, "release switch must happen after timer quiescence");
  assert.ok(disarm > switchCurrent, "rollback may disarm only after release activation");
});

test("worker rollback restores release, systemd units, maintenance interlock and timer state", () => {
  const workflow = workflowSource();

  assert.match(workflow, /previous_release="\$\(readlink -f \/srv\/hee\/current/);
  assert.match(workflow, /previous_timer_active=true/);
  assert.match(workflow, /previous_lock_state=true/);
  assert.match(workflow, /ln -sfn "\$previous_release" \/srv\/hee\/current\.rollback/);
  assert.match(workflow, /"\$previous_release\/ops\/systemd\/hee-billing-renew\.service"/);
  assert.match(workflow, /"\$previous_release\/ops\/systemd\/hee-billing-renew\.timer"/);
  assert.match(workflow, /worker-cutover-rollback-proof: PASS restored/);
  assert.match(workflow, /worker-cutover-rollback-proof: CRITICAL FAIL/);
  assert.match(workflow, /exit 71/);
  assert.doesNotMatch(workflow, /restore_timer_if_safe/);
});

test("worker success is proven before rollback is disarmed", () => {
  const workflow = workflowSource();
  const startTimer = workflow.indexOf("systemctl start hee-billing-renew.timer");
  const activeProof = workflow.indexOf("systemctl is-active --quiet hee-billing-renew.timer", startTimer);
  const currentProof = workflow.indexOf('test "$(readlink -f /srv/hee/current)" = "$release"', activeProof);
  const shaProof = workflow.indexOf('grep -qx "RELEASE_SHA=${sha}" /srv/hee/current/release.env', currentProof);
  const disarm = workflow.indexOf("rollback_armed=false", shaProof);
  const success = workflow.indexOf("worker-cutover-proof: PASS", disarm);

  assert.ok(startTimer >= 0);
  assert.ok(activeProof > startTimer);
  assert.ok(currentProof > activeProof);
  assert.ok(shaProof > currentProof);
  assert.ok(disarm > shaProof, "rollback must remain armed until all local worker proofs pass");
  assert.ok(success > disarm);
});
