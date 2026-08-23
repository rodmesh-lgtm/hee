import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("billing audit blocks renewal provider states stranded beyond reconciliation window", () => {
  const audit = source("scripts/billing-state-audit.ts");

  assert.match(audit, /const staleRenewalReconciliation = await db\.\$queryRaw<DriftRow\[]>/);
  assert.match(audit, /bp\."kind"='renewal'/);
  assert.match(audit, /bp\."status" IN \('initiated','authorized'\)/);
  assert.match(audit, /bp\."createdAt" < CURRENT_TIMESTAMP - INTERVAL '26 hours'/);
  assert.match(audit, /drifts\.push\(\.\.\.staleRenewalReconciliation\)/);
  assert.match(audit, /renewal provider payment remained unresolved beyond reconciliation window/);
});