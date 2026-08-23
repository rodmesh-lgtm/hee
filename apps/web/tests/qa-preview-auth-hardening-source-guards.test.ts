import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("preview QA service identity never receives a reusable password credential", () => {
  const qa = source("app/lib/qa-audit.ts");
  assert.doesNotMatch(qa, /from \"bcryptjs\"/);
  assert.doesNotMatch(qa, /qa-preview-access/);
  assert.match(qa, /db\.user\.create\(\{ data: \{ name, email, passwordHash: null \} \}\)/);
  assert.match(qa, /existing\.passwordHash !== null/);
  assert.match(qa, /data: \{ name, passwordHash: null \}/);
});

test("preview QA access remains constrained to Vercel Preview and one-time prefixed sessions", () => {
  const qa = source("app/lib/qa-audit.ts");
  assert.match(qa, /vercelEnv === \"preview\"/);
  assert.match(qa, /QA_AUDIT_LINK_PREFIX = \"hee_qa_audit_link:\"/);
  assert.match(qa, /QA_ACTIVE_SESSION_PREFIX = \"hee_qa_audit_session:\"/);
  assert.match(qa, /pg_advisory_xact_lock/);
  assert.match(qa, /deleted\.count === 1/);
});
