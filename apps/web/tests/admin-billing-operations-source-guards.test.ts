import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("../app/admin/billing/page.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../app/admin/billing/payments/[id]/page.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/admin/layout.tsx", import.meta.url), "utf8");

test("central billing operations remain server-admin protected and read-only", () => {
  assert.match(page, /await requireAdmin\(\)/);
  assert.match(detail, /await requireAdmin\(\)/);
  assert.match(layout, /href="\/admin\/billing"/);
  assert.doesNotMatch(page, /billingPayment\.(create|update|delete)/);
  assert.doesNotMatch(page, /subscription\.(create|update|delete)/);
  assert.doesNotMatch(detail, /billingPayment\.(create|update|delete)/);
  assert.doesNotMatch(detail, /subscription\.(create|update|delete)/);
});

test("billing UI keeps access-code grants distinct from the paid ledger", () => {
  assert.match(page, /subscriptionAccessGrant\.count/);
  assert.match(page, /accessGrants:/);
  assert.match(page, /access_code/);
  assert.match(page, /لا تنشئ BillingPayment وهمية/);
});

test("payment evidence view never reads encrypted payment method tokens or webhook payload bodies", () => {
  assert.doesNotMatch(page, /encryptedToken/);
  assert.doesNotMatch(detail, /encryptedToken/);
  assert.doesNotMatch(detail, /event\.payload|payload\s*:/);
  assert.match(detail, /providerEventId/);
  assert.match(detail, /receiptIssuedAt/);
});
