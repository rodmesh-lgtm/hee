import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const adminAction = read("app/actions/admin-business-store.ts");
const adminPage = read("app/admin/store-products/page.tsx");
const customerPage = read("app/dashboard/business-store/page.tsx");
const catalog = read("app/lib/business-store-catalog.ts");
const migration = read("prisma/migrations/20260824210500_central_business_store_catalog/migration.sql");
const layout = read("app/admin/layout.tsx");

test("central catalog is protected by platform-admin authorization and audited", () => {
  assert.match(adminAction, /await requireAdmin\(\)/);
  assert.match(adminAction, /BusinessStoreCatalogAudit/);
  assert.match(adminAction, /actorUserId/);
  assert.match(migration, /FOREIGN KEY \("actorUserId"\) REFERENCES "User"/);
  assert.match(layout, /\/admin\/store-products/);
});

test("catalog products have database invariants instead of browser-only validation", () => {
  assert.match(migration, /unitPrice" > 0/);
  assert.match(migration, /maxQuantity" BETWEEN 1 AND 1000/);
  assert.match(migration, /sku_format/);
  assert.match(migration, /CREATE UNIQUE INDEX "BusinessStoreCatalogProduct_sku_key"/);
});

test("customer store reads only active products from the central database", () => {
  assert.match(catalog, /FROM "BusinessStoreCatalogProduct"/);
  assert.match(catalog, /WHERE "isActive" = true/);
  assert.match(customerPage, /await Promise\.all\(\[listBusinessStoreCatalogItems\(\)\]\)/);
  assert.doesNotMatch(customerPage, /BUSINESS_STORE_CATALOG/);
});

test("admin uses deactivate/reactivate rather than destructive product deletion", () => {
  assert.match(adminPage, /إيقاف المنتج/);
  assert.match(adminPage, /إعادة تفعيل المنتج/);
  assert.match(adminAction, /toggleBusinessStoreProductAdminAction/);
  assert.doesNotMatch(adminAction, /DELETE FROM "BusinessStoreCatalogProduct"/);
});

test("SKU is immutable after creation and price is parsed to integer halalas", () => {
  const updateSection = adminAction.slice(adminAction.indexOf("updateBusinessStoreProductAdminAction"));
  assert.doesNotMatch(updateSection, /SET\s+"sku"/);
  assert.match(adminAction, /sarToHalalas/);
  assert.match(adminAction, /Number\(whole\) \* 100/);
});
