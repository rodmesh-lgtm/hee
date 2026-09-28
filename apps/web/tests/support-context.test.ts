import assert from "node:assert/strict";
import test from "node:test";
import { readSupportContext, supportContextForPath } from "../app/lib/support-context";

test("support stores only known section keys, never URLs or caller objects", () => {
  for (const value of ["__proto__", "constructor", "toString", "https://example.com", "/dashboard?token=secret", ["meta"], { context: "meta" }, null]) {
    assert.equal(readSupportContext(value), null);
  }
  assert.equal(readSupportContext("meta"), "meta");
});

test("nested customer routes map to a section without retaining identifiers", () => {
  assert.equal(supportContextForPath("/dashboard/whatsapp/campaigns/customer-private-id"), "campaigns");
  assert.equal(supportContextForPath("/dashboard/whatsapp/setup"), "meta");
  assert.equal(supportContextForPath("/dashboard/working-hours"), "booking");
  assert.equal(supportContextForPath("/dashboard/billing/manage"), "billing");
  assert.equal(supportContextForPath("/dashboard/unknown"), "dashboard");
  assert.equal(supportContextForPath("/dashboard/support"), null);
  assert.equal(supportContextForPath("/dashboard-evil"), null);
});
