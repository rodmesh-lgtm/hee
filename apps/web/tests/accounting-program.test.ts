import assert from "node:assert/strict";
import test from "node:test";
import { accountingActivity, allowedAccountingViews } from "../app/lib/accounting-program";
import { staffCanOpenPath } from "../app/lib/staff-permissions";
import { dashboardNavItems } from "../components/dashboard/dashboard-nav";
import { orderDashboardItems } from "../lib/dashboard-navigation-order";

test("one program entry replaces legacy role links, preserving its saved position", () => {
  const items = dashboardNavItems.filter(item => item.href.startsWith("/Accounting") || item.href.startsWith("/Laundromat"));
  assert.deepEqual(items.map(item => [item.label, item.href]), [["البرنامج المحاسبي", "/Accounting"]]);
  const ordered = orderDashboardItems(dashboardNavItems, ["/dashboard", "/Laundromat/Accounting", "/dashboard/notes", "/Laundromat"]);
  assert.deepEqual(ordered.slice(0,3).map(item => item.href), ["/dashboard", "/Accounting", "/dashboard/notes"]);
  assert.equal(ordered.filter(item => item.href === "/Accounting").length, 1);
});

test("each accounting role retains its existing permission boundary", () => {
  for (const [permission, view] of [["laundry", "cashier"], ["laundryAccounting", "accounting"], ["laundryOperations", "operations"], ["laundryDelivery", "delivery"]]) {
    assert.equal(staffCanOpenPath("/Accounting", [permission]), true);
    assert.deepEqual(allowedAccountingViews(false, [permission]).map(item => item.id), [view]);
  }
  for (const permissions of [null, [], ["whatsapp"], ["unknown"]]) {
    assert.equal(staffCanOpenPath("/Accounting", permissions), false);
    assert.equal(allowedAccountingViews(false, permissions).length, 0);
  }
  assert.equal(allowedAccountingViews(true, []).length, 4);
});

test("specific activity wins while generic legacy laundry is preserved", () => {
  assert.equal(accountingActivity({ businessType: "خدمات", businessCategory: "مغاسل الملابس" }), "laundry");
  assert.equal(accountingActivity({ businessType: "Laundry" }), "laundry");
  assert.equal(accountingActivity({ businessType: "خدمات" }, true), "laundry");
  assert.equal(accountingActivity({ businessType: "خدمات", businessCategory: "صيانة السيارات" }), "general");
  assert.equal(accountingActivity({ businessType: "تجارة" }), "general");
});
