import assert from "node:assert/strict";
import test from "node:test";
import { STAFF_SECTIONS, memberCanAccess, staffCanOpenPath, staffSections } from "../app/lib/staff-permissions";

test("employee permissions fail closed and do not grant owner-only sections", () => {
  assert.deepEqual(staffSections(["appointments", "billing", "__proto__", "appointments", 1]), ["appointments"]);
  for (const [key, section] of Object.entries(STAFF_SECTIONS)) {
    assert.equal(staffCanOpenPath(section.href, [key]), true);
    assert.equal(staffCanOpenPath(section.href, []), false);
  }
  for (const path of ["/dashboard/staff", "/dashboard/billing", "/dashboard/account-deletion", "/dashboard/unknown"]) assert.equal(staffCanOpenPath(path, Object.keys(STAFF_SECTIONS)), false);
  assert.equal(staffCanOpenPath("/dashboard/settings", []), true);
  assert.equal(staffCanOpenPath("/dashboard/appointments", ["orders"]), false);
  assert.equal(memberCanAccess(null, "whatsapp"), true);
  assert.equal(memberCanAccess(null, "appointments"), false);
  assert.equal(memberCanAccess([], "whatsapp"), false);
});
