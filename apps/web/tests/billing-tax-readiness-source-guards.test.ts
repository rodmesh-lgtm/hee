import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

test("paid checkout is fail-closed until seller tax posture is explicitly ready", () => {
  const policy = source("app/lib/billing-tax-core.ts");
  const action = source("app/actions/billing.ts");
  const audit = source("scripts/launch-config-audit.ts");
  const receipt = source("app/dashboard/billing/receipt/[billingId]/page.tsx");

  assert.match(policy, /not_registered/);
  assert.match(policy, /vat_registered/);
  assert.match(policy, /return false;/);
  assert.match(action, /paidBillingTaxReady\(\)/);
  assert.match(action, /tax-setup-required/);
  assert.match(audit, /BILLING_SELLER_LEGAL_NAME_AR/);
  assert.match(audit, /BILLING_SELLER_ADDRESS_AR/);
  assert.match(audit, /BILLING_TAX_STATUS/);
  assert.match(audit, /Paid launch is blocked for a VAT-registered seller/);
  assert.match(receipt, /إيصال دفع غير ضريبي/);
  assert.match(receipt, /ليست فاتورة ضريبية متوافقة مع ZATCA/);
});
