import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("Moyasar callback verifies canonical provider payment before entitlement activation", () => {
  const callback = source("app/api/billing/moyasar/callback/route.ts");
  assert.match(callback, /fetchMoyasarPayment\(providerPaymentId\)/);
  assert.match(callback, /payment\.amount !== billing\.amount/);
  assert.match(callback, /payment\.currency !== "SAR"/);
  assert.match(callback, /metadataBilling !== billing\.id/);
  assert.match(callback, /metadataBusiness !== billing\.businessId/);
  assert.match(callback, /activateVerifiedMoyasarPayment/);
});

test("Moyasar webhook is bounded, secret-verified, retryable-idempotent and re-fetches provider state", () => {
  const webhook = source("app/api/billing/moyasar/webhook/route.ts");
  assert.match(webhook, /readBoundedText\(request, MAX_WEBHOOK_BYTES\)/);
  assert.match(webhook, /verifyMoyasarWebhookSecret\(event\.secret_token\)/);
  assert.match(webhook, /ON CONFLICT \("provider", "providerEventId"\)/);
  assert.match(webhook, /RETURNING "id", "processedAt"/);
  assert.match(webhook, /if \(claimed\.processedAt\)/);
  assert.match(webhook, /processedAt stays null/);
  assert.match(webhook, /fetchMoyasarPayment\(providerPaymentId\)/);
  assert.match(webhook, /event\.live !== true/);
  assert.match(webhook, /payment\.amount !== billing\.amount/);
});

test("provider tokens are encrypted at rest and raw card fields stay outside HEE server routes", () => {
  const core = source("app/lib/moyasar-core.ts");
  const ledger = source("app/lib/billing-ledger.ts");
  const callback = source("app/api/billing/moyasar/callback/route.ts");
  const webhook = source("app/api/billing/moyasar/webhook/route.ts");
  assert.match(core, /aes-256-gcm/);
  assert.match(core, /iv\.length !== 12/);
  assert.match(core, /tag\.length !== 16/);
  assert.match(ledger, /encryptProviderToken\(token\)/);
  assert.doesNotMatch(callback, /\b(?:cardNumber|cvc|cvv)\b/i);
  assert.doesNotMatch(webhook, /\b(?:cardNumber|cvc|cvv)\b/i);
});

test("provider response bodies are not copied into financial logs", () => {
  const core = source("app/lib/moyasar-core.ts");
  assert.doesNotMatch(core, /body:\s*body\.slice/);
  assert.match(core, /api_error[\s\S]*path[\s\S]*status/);
});

test("runtime payment configuration prevents live/test key cross-contamination", () => {
  const core = source("app/lib/moyasar-core.ts");
  for (const pattern of [/pk_live_/, /sk_live_/, /pk_test_/, /sk_test_/, /APP_ENV/]) assert.match(core, pattern);
});

test("billing database migration enforces ledger uniqueness, authorized checkout locking and tenant ownership", () => {
  const migration = source("prisma/migrations/20260821172000_moyasar_billing/migration.sql");
  for (const pattern of [
    /BillingPayment_provider_payment_unique/,
    /BillingPayment_provider_given_unique/,
    /BillingPayment_renewal_attempt_unique/,
    /BillingWebhookEvent_provider_event_unique/,
    /BillingPayment_one_open_checkout_per_business/,
    /"status" IN \('created','initiated','authorized'\)/,
    /Subscription_payment_method_business_fkey/,
    /BillingPayment_subscription_business_fkey/,
    /BillingPaymentMethod_id_business_unique/,
    /Subscription_id_business_unique/,
    /BillingPayment_receipt_snapshot_complete/,
    /BillingPayment_paid_state_complete/,
  ]) assert.match(migration, pattern);
  assert.doesNotMatch(migration, /ADD COLUMN "provider" TEXT/);
});

test("Prisma schema models the billing ledger including immutable receipt snapshots", () => {
  const schema = source("prisma/schema.prisma");
  for (const pattern of [
    /model BillingPaymentMethod/,
    /model BillingPayment/,
    /model BillingWebhookEvent/,
    /autoRenew Boolean/,
    /providerReference String\?/,
    /paymentMethodId String\?/,
    /receiptSellerLegalName String\?/,
    /receiptSellerAddress String\?/,
    /receiptTaxStatus String\?/,
    /receiptNetAmount Int\?/,
    /receiptVatAmount Int\?/,
    /receiptIssuedAt DateTime\?/,
  ]) assert.match(schema, pattern);
});

test("renewal retries reuse Moyasar idempotency keys and expire paid entitlement safely", () => {
  const worker = source("scripts/billing-renewal-worker.ts");
  for (const pattern of [
    /providerGivenId/,
    /givenId: billing\.providerGivenId/,
    /provider_request_ambiguous/,
    /markPastDue/,
    /status" IN \('active','past_due'\)/,
    /"subscriptionId" = \$\{newSubscriptionId\}/,
    /expireEndedNonRenewingSubscriptions/,
    /"autoRenew" = false/,
    /data: \{ planId: free\.id \}/,
    /claimAttemptForProviderSubmission/,
    /providerGivenId\) lets a later run fetch\/retry|given_id/,
  ]) assert.match(worker, pattern);
});

