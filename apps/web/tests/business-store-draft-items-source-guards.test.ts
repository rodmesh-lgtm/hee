import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const actionSource = readFileSync(join(here, "../app/actions/business-store.ts"), "utf8");
const catalogSource = readFileSync(join(here, "../app/lib/business-store-catalog.ts"), "utf8");

test("business store item price comes only from the server catalog", () => {
  assert.match(actionSource, /getBusinessStoreCatalogItem\(input\?\.sku\)/);
  assert.match(actionSource, /unitPrice: catalogItem\.unitPrice/);
  assert.match(actionSource, /const lineTotal = catalogItem\.unitPrice \* input\.quantity/);
  assert.doesNotMatch(actionSource, /input\?\.unitPrice|input\.unitPrice|input\?\.price|input\.price/);
  assert.match(catalogSource, /unitPrice: 12900/);
  assert.match(catalogSource, /Prices are stored in halalas and are authoritative on the server/);
});

test("draft item mutation is tenant-owned and draft-only at commit time", () => {
  assert.match(actionSource, /businessId: business\.id/);
  assert.match(actionSource, /business: \{ ownerId: user\.id, deletedAt: null \}/);
  assert.match(actionSource, /if \(order\.status !== "draft"\)/);
  assert.match(actionSource, /ORDER_NOT_DRAFT/);
});

test("same-order draft item writes serialize and subtotal is recomputed from stored lines", () => {
  assert.match(actionSource, /pg_advisory_xact_lock/);
  assert.match(actionSource, /business-store-order:\$\{input\.orderId\}/);
  assert.match(actionSource, /businessStoreOrderItem\.aggregate/);
  assert.match(actionSource, /_sum: \{ lineTotal: true \}/);
  assert.match(actionSource, /subtotal,/);
  assert.match(actionSource, /total: subtotal/);
});

test("draft item input remains bounded", () => {
  assert.match(actionSource, /Number\.isSafeInteger\(input\?\.quantity\)/);
  assert.match(actionSource, /input\.quantity > catalogItem\.maxQuantity/);
  assert.match(actionSource, /MAX_CUSTOMIZATION_JSON_BYTES = 16 \* 1024/);
  assert.match(actionSource, /INVALID_CUSTOMIZATION/);
});
