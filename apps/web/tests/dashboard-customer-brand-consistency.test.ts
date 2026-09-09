import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const verification = read("app/dashboard/verification/page.tsx");
const tools = read("app/dashboard/tools/page.tsx");
const identity = read("app/dashboard/digital-identity/page.tsx");
const store = read("app/dashboard/business-store/page.tsx");

test("primary customer dashboard surfaces use the INFRO brand consistently", () => {
  for (const page of [verification, tools, identity, store]) assert.doesNotMatch(page, /HEE/);
  assert.match(verification, /شارة توثيق (?:INFRO|iR)/);
  assert.match(verification, /إدارة (?:INFRO|iR)/);
  assert.match(tools, /أدوات (?:INFRO|iR)/);
  assert.match(identity, /رابط INFRO الدائم/);
  assert.match(store, /INFRO BUSINESS STORE/);
});

test("customer-facing unavailable states explain reality without dead controls", () => {
  assert.match(tools, /لن نعرض أدوات غير مكتملة داخل حسابك/);
  assert.match(tools, /href="\/dashboard\/settings"/);
  assert.match(store, /لا توجد منتجات متاحة حاليًا/);
  assert.match(store, /ستظهر المنتجات هنا تلقائيًا عند تفعيلها/);
  assert.match(verification, /aria-live="polite"/);
});
