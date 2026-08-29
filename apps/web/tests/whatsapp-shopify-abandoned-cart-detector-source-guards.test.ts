import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const detectorPath = new URL("../app/lib/whatsapp/shopify-abandoned-cart-detector.ts", import.meta.url);
const workerPath = new URL("../scripts/whatsapp-shopify-abandoned-cart-worker.ts", import.meta.url);
const operationsPath = new URL("../app/lib/whatsapp/operations-worker.ts", import.meta.url);
const packagePath = new URL("../package.json", import.meta.url);

test("Shopify abandonment detector only leases old active carts from active Shopify integrations", async () => {
  const source = await readFile(detectorPath, "utf8");
  assert.match(source, /c\."state" = 'active'/);
  assert.match(source, /c\."occurredAt" <= \$\{cutoff\}/);
  assert.match(source, /i\."provider" = 'shopify'/);
  assert.match(source, /i\."status" = 'active'/);
  assert.match(source, /FOR UPDATE OF c SKIP LOCKED/);
  assert.match(source, /pg_advisory_xact_lock/);
});

test("Shopify abandonment detector rechecks cart state under lock and uses durable lifecycle transition", async () => {
  const source = await readFile(detectorPath, "utf8");
  assert.match(source, /current\.state !== "active"/);
  assert.match(source, /current\.occurredAt > cutoff/);
  assert.match(source, /applyWhatsAppAutomationCartTransitionInTransaction/);
  assert.match(source, /state: "abandoned"/);
  assert.match(source, /shopify:abandoned:/);
});

test("abandoned cart detector is part of the operational worker chain", async () => {
  const [worker, operations, packageJson] = await Promise.all([
    readFile(workerPath, "utf8"),
    readFile(operationsPath, "utf8"),
    readFile(packagePath, "utf8"),
  ]);
  assert.match(worker, /detectNextAbandonedShopifyCart/);
  assert.match(operations, /"whatsapp:shopify-abandoned-carts"/);
  assert.match(packageJson, /"whatsapp:shopify-abandoned-carts"/);
});
