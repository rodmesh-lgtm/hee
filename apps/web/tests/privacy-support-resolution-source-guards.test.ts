import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const action = readFileSync(join(root, "app/actions/support.ts"), "utf8");
const adminPage = readFileSync(join(root, "app/admin/support/page.tsx"), "utf8");

test("privacy tickets fail closed instead of resolving from free text alone", () => {
  assert.match(action, /privacyResolutionOutcomes\s*=\s*new Set\(\["deletion_completed", "retention_exception"\]\)/);
  assert.match(action, /metadata\.category === "privacy" && !privacyResolutionOutcomes\.has\(privacyOutcome\)/);
  assert.match(action, /return "privacy-outcome-required"/);
  assert.match(action, /privacyOutcome/);
});

test("admin privacy workflow requires an explicit auditable outcome", () => {
  assert.match(adminPage, /name="privacyOutcome"/);
  assert.match(adminPage, /value="deletion_completed"/);
  assert.match(adminPage, /value="retention_exception"/);
  assert.match(adminPage, /privacy-outcome-required/);
});
