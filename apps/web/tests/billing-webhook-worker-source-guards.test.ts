import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("standalone billing recovery runs server-only modules safely and closes database resources", () => {
  const pkg = source("package.json");
  const worker = source("scripts/billing-webhook-recovery-worker.ts");
  const prisma = source("lib/prisma.ts");

  assert.match(pkg, /billing:webhooks[^\n]*NODE_OPTIONS=--conditions=react-server/);
  assert.match(worker, /recoverPendingMoyasarWebhookEvents/);
  assert.match(worker, /recoverOpenMoyasarCheckoutPayments/);
  assert.match(worker, /OPEN_CHECKOUT_RECONCILIATION_ERRORS/);
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

test("provider-started initial and upgrade checkouts are recoverable without browser callback or webhook delivery", () => {
  const processor = source("app/lib/moyasar-webhook-processing.ts");
  const worker = source("scripts/billing-webhook-recovery-worker.ts");

  assert.match(processor, /export async function recoverOpenMoyasarCheckoutPayments/);
  assert.match(processor, /"kind" IN \('initial','upgrade'\)/);
  assert.match(processor, /"status" IN \('initiated','authorized'\)/);
  assert.match(processor, /"providerPaymentId" IS NOT NULL/);
  assert.match(processor, /fetchMoyasarPayment\(row\.providerPaymentId\)/);
  assert.match(processor, /reconcileVerifiedCheckoutPayment\(billing, payment\)/);
  assert.match(processor, /hasBillingCheckoutConsent/);
  assert.match(processor, /activateVerifiedMoyasarPayment/);
  assert.match(processor, /OPEN_AUTHORIZATION_MAX_AGE_MS = 24 \* 60 \* 60 \* 1000/);
  assert.match(processor, /stale-authorization-reversed/);
  assert.match(worker, /if \(checkout\.errors > 0\) throw/);
});
