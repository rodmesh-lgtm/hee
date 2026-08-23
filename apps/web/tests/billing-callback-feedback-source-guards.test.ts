import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const callback = readFileSync(new URL("../app/api/billing/moyasar/callback/route.ts", import.meta.url), "utf8");
const settings = readFileSync(new URL("../app/dashboard/settings/page.tsx", import.meta.url), "utf8");

test("every explicit Moyasar callback outcome has customer-visible feedback", () => {
  const codes = new Set<string>();
  for (const match of callback.matchAll(/back\("([a-z0-9-]+)"\)/g)) codes.add(match[1]);
  assert.ok(codes.size >= 8, "callback outcome set unexpectedly shrank");
  for (const code of codes) {
    assert.match(settings, new RegExp(`code === \\"${code}\\"|code === \\"[^\\"]+\\" \\|\\| code === \\"${code}\\"`), `missing customer feedback for billing=${code}`);
  }
});

test("uncertain billing outcomes explicitly tell the customer not to duplicate payment", () => {
  for (const code of ["pending", "verification-unavailable", "failed"] as const) {
    const start = settings.indexOf(`code === "${code}"`);
    assert.ok(start >= 0, `missing ${code} feedback`);
    const block = settings.slice(start, start + 1200);
    assert.match(block, /لا تعِد|لا تنشئ عملية أخرى/);
  }
});

test("reversal outcomes explain that entitlement was not activated", () => {
  for (const code of ["payment-reversed", "checkout-expired", "checkout-consent-missing"] as const) {
    const start = settings.indexOf(`code === "${code}"`);
    assert.ok(start >= 0, `missing ${code} feedback`);
    const block = settings.slice(start, start + 1600);
    assert.match(block, /لم يتم تفعيل|لم يتم تفعيل الاشتراك/);
  }
});
