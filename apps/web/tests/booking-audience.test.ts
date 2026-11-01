import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { bookingAudience, bookingOrderRequired } from "../app/lib/commerce/booking-audience";
import { normalizePageModulesForPersistence } from "../app/lib/page-modules";

test("booking audience preserves legacy behavior and allows explicit public booking with a connected store", () => {
  assert.equal(bookingOrderRequired("legacy", false), false);
  assert.equal(bookingOrderRequired("legacy", true), true);
  for (const connected of [false, true]) {
    assert.equal(bookingOrderRequired("everyone", connected), false);
    assert.equal(bookingOrderRequired("store_orders", connected), true);
  }
});

test("audience belongs to each business and survives page settings normalization", () => {
  const first = [{ id: "contact", config: { bookingAudience: "everyone", invoicePhone: "0500000000" } }];
  const second = [{ id: "contact", config: { bookingAudience: "store_orders" } }];
  const normalized = normalizePageModulesForPersistence(first, "services");
  assert.equal(bookingAudience(normalized), "everyone");
  assert.equal(bookingAudience(second), "store_orders");
  assert.equal(normalized.find(item => item.id === "contact")?.config.invoicePhone, "0500000000");
  assert.equal(bookingAudience(null), "legacy");
  assert.equal(bookingAudience([{ id: "contact", config: { bookingAudience: "invalid" } }]), "legacy");
  assert.equal(bookingAudience([...first, ...second]), "store_orders");
});


test("server booking gate enforces tenant isolation", () => {
  const result = spawnSync(process.execPath, ["--conditions=react-server", "--import", "tsx", "--test", "tests/booking-audience.integration.ts"], { encoding: "utf8", timeout: 30000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
