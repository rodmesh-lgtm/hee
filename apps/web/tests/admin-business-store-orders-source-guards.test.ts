import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "..");
const action = fs.readFileSync(path.join(root, "app/actions/admin-business-store-orders.ts"), "utf8");
const migration = fs.readFileSync(path.join(root, "prisma/migrations/20260824215500_business_store_order_admin_ops/migration.sql"), "utf8");
const listPage = fs.readFileSync(path.join(root, "app/admin/store-orders/page.tsx"), "utf8");
const detailPage = fs.readFileSync(path.join(root, "app/admin/store-orders/[id]/page.tsx"), "utf8");

test("admin Business Store order mutations stay server-authorized, locked and audited", () => {
  assert.match(action, /requireAdmin\(\)/);
  assert.match(action, /pg_advisory_xact_lock/);
  assert.match(action, /FOR UPDATE/);
  assert.match(action, /BusinessStoreOrderAudit/);
  assert.match(action, /paymentStatus !== "paid"/);
  assert.doesNotMatch(action, /billingPayment\.(?:create|update|upsert)/i);
  assert.doesNotMatch(action, /paymentStatus"\s*=|"paymentStatus"\s*=|data:\s*\{[^}]*paymentStatus/s);
});

test("database blocks fulfillment lifecycle before paid and preserves an audit trail", () => {
  assert.match(migration, /BusinessStoreOrderAudit/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.match(migration, /NEW\."status" IN \('processing', 'shipped', 'fulfilled'\)/);
  assert.match(migration, /NEW\."paymentStatus" <> 'paid'/);
});

test("admin order UI exposes real operational data without fake tracking", () => {
  assert.match(listPage, /businessStoreOrder\.findMany/);
  assert.match(listPage, /paymentStatus/);
  assert.match(detailPage, /identitySnapshot/);
  assert.match(detailPage, /providerPaymentId/);
  assert.match(detailPage, /لا يوجد Shipment Provider أو tracking integration حقيقي/);
  assert.doesNotMatch(detailPage, /trackingNumber|رقم تتبع:\s*\w+/i);
});
