import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const sync = readFileSync(new URL("../scripts/sync-rc-preview-schema.mjs", import.meta.url), "utf8");
const gate = readFileSync(new URL("../scripts/assert-rc-preview-schema-current.mjs", import.meta.url), "utf8");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as { scripts?: Record<string, string> };

test("Preview migration sync is limited to explicitly approved Vercel preview refs and runs before the schema gate", () => {
  assert.match(sync, /VERCEL_ENV/);
  assert.match(sync, /VERCEL_GIT_COMMIT_REF/);
  assert.match(sync, /vercelEnv === "preview"/);
  assert.match(sync, /new Set\(\["hee-v6-rc", "infro-business-memory-2026"\]\)/);
  assert.match(sync, /previewSchemaRefs\.has\(gitRef\)/);
  assert.match(sync, /const prisma = \(args\) => spawnSync/);
  assert.match(sync, /prisma\(\["migrate", "deploy"\]\)/);
  assert.match(sync, /sslmode/);
  assert.match(sync, /verify-full/);
  assert.match(sync, /const maxAttempts = 3/);
  assert.match(sync, /P1001\|Can't reach database server/);
  assert.match(sync, /attempt === maxAttempts/);
  assert.match(sync, /attempt \* 5_000/);
  assert.match(sync, /P3009/);
  assert.match(sync, /migrate", "resolve", "--rolled-back"/);
  assert.match(gate, /new Set\(\["hee-v6-rc", "infro-business-memory-2026"\]\)/);
  assert.match(gate, /vercelEnv === "preview"/);
  assert.match(gate, /previewSchemaRefs\.has\(gitRef\)/);

  const build = pkg.scripts?.build ?? "";
  const syncIndex = build.indexOf("sync-rc-preview-schema.mjs");
  const assertIndex = build.indexOf("assert-rc-preview-schema-current.mjs");
  assert.ok(syncIndex >= 0, "build must invoke Preview migration sync");
  assert.ok(assertIndex > syncIndex, "compatibility assertion must run after migration sync");
});
