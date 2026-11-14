import test from "node:test";
import assert from "node:assert/strict";
import { PAID_SECTIONS, canUsePaidSection, paidSectionForPath, paidSectionForPermission, type PaidSection } from "../app/lib/paid-sections";
import { getPlanEntitlements } from "../app/lib/plan-entitlements";

test("free and unknown plans cannot use paid workspace sections",()=>{
 for(const code of [undefined,"FREE","unknown"]) for(const section of Object.keys(PAID_SECTIONS) as PaidSection[]) assert.equal(canUsePaidSection(getPlanEntitlements(code),section),false);
});
test("paid sections retain purchased service boundaries",()=>{
 const all=getPlanEntitlements("BUSINESS");for(const section of Object.keys(PAID_SECTIONS) as PaidSection[])assert.equal(canUsePaidSection(all,section),true);
 const accounting=getPlanEntitlements("ACCOUNTING_ONLY_35");assert.equal(canUsePaidSection(accounting,"accounting"),true);assert.equal(canUsePaidSection(accounting,"appointments"),false);assert.equal(canUsePaidSection(accounting,"liveView"),false);assert.equal(canUsePaidSection(accounting,"notes"),true);
});
test("route gates cover nested destinations without locking analytics or identity",()=>{
 for(const path of ["/dashboard/retail-analytics","/dashboard/retail-analytics/settings","/dashboard/branding","/dashboard/billing/manage","/dashboard/my-page"])assert.equal(paidSectionForPath(path),null);
 assert.equal(paidSectionForPath("/dashboard/live-view/setup?x=1"),"liveView");assert.equal(paidSectionForPath("/Accounting"),"accounting");assert.equal(paidSectionForPath("/Laundromat/Staff"),"accounting");assert.equal(paidSectionForPath("/dashboard/working-hours"),"appointments");assert.equal(paidSectionForPath("/dashboard/inbox"),"orders");assert.equal(paidSectionForPermission("businessAnalytics"),null);assert.equal(paidSectionForPermission("notes"),"notes");
});
