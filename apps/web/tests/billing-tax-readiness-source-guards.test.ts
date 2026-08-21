import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("paid checkout is fail-closed and receipts render only immutable payment snapshots", () => {
  const policy = source("app/lib/billing-tax-core.ts");
  const action = source("app/actions/billing.ts");
  const audit = source("scripts/launch-config-audit.ts");
  const stateAudit = source("scripts/billing-state-audit.ts");
  const receipt = source("app/dashboard/billing/receipt/[billingId]/page.tsx");
  const ledger = source("app/lib/billing-ledger.ts");
  const worker = source("scripts/billing-renewal-worker.ts");

  assert.match(policy, /not_registered/);
  assert.match(policy, /vat_registered/);
  assert.match(policy, /return false;/);
  assert.match(action, /paidBillingTaxReady\(\)/);
  assert.match(action, /tax-setup-required/);
  assert.match(audit, /BILLING_SELLER_LEGAL_NAME_AR/);
  assert.match(audit, /BILLING_SELLER_ADDRESS_AR/);
  assert.match(audit, /BILLING_TAX_STATUS/);
  assert.match(audit, /Paid launch is blocked for a VAT-registered seller/);

  assert.match(ledger, /const receipt = receiptSnapshot\(billing\.id, billing\.amount\)/);
  assert.match(worker, /const receipt = receiptSnapshot\(billingId, billing\.amount\)/);
  assert.match(worker, /paidBillingTaxReady\(\)/);
  assert.match(stateAudit, /paid billing row lacks a valid immutable receipt snapshot/);

  assert.match(receipt, /payment\.receiptSellerLegalName/);
  assert.match(receipt, /payment\.receiptSellerAddress/);
  assert.match(receipt, /payment\.receiptTaxStatus !== "not_registered"/);
  assert.match(receipt, /payment\.receiptIssuedAt/);
  assert.match(receipt, /إيصال دفع غير ضريبي/);
  assert.doesNotMatch(receipt, /process\.env\.BILLING_SELLER/);
  assert.doesNotMatch(receipt, /billingTaxStatus/);
});
