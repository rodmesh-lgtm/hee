import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

function between(value: string, start: string, end: string) {
  const from = value.indexOf(start);
  assert.notEqual(from, -1, `missing start marker: ${start}`);
  const to = value.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `missing end marker after: ${start}`);
  return value.slice(from, to);
}

test("customer data export includes billing evidence without provider secrets", () => {
  const route = source("app/api/dashboard/export/route.ts");

  assert.match(route, /BillingCheckoutConsent/);
  assert.match(route, /checkoutConsents:\s*billingConsents/);
  for (const field of [
    "receiptSellerLegalName",
    "receiptSellerAddress",
    "receiptTaxStatus",
    "receiptNetAmount",
    "receiptVatAmount",
    "receiptIssuedAt",
  ]) assert.match(route, new RegExp(field));

  const paymentMethodQuery = between(route, "db.billingPaymentMethod.findMany({", "}),\n    // Checkout consent");
  assert.match(paymentMethodQuery, /last4:\s*true/);
  assert.doesNotMatch(paymentMethodQuery, /encryptedToken:\s*true/);

  const subscriptionQuery = between(route, "db.subscription.findMany({", "}),\n    db.billingPayment.findMany");
  assert.doesNotMatch(subscriptionQuery, /providerReference:\s*true/);

  const paymentQuery = between(route, "db.billingPayment.findMany({", "}),\n    \/\/ A customer has a right/);
  assert.doesNotMatch(paymentQuery, /providerPaymentId:\s*true/);
  assert.doesNotMatch(paymentQuery, /providerGivenId:\s*true/);

  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /Referrer-Policy": "no-referrer"/);
});
