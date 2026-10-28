import assert from "node:assert/strict";
import test from "node:test";
import {cashierActivityProfile,cashierServiceAllowed} from "../app/lib/cashier-activity";
import {accountingActivity} from "../app/lib/accounting-program";
import {resolveLaundryPreset} from "../app/lib/laundry-catalog";

test("workshops cannot become clothing laundries through stale presets or generic type metadata",()=>{
 for(const business of [{businessType:"WORKSHOP"},{businessType:"خدمات",businessCategory:"ورشة / صيانة"},{businessType:"خدمات",businessCategory:"صيانة السيارات"}]) {
  assert.equal(cashierActivityProfile(business).id,"workshop");
  assert.equal(accountingActivity(business,true),"general");
  assert.equal(cashierServiceAllowed(business,resolveLaundryPreset("thobe","wash_iron")!),false);
  assert.equal(cashierServiceAllowed(business,{name:"تغيير زيت المحرك",category:"صيانة دورية"}),true);
 }
});
test("clothing catalogues remain available only to the tenant whose declared activity is laundry",()=>{
 const preset=resolveLaundryPreset("thobe","wash_iron")!;
 for(const business of [{businessType:"Laundry"},{businessType:"خدمات",businessCategory:"مغاسل الملابس"}]) {
  assert.equal(cashierActivityProfile(business).id,"laundry");assert.equal(cashierServiceAllowed(business,preset),true);
 }
 assert.equal(accountingActivity({businessType:"خدمات"},true),"general");
});
test("activities use their own labels without inferring identity from a customer name",()=>{
 const cases=[['مغسلة سيارات','car_wash'],['مطعم','restaurant'],['متجر','retail'],['صالون','salon'],['بقالة','grocery']] as const;
 for(const [businessCategory,id] of cases){const business={businessType:"خدمات",businessCategory};assert.equal(cashierActivityProfile(business).id,id);assert.equal(cashierServiceAllowed(business,resolveLaundryPreset("thobe","iron")!),false);}
 assert.equal(cashierServiceAllowed({businessType:"WORKSHOP"},{name:"تنظيف مقاعد السيارة",category:"عناية بالسيارات"}),true);
});