test("canceling auto-renew revokes reusable payment method and cannot lie about an in-flight charge", () => {
  const actions = source("app/actions/billing.ts");
  const button = source("components/billing/cancel-renewal-button.tsx");
  const manage = source("app/dashboard/billing/manage/page.tsx");
  assert.match(actions, /autoRenew:\s*false/);
  assert.match(actions, /billingPaymentMethod\.updateMany/);
  assert.match(actions, /status:\s*"revoked"/);
  assert.match(actions, /status: \{ in: \["initiated", "authorized"\] \}/);
  assert.match(actions, /renewal-processing/);
  assert.match(manage, /بدأت معالجة دفعة التجديد بالفعل/);
  assert.match(button, /window\.confirm/);
});

test("refund rollback restores only an unrefunded prior paid entitlement and never auto-renews it", () => {
  const ledger = source("app/lib/billing-ledger.ts");
  assert.match(ledger, /active\s*&&\s*billing\.subscriptionId\s*&&\s*active\.id\s*===\s*billing\.subscriptionId/);
  assert.match(ledger, /provider-payment-mismatch/);
  assert.match(ledger, /payment\.status\s*!==\s*"refunded"/);
  assert.match(ledger, /JOIN "BillingPayment" bp[\s\S]*ON bp\."subscriptionId"=s\."id"/);
  assert.match(ledger, /bp\."status"='paid'/);
  assert.match(ledger, /s\."status"='replaced'/);
  assert.match(ledger, /"status"='active',\s*"autoRenew"=false/);
  assert.match(ledger, /planId:\s*prior\[0\]\.planId/);
});

test("paid checkout requires verified mailbox ownership and provider reconciliation is throttled", () => {
  const billingAction = source("app/actions/billing.ts");
  const upgradeAction = source("app/actions/subscription-request.ts");
  const created = source("app/api/billing/moyasar/created/route.ts");
  const callback = source("app/api/billing/moyasar/callback/route.ts");
  assert.match(billingAction, /!user\.emailVerifiedAt/);
  assert.match(upgradeAction, /emailVerifiedAt:\s*true/);
  assert.match(upgradeAction, /!owner\?\.emailVerifiedAt/);
  for (const route of [created, callback]) {
    assert.match(route, /scope:\s*"billing-reconcile"/);
    assert.match(route, /limit:\s*30/);
    assert.match(route, /windowSeconds:\s*600/);
  }
});

test("checkout records provider payment IDs before redirect and blocks duplicate form reuse", () => {
  const checkout = source("components/billing/moyasar-checkout.tsx");
  const created = source("app/api/billing/moyasar/created/route.ts");
  const page = source("app/dashboard/billing/checkout/page.tsx");
  const ledger = source("app/lib/billing-ledger.ts");
  assert.match(checkout, /on_completed/);
  assert.match(checkout, /\/api\/billing\/moyasar\/created/);
  assert.match(created, /getOwnedBillingPayment/);
  assert.match(created, /fetchMoyasarPayment\(paymentId\)/);
  assert.match(created, /payment\.amount !== billing\.amount/);
  assert.match(page, /providerStarted/);
  assert.match(page, /التحقق من حالة العملية الآن/);
  assert.match(ledger, /"status" IN \('created','initiated','authorized'\)/);
});

test("CSP explicitly allows required Moyasar browser endpoints without generic HTTPS connect", () => {
  const config = source("next.config.ts");
  assert.match(config, /script-src[^\n]*https:\/\/cdn\.moyasar\.com/);
  assert.match(config, /style-src[^\n]*https:\/\/cdn\.moyasar\.com/);
  assert.match(config, /connect-src[^\n]*https:\/\/api\.moyasar\.com/);
  assert.doesNotMatch(config, /connect-src 'self' https: wss:/);
});

test("paid production configuration requires live Moyasar keys and token encryption", () => {
  const audit = source("scripts/launch-config-audit.ts");
  for (const pattern of [/paymentProvider !== "moyasar"/, /MOYASAR_PUBLISHABLE_KEY/, /pk_live_/, /MOYASAR_SECRET_KEY/, /sk_live_/, /MOYASAR_WEBHOOK_SECRET/, /BILLING_TOKEN_ENCRYPTION_KEY/, /BILLING_RENEWAL_ENABLED/]) assert.match(audit, pattern);
});

test("billing integrity audit is wired into RC Quality and proves authorized checkout uniqueness", () => {
  const packageJson = source("package.json");
  const workflow = source("../../.github/workflows/rc-quality.yml");
  const audit = source("scripts/billing-integrity-audit.ts");
  assert.match(packageJson, /billing:integrity-audit/);
  assert.match(workflow, /Verify billing database integrity/);
  assert.match(workflow, /ALLOW_BILLING_INTEGRITY_AUDIT/);
  assert.match(audit, /cross-tenant subscription payment method/);
  assert.match(audit, /cross-tenant renewal subscription/);
  assert.match(audit, /non-SAR payment currency/);
  assert.match(audit, /authorized checkout blocks duplicate open checkout/);
  assert.match(audit, /paid payment without immutable receipt snapshot/);
  assert.match(audit, /BillingPayment_one_open_checkout_per_business/);
});

test("billing and renewal logic remains portable to Hetzner", () => {
  const files = [source("app/lib/moyasar-core.ts"), source("app/lib/billing-ledger.ts"), source("scripts/billing-renewal-worker.ts")].join("\n");
  assert.doesNotMatch(files, /from\s+["']@vercel\//);
  assert.doesNotMatch(files, /VERCEL_ENV/);
  assert.match(source("scripts/billing-renewal-worker.ts"), /PAYMENT_PROVIDER.*moyasar/);
});
