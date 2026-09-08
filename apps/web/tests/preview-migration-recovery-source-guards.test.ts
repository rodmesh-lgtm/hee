import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const script=readFileSync("scripts/sync-rc-preview-schema.mjs","utf8");

test("Preview schema recovery is branch and migration specific",()=>{
  assert.match(script,/vercelEnv === "preview"/);
  assert.match(script,/gitRef === "infro-business-memory-2026"/);
  assert.match(script,/20260906124500_business_productivity_progress/);
  assert.match(script,/P3009/);
  assert.match(script,/migrate", "resolve", "--rolled-back"/);
  assert.match(script,/recoveredKnownFailedMigration/);
  assert.doesNotMatch(script,/--applied/);
});
