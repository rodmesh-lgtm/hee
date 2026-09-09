import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const visibleSurfaces = [
  "../components/public/public-action-dialog.tsx",
  "../components/public/public-save-contact.tsx",
  "../components/public/public-transaction-launcher.tsx",
  "../components/sections/feature-grid.tsx",
  "../app/preview/page.tsx",
  "../app/admin/customers/[id]/page.tsx",
  "../app/admin/billing/payments/[id]/page.tsx",
  "../app/admin-login/page.tsx",
  "../app/actions/admin-access-code.ts",
  "../app/lib/billing-tax-core.ts",
];

test("customer and operator copy uses INFRO rather than the retired product name", async () => {
  for (const path of visibleSurfaces) {
    const source = await readFile(new URL(path, import.meta.url), "utf8");
    assert.doesNotMatch(source, /\bHEE\b/, `retired visible product name remains in ${path}`);
  }
});
