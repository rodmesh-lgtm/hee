import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("provider-less checkout links expire before a new payment form can be created", () => {
  const checkout = source("app/dashboard/billing/checkout/page.tsx");
  const integrity = source("app/lib/billing-checkout-integrity.ts");
  assert.match(integrity, /BILLING_CHECKOUT_TTL_MS = 60 \* 60 \* 1000/);
  assert.match(checkout, /staleProviderlessCheckout/);
  assert.match(checkout, /billingCheckoutExpired\(billing\.createdAt\)/);
  assert.match(checkout, /انتهت صلاحية رابط الدفع القديم/);
});

test("all provider reconciliation paths reject payments created after the HEE checkout window", () => {
  for (const path of [
    "app/api/billing/moyasar/created/route.ts",
    "app/api/billing/moyasar/callback/route.ts",
    "app/lib/moyasar-webhook-processing.ts",
  ]) {
    const value = source(path);
    assert.match(value, /providerPaymentCreatedWithinBillingWindow\(billing\.createdAt, payment\)/);
    assert.match(value, /stale_checkout_payment/);
  }
});

test("settled stale payments are reversed rather than granting an old-price entitlement", () => {
  const core = source("app/lib/moyasar-core.ts");
  const created = source("app/api/billing/moyasar/created/route.ts");
  const processor = source("app/lib/moyasar-webhook-processing.ts");
  assert.match(core, /\/payments\/\$\{encoded\}\/void/);
  assert.match(core, /\/payments\/\$\{encoded\}\/refund/);
  assert.match(created, /reverseMoyasarPayment\(payment\.id\)/);
  assert.match(processor, /reverseMoyasarPayment\(payment\.id\)/);
});

test("Moyasar form loads only after explicit renewal, cancellation and refund disclosure", () => {
  const form = source("components/billing/moyasar-checkout.tsx");
  assert.match(form, /if \(!accepted\)/);
  assert.match(form, /\/api\/billing\/consent/);
  assert.match(form, /if \(!response\.ok\)/);
  assert.match(form, /setAccepted\(true\)/);
  assert.match(form, /أوافق وأتابع للدفع الآمن/);
  assert.match(form, /التجدد شهريًا|يتجدد شهريًا/);
  assert.match(form, /(?:الإلغاء لا يعني استردادًا تلقائيًا|الاسترداد ليس تلقائيًا|الاسترداد[^\n<]*تلقائي)/);
  assert.match(form, /href="\/terms"/);
  assert.match(form, /href="\/privacy"/);
});

test("checkout acceptance is stored as immutable versioned evidence and required before paid activation", () => {
  const migration = source("prisma/migrations/20260821203500_billing_checkout_consent/migration.sql");
  const consent = source("app/lib/billing-consent.ts");
  const endpoint = source("app/api/billing/consent/route.ts");
  assert.match(migration, /CREATE TABLE "BillingCheckoutConsent"/);
  assert.match(migration, /PRIMARY KEY \("billingPaymentId"\)/);
  assert.match(consent, /TERMS_VERSION/);
  assert.match(consent, /PRIVACY_VERSION/);
  assert.match(consent, /BILLING_DISCLOSURE_VERSION/);
  assert.match(endpoint, /recordBillingCheckoutConsent/);

  for (const path of [
    "app/api/billing/moyasar/created/route.ts",
    "app/api/billing/moyasar/callback/route.ts",
    "app/lib/moyasar-webhook-processing.ts",
  ]) {
    const value = source(path);
    assert.match(value, /hasBillingCheckoutConsent\(billing\.id\)/);
    assert.match(value, /missing_checkout_consent/);
    assert.match(value, /reverseMoyasarPayment\(payment\.id\)/);
  }
});
