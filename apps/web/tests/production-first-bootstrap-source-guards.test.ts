import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), "..", "..", path), "utf8");
}

test("first Production bootstrap waits for a successful RC Quality workflow_run on hee-v6-rc", () => {
  const workflow = source(".github/workflows/production-first-bootstrap.yml");
  assert.match(workflow, /workflow_run:/);
  assert.match(workflow, /workflows: \["RC Quality"\]/);
  assert.match(workflow, /github\.event\.workflow_run\.conclusion == 'success'/);
  assert.match(workflow, /github\.event\.workflow_run\.head_branch == 'hee-v6-rc'/);
  assert.match(workflow, /github\.event\.workflow_run\.event == 'push'/);
  assert.match(workflow, /\[first-production-bootstrap\]/);
  assert.doesNotMatch(workflow, /RELEASE_SHA:\s*[0-9a-f]{40}/);
  assert.match(workflow, /RELEASE_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \}\}/);
});

test("first Production bootstrap is limited to a dedicated trigger-only commit and exact RC provenance", () => {
  const workflow = source(".github/workflows/production-first-bootstrap.yml");
  assert.match(workflow, /fetch-depth: 2/);
  assert.match(workflow, /git diff-tree --no-commit-id --name-only -r "\$RELEASE_SHA"/);
  assert.match(workflow, /ops\/production-bootstrap-trigger\/\*/);
  assert.match(workflow, /RELEASE_QUALITY_SHA: \$\{\{ env\.RELEASE_SHA \}\}/);
  assert.match(workflow, /Prove Production database is genuinely empty/);
  assert.match(workflow, /Refusing first bootstrap because public schema is not empty/);
  assert.match(workflow, /Refusing first bootstrap because restore database is not empty/);
});

test("release quality verifier supports an explicit workflow-run SHA without weakening its default", () => {
  const script = source(".github/scripts/require-release-quality.sh");
  assert.match(script, /default_sha="\$\{GITHUB_SHA:\?GITHUB_SHA is required\}"/);
  assert.match(script, /sha="\$\{RELEASE_QUALITY_SHA:-\$default_sha\}"/);
  assert.match(script, /green_runs_for_sha "\$sha"/);
});

test("first bootstrap has an explicit attestation policy instead of falling into unknown Production workflow rejection", () => {
  const script = source(".github/scripts/require-production-workflow-attestations.sh");
  assert.match(script, /production-first-bootstrap\.yml/);
  assert.match(script, /first bootstrap intentionally precedes Production Preflight attestations/);
});
