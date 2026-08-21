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
  assert.match(core, /pk_live_/);
  assert.match(core, /sk_live_/);
  assert.match(core, /pk_test_/);
  assert.match(core, /sk_test_/);
  assert.match(core, /APP_ENV/);
});

test("billing database migration enforces ledger uniqueness and subscription renewal ownership", () => {
  const migration = source("prisma/migrations/20260821172000_moyasar_billing/migration.sql");
  assert.match(migration, /BillingPayment_provider_payment_unique/);
  assert.match(migration, /BillingPayment_provider_given_unique/);
  assert.match(migration, /BillingPayment_renewal_attempt_unique/);
  assert.match(migration, /BillingWebhookEvent_provider_event_unique/);
  assert.match(migration, /Subscription_payment_method_fkey/);
  assert.doesNotMatch(migration, /ADD COLUMN "provider" TEXT/);
});

test("Prisma schema models financial ledger and subscription billing columns", () => {
  const schema = source("prisma/schema.prisma");
  assert.match(schema, /model BillingPaymentMethod/);
  assert.match(schema, /model BillingPayment/);
  assert.match(schema, /model BillingWebhookEvent/);
  assert.match(schema, /autoRenew Boolean/);
  assert.match(schema, /providerReference String\?/);
  assert.match(schema, /paymentMethodId String\?/);
});

test("renewal retries reuse Moyasar idempotency keys and expire paid entitlement safely", () => {
  const worker = source("scripts/billing-renewal-worker.ts");
  assert.match(worker, /providerGivenId/);
  assert.match(worker, /givenId: billing\.providerGivenId/);
  assert.match(worker, /provider_request_ambiguous/);
  assert.match(worker, /markPastDue/);
  assert.match(worker, /status" IN \('active','past_due'\)/);
  assert.match(worker, /"subscriptionId" = \$\{newSubscriptionId\}/);
  assert.match(worker, /expireEndedNonRenewingSubscriptions/);
  assert.match(worker, /"autoRenew" = false/);
  assert.match(worker, /data: \{ planId: free\.id \}/);
});

test("canceling auto-renew also revokes the reusable payment method", () => {
  const actions = source("app/actions/billing.ts");
  const button = source("components/billing/cancel-renewal-button.tsx");
  assert.match(actions, /autoRenew:\s*false/);
  assert.match(actions, /billingPaymentMethod\.updateMany/);
  assert.match(actions, /status:\s*"revoked"/);
  assert.match(button, /window\.confirm/);
});

test("refunds only revoke the exact entitlement created by the refunded payment", () => {
  const ledger = source("app/lib/billing-ledger.ts");
  assert.match(ledger, /active\.id === billing\.subscriptionId/);
  assert.match(ledger, /provider-payment-mismatch/);
  assert.match(ledger, /payment\.status !== "refunded"/);
});

test("checkout records provider payment IDs before redirect and blocks duplicate form reuse", () => {
  const checkout = source("components/billing/moyasar-checkout.tsx");
  const created = source("app/api/billing/moyasar/created/route.ts");
  const page = source("app/dashboard/billing/checkout/page.tsx");
  assert.match(checkout, /on_completed/);
  assert.match(checkout, /\/api\/billing\/moyasar\/created/);
  assert.match(created, /getOwnedBillingPayment/);
  assert.match(created, /fetchMoyasarPayment\(paymentId\)/);
  assert.match(created, /payment\.amount !== billing\.amount/);
  assert.match(page, /providerStarted/);
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
  assert.match(audit, /paymentProvider !== "moyasar"/);
  assert.match(audit, /MOYASAR_PUBLISHABLE_KEY/);
  assert.match(audit, /pk_live_/);
  assert.match(audit, /MOYASAR_SECRET_KEY/);
  assert.match(audit, /sk_live_/);
  assert.match(audit, /MOYASAR_WEBHOOK_SECRET/);
  assert.match(audit, /BILLING_TOKEN_ENCRYPTION_KEY/);
  assert.match(audit, /BILLING_RENEWAL_ENABLED/);
});

test("billing and renewal logic remains portable to Hetzner", () => {
  const files = [
    source("app/lib/moyasar-core.ts"),
    source("app/lib/billing-ledger.ts"),
    source("scripts/billing-renewal-worker.ts"),
  ].join("\n");
  assert.doesNotMatch(files, /from\s+["']@vercel\//);
  assert.doesNotMatch(files, /VERCEL_ENV/);
  assert.match(source("scripts/billing-renewal-worker.ts"), /PAYMENT_PROVIDER.*moyasar/);
});
