import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("customer support writes are authenticated, tenant-bound and throttled", () => {
  const support = source("app/actions/support.ts");
  assert.match(support, /getCurrentUserForWrites\(\)/);
  assert.match(support, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(support, /businessId:\s*business\.id/);
  assert.match(support, /scope:\s*"customer-support"/);
  assert.match(support, /limit:\s*8/);
  assert.match(support, /requireAdmin\(\)/);
});

test("customer support reads are scoped to the active business", () => {
  const page = source("app/dashboard/support/page.tsx");
  assert.match(page, /businessId:\s*business\.id,\s*eventType:\s*"support_requested"/);
});

test("data export requires an authenticated owned active business and never exports credentials", () => {
  const route = source("app/api/dashboard/export/route.ts");
  assert.match(route, /getCurrentUser\(\)/);
  assert.match(route, /getActiveBusinessForUser\(user\.id\)/);
  assert.match(route, /ownerId:\s*user\.id/);
  assert.match(route, /Cache-Control[\s\S]*private, no-store/);
  assert.match(route, /Referrer-Policy[\s\S]*no-referrer/);
  assert.doesNotMatch(route, /passwordHash:\s*true/);
  assert.doesNotMatch(route, /sessions:\s*true/);
  assert.match(route, /MAX_EXPORT_BYTES/);
});

test("data export includes safe billing history without reusable payment secrets", () => {
  const route = source("app/api/dashboard/export/route.ts");
  assert.match(route, /db\.billingPayment\.findMany/);
  assert.match(route, /db\.billingPaymentMethod\.findMany/);
  assert.match(route, /last4:\s*true/);
  assert.match(route, /brand:\s*true/);
  assert.match(route, /billing:\s*\{\s*payments:\s*billingPayments,\s*paymentMethods/);
  assert.doesNotMatch(route, /encryptedToken:\s*true/);
  assert.doesNotMatch(route, /providerGivenId:\s*true/);
  assert.doesNotMatch(route, /providerPaymentId:\s*true/);
});
