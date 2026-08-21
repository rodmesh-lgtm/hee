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
    "app/api/billing/moyasar/webhook/route.ts",
  ]) {
    const value = source(path);
    assert.match(value, /providerPaymentCreatedWithinBillingWindow\(billing\.createdAt, payment\)/);
    assert.match(value, /stale_checkout_payment/);
  }
});

test("settled stale payments are reversed rather than granting an old-price entitlement", () => {
  const core = source("app/lib/moyasar-core.ts");
  const created = source("app/api/billing/moyasar/created/route.ts");
  const webhook = source("app/api/billing/moyasar/webhook/route.ts");
  assert.match(core, /\/payments\/\$\{encoded\}\/void/);
  assert.match(core, /\/payments\/\$\{encoded\}\/refund/);
  assert.match(created, /reverseMoyasarPayment\(payment\.id\)/);
  assert.match(webhook, /reverseMoyasarPayment\(payment\.id\)/);
});

test("Moyasar form loads only after explicit renewal, cancellation and refund disclosure", () => {
  const form = source("components/billing/moyasar-checkout.tsx");
  assert.match(form, /if \(!accepted\)/);
  assert.match(form, /أوافق وأتابع للدفع الآمن/);
  assert.match(form, /التجدد شهريًا|يتجدد شهريًا/);
  assert.match(form, /الاسترداد ليس تلقائيًا|الاسترداد.*تلقائي/);
  assert.match(form, /href="\/terms"/);
  assert.match(form, /href="\/privacy"/);
});
