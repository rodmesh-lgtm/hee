import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

test("Business Store is a real authenticated dashboard destination", () => {
  const nav = read("components/dashboard/dashboard-nav.ts");
  const shell = read("components/dashboard/dashboard-shell.tsx");
  const page = read("app/dashboard/business-store/page.tsx");
  assert.match(nav, /متجر الأعمال/);
  assert.match(nav, /\/dashboard\/business-store/);
  assert.match(shell, /"\/dashboard\/business-store": "متجر الأعمال"/);
  assert.match(page, /getCurrentUser/);
  assert.match(page, /getActiveBusinessForUser/);
  assert.match(page, /https:\/\/ir\.sa\/\$\{business\.slug\}/);
});

test("Business Store draft flow stays isolated from tenant customer orders and subscription billing", () => {
  const page = read("app/dashboard/business-store/page.tsx");
  const actions = read("app/actions/business-store.ts");
  assert.doesNotMatch(page, /updateOrderStatusAction|createOrder|BillingPayment|billing\/checkout/);
  assert.doesNotMatch(actions, /db\.order\.|billingPayment\.|subscription\.(create|update)/);
  assert.match(page, /مشترياتك هنا منفصلة تمامًا عن الطلبات/);
  assert.match(page, /مسودة متجر iR مستقلة عن طلبات زبائن المنشأة وعن اشتراك iR المتكرر/);
  assert.match(actions, /businessStoreOrder\.create/);
  assert.match(actions, /businessStoreOrderItem\.(create|update)/);
});

test("Business Store exposes real draft actions but keeps checkout closed", () => {
  const page = read("app/dashboard/business-store/page.tsx");
  const builder = read("components/business-store/business-store-draft-builder.tsx");
  assert.match(page, /BusinessStoreDraftBuilder/);
  // Guard the product behavior rather than a fragile exact sentence: the customer
  // surface must still say payment opens only after a separate safe store flow exists.
  assert.match(page, /سيُفتح الدفع فقط بعد إضافة مسار متجر مستقل وآمن/);
  assert.match(builder, /createBusinessStoreDraftAction/);
  assert.match(builder, /setBusinessStoreDraftItemAction/);
  assert.match(builder, /أضف لمسودة الطلب/);
  assert.match(builder, /المسودة ليست طلب شراء نهائيًا ولا تنشئ أي عملية دفع/);
  assert.doesNotMatch(page + builder, /billing\/checkout|providerPaymentId|api\.qrserver\.com|chart\.googleapis\.com/);
});
