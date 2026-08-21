import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("standalone webhook recovery runs server-only modules safely and closes database resources", () => {
  const pkg = source("package.json");
  const worker = source("scripts/billing-webhook-recovery-worker.ts");
  const prisma = source("lib/prisma.ts");

  assert.match(pkg, /billing:webhooks[^\n]*NODE_OPTIONS=--conditions=react-server/);
  assert.match(worker, /closePrismaForWorker/);
  assert.match(worker, /\.finally\(async \(\) =>/);
  assert.match(prisma, /await client\.\$disconnect\(\)/);
  assert.match(prisma, /await pool\.end\(\)/);
});

test("durable webhook inbox has bounded retry, lease and operator-detectable failure state", () => {
  const processor = source("app/lib/moyasar-webhook-processing.ts");
  const audit = source("scripts/billing-state-audit.ts");
  assert.match(processor, /MAX_WEBHOOK_ATTEMPTS = 12/);
  assert.match(processor, /CLAIM_STALE_MS = 5 \* 60 \* 1000/);
  assert.match(processor, /retryDelayMs/);
  assert.match(audit, /webhook exhausted durable retry budget/);
  assert.match(audit, /webhook processing lease is stuck/);
});
