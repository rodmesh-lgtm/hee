import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const workflow = readFileSync(resolve(process.cwd(), "../../.github/workflows/rc-quality.yml"), "utf8");

test("RC Quality checks out and proves the exact candidate SHA", () => {
  assert.match(workflow, /RC_CANDIDATE_SHA: \$\{\{ github\.event_name == 'pull_request' && github\.event\.pull_request\.head\.sha \|\| github\.sha \}\}/);
  assert.match(workflow, /Checkout exact RC candidate/);
  assert.match(workflow, /ref: \$\{\{ env\.RC_CANDIDATE_SHA \}\}/);
  assert.match(workflow, /test "\$\(git rev-parse HEAD\)" = "\$RC_CANDIDATE_SHA"/);
});

test("RC Quality triggers cover production release machinery outside apps/web", () => {
  for (const guardedPath of [
    '"apps/web/**"',
    '".github/workflows/**"',
    '".github/actions/**"',
    '".github/scripts/**"',
    '"ops/**"',
  ]) {
    const occurrences = workflow.split(guardedPath).length - 1;
    assert.equal(occurrences, 2, `${guardedPath} must be guarded on both push and pull_request`);
  }
});
