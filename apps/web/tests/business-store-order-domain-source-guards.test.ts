import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");
const schema = read("prisma/schema.prisma");
const migration = read("prisma/migrations/20260824123000_business_store_order_domain/migration.sql");

test("HEE merchandise orders have an isolated tenant-owned Prisma domain", () => {
  assert.match(schema, /model BusinessStoreOrder \{/);
  assert.match(schema, /model BusinessStoreOrderItem \{/);
  assert.match(schema, /businessStoreOrders BusinessStoreOrder\[\]/);
  assert.match(schema, /business Business @relation\(fields: \[businessId\], references: \[id\], onDelete: Restrict\)/);
  assert.match(schema, /@@unique\(\[businessId, idempotencyKey\], map: "BusinessStoreOrder_business_idempotency_unique"\)/);
  assert.match(schema, /@@unique\(\[paymentProvider, providerPaymentId\], map: "BusinessStoreOrder_provider_payment_unique"\)/);
  assert.doesNotMatch(schema, /model BusinessStoreOrder[\s\S]*?customer Customer/);
  assert.doesNotMatch(schema, /model BusinessStoreOrder[\s\S]*?subscription Subscription/);
});

test("database enforces commercial arithmetic and finite order/payment states", () => {
  assert.match(migration, /BusinessStoreOrder_amounts_nonnegative_check/);
  assert.match(migration, /"total" = "subtotal" \+ "shippingAmount" \+ "vatAmount"/);
  assert.match(migration, /BusinessStoreOrderItem_quantity_check/);
  assert.match(migration, /"lineTotal" = "unitPrice" \* "quantity"/);
  assert.match(migration, /"status" IN \('draft', 'submitted', 'processing', 'shipped', 'fulfilled', 'cancelled'\)/);
  assert.match(migration, /"paymentStatus" IN \('unpaid', 'pending', 'paid', 'failed', 'refunded'\)/);
  assert.match(migration, /BusinessStoreOrder_currency_check/);
  assert.match(migration, /BusinessStoreOrder_payment_provider_pair_check/);
  assert.match(migration, /BusinessStoreOrder_submitted_timestamp_check/);
  assert.match(migration, /BusinessStoreOrder_cancelled_timestamp_check/);
  assert.match(migration, /BusinessStoreOrder_fulfilled_timestamp_check/);
});

test("store order history cannot be silently reassigned, cascaded, re-priced, or reopened", () => {
  assert.match(migration, /REFERENCES "Business"\("id"\) ON DELETE RESTRICT/);
  assert.match(migration, /REFERENCES "BusinessStoreOrder"\("id"\) ON DELETE RESTRICT/);
  assert.match(migration, /BusinessStoreOrder_snapshot_immutable/);
  assert.match(migration, /submitted business store order commercial snapshot is immutable/);
  assert.match(migration, /BusinessStoreOrder_valid_transition/);
  assert.match(migration, /OLD\."status" = 'draft' AND NEW\."status" IN \('submitted', 'cancelled'\)/);
  assert.match(migration, /OLD\."status" = 'shipped' AND NEW\."status" = 'fulfilled'/);
  assert.match(migration, /invalid business store order status transition/);
  assert.match(migration, /OLD\."paymentStatus" = 'paid' AND NEW\."paymentStatus" = 'refunded'/);
  assert.match(migration, /invalid business store payment status transition/);
  assert.match(migration, /BusinessStoreOrderItem_draft_only_update/);
  assert.match(migration, /old_parent_status IS DISTINCT FROM 'draft'/);
  assert.match(migration, /new_parent_status IS DISTINCT FROM 'draft'/);
  assert.match(migration, /business store order items are immutable after submission/);
});

test("store order identity and design are durable snapshots rather than live business references", () => {
  for (const field of [
    "businessNameSnapshot",
    "businessSlugSnapshot",
    "publicUrlSnapshot",
    "logoUrlSnapshot",
    "primaryColorSnapshot",
    "secondaryColorSnapshot",
    "identitySnapshot",
    "customizationSnapshot",
  ]) {
    assert.match(schema, new RegExp(`\\b${field}\\b`));
    assert.match(migration, new RegExp(`"${field}"`));
  }
});
