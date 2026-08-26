import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("renewals do not charge early and serialize customer cancellation with provider submission", () => {
  const worker = source("scripts/billing-renewal-worker.ts");
  const actions = source("app/actions/billing.ts");
  const ledger = source("app/lib/billing-ledger.ts");
  const manage = source("app/dashboard/billing/manage/page.tsx");

  assert.match(worker, /const DUE_WINDOW_MS = 0/);
  assert.match(worker, /billing-business:\$\{businessId\}/);
  assert.match(actions, /billing-business:\$\{business\.id\}/);
  assert.match(worker, /claimAttemptForProviderSubmission/);
  assert.match(worker, /"providerPaymentId"=COALESCE\("providerPaymentId","providerGivenId"\)/);
  assert.match(worker, /AND s\."autoRenew"=true/);
  assert.match(worker, /AND pm\."status"='active'/);

  const claimIndex = worker.indexOf("const encryptedToken = await claimAttemptForProviderSubmission(sub, billing)");
  const providerIndex = worker.indexOf("const payment = await createMoyasarTokenPayment({");
  assert.ok(claimIndex >= 0 && providerIndex > claimIndex, "provider submission must happen only after the locked renewal claim");

  assert.match(actions, /status: \{ in: \["active", "past_due"\] \}/);
  assert.match(actions, /status: \{ in: \["created", "failed"\] \}/);
  assert.match(actions, /data: \{ status: "canceled", nextRetryAt: null \}/);
  assert.match(actions, /data: \{ autoRenew: false \}/);
  assert.match(actions, /return inFlight \? "processing-future-canceled" as const : "canceled" as const/);
  assert.match(actions, /data: \{ status: "revoked" \}/);
  assert.match(manage, /renewal-processing-future-canceled/);
  assert.match(manage, /تم إيقاف التجديد للدورات المستقبلية الآن/);

  // Once a provider request is already in flight, cancellation still disables all later
  // cycles. If that already-started payment settles, its paid period is honored but the
  // replacement subscription inherits autoRenew=false from the canceled base period.
  assert.match(ledger, /period must still be granted/);
  assert.match(worker, /const nextAutoRenew = Boolean\(current\.autoRenew/);
  assert.doesNotMatch(worker, /!current\.autoRenew\) return "stale"/);
  assert.doesNotMatch(ledger, /!baseSubscription\.autoRenew\) return "stale-renewal"/);
  assert.doesNotMatch(worker, /SET "status" = 'replaced', "endsAt"/);
});
