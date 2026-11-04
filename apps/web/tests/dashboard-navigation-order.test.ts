import test from "node:test";
import assert from "node:assert/strict";
import { moveDashboardItem, orderDashboardItems, validDashboardOrder } from "../lib/dashboard-navigation-order";
import { dashboardNavItems, dashboardNavGroups } from "../components/dashboard/dashboard-nav";

test("WhatsApp is immediately after work center in default navigation", () => {
  const ordered=dashboardNavGroups.flatMap(group=>dashboardNavItems.filter(item=>item.group===group.id));
  assert.deepEqual(ordered.slice(0,2).map(item=>item.href),["/dashboard","/dashboard/whatsapp"]);
});
test("saved order ignores removed/inaccessible routes and appends new sections", () => {
  const items=[{href:"home"},{href:"whatsapp"},{href:"new"}];
  assert.deepEqual(orderDashboardItems(items,["whatsapp","admin","whatsapp"]).map(item=>item.href),["whatsapp","home","new"]);
});
test("dragging and arrow movement preserve each section exactly once", () => {
  const order=["a","b","c"];
  assert.deepEqual(moveDashboardItem(order,"a","c"),["b","c","a"]);
  assert.deepEqual(moveDashboardItem(order,"c","a"),["c","a","b"]);
  assert.deepEqual(moveDashboardItem(order,"unknown","a"),order);
  assert.deepEqual(order,["a","b","c"]);
});
test("server preference validation rejects malformed, duplicated and unknown routes", () => {
  const allowed=["a","b"];
  for(const invalid of [null,{},"a",["a","a"],["a","admin"],[1]]) assert.equal(validDashboardOrder(invalid,allowed),false);
  assert.equal(validDashboardOrder([],allowed),true);
  assert.equal(validDashboardOrder(["b","a"],allowed),true);
});

test("visibility preferences round-trip without changing ordering or accepting arbitrary routes", async () => {
  const { dashboardPreferences, hiddenDashboardItems, validDashboardPreferences } = await import('../lib/dashboard-navigation-order');
  const allowed=['/dashboard','/dashboard/settings','/dashboard/support','/dashboard/whatsapp','/Accounting'];
  const saved=dashboardPreferences(allowed,['/Accounting','/dashboard/whatsapp']);
  assert.equal(validDashboardPreferences(saved,allowed),true);
  assert.deepEqual(hiddenDashboardItems(saved),['/Accounting','/dashboard/whatsapp']);
  assert.deepEqual(orderDashboardItems(allowed.map(href=>({href})),saved).map(item=>item.href),allowed);
  for(const invalid of [['hidden:/dashboard'],['hidden:/dashboard/settings'],['hidden:/dashboard/support'],['hidden:/admin'],['hidden:/Accounting','hidden:/Accounting'],[null],{}]) assert.equal(validDashboardPreferences(invalid,allowed),false);
  assert.equal(validDashboardPreferences(allowed,allowed),true);
  assert.deepEqual(hiddenDashboardItems([]),[]);
  assert.deepEqual(dashboardPreferences([],['/dashboard','/dashboard/settings']),[]);
});
