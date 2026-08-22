import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
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

  assert.doesNotMatch(route, /encryptedToken/);
  assert.doesNotMatch(route, /providerPaymentId/);
  assert.doesNotMatch(route, /providerGivenId/);
  assert.doesNotMatch(route, /providerReference/);
  assert.match(route, /Cache-Control": "private, no-store, max-age=0"/);
  assert.match(route, /Referrer-Policy": "no-referrer"/);
});
