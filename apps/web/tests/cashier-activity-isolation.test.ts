import assert from "node:assert/strict";
import test from "node:test";
import {cashierActivityProfile,cashierServiceAllowed} from "../app/lib/cashier-activity";
import {accountingActivity} from "../app/lib/accounting-program";
import {resolveLaundryPreset} from "../app/lib/laundry-catalog";

test("workshops cannot become clothing laundries through stale presets or generic type metadata",()=>{
 for(const business of [{businessType:"WORKSHOP"},{businessType:"WORKSHOP",businessCategory:"خدمات"},{businessType:"خدمات",businessCategory:"ورشة / صيانة"},{businessType:"خدمات",businessCategory:"صيانة السيارات"}]) {
  assert.equal(cashierActivityProfile(business).id,"workshop");
  assert.equal(accountingActivity(business,true),"general");
  assert.equal(cashierServiceAllowed(business,resolveLaundryPreset("thobe","wash_iron")!),false);
  assert.equal(cashierServiceAllowed(business,{name:"تغيير زيت المحرك",category:"صيانة دورية"}),true);
 }
});
test("explicit and generic legacy laundry catalogues stay tenant-local",()=>{
 const preset=resolveLaundryPreset("thobe","wash_iron")!;
 for(const business of [{businessType:"Laundry"},{businessType:"خدمات",businessCategory:"مغاسل الملابس"}]) {
  assert.equal(cashierActivityProfile(business).id,"laundry");assert.equal(cashierServiceAllowed(business,preset),true);
 }
 assert.equal(accountingActivity({businessType:"خدمات"},true),"laundry");
});
test("activities use their own labels without inferring identity from a customer name",()=>{
 const cases=[['مغسلة سيارات','car_wash'],['مطعم','restaurant'],['متجر','retail'],['صالون','salon'],['بقالة','grocery']] as const;
 for(const [businessCategory,id] of cases){const business={businessType:"خدمات",businessCategory};assert.equal(cashierActivityProfile(business).id,id);assert.equal(cashierServiceAllowed(business,resolveLaundryPreset("thobe","iron")!),false);}
 assert.equal(cashierServiceAllowed({businessType:"WORKSHOP"},{name:"تنظيف مقاعد السيارة",category:"عناية بالسيارات"}),true);
});

test("custom wash-and-iron categories cannot appear in a workshop even when the item name is not a preset",()=>{
 const business={businessType:"WORKSHOP",businessCategory:"ورشة / صيانة سيارات"};
 assert.equal(cashierServiceAllowed(business,{name:"إزالة البقع",category:"غسيل وكوي"},true),false);
 for(const category of ["غسيل   وكوي","غسيلوكوي","Wash & Iron"])assert.equal(cashierServiceAllowed(business,{name:"إزالة البقع",category},true),false);
 assert.equal(cashierActivityProfile(business,true).id,"workshop");
 assert.equal(cashierServiceAllowed({businessType:"RETAIL"},{name:"قميص قطني",category:"ملابس رجالية"}),true);
});
test("legacy generic laundry retains saved service objects and prices without overriding other declared activities",()=>{
 const services=[{id:"saved-iron",name:"ثوب — كوي",category:"ملابس رجالية",price:1200},{id:"saved-wash",name:"إزالة البقع",category:"غسيل وكوي",price:900}];
 const business={businessType:"خدمات"};
 const profile=cashierActivityProfile(business,true);assert.equal(profile.id,"laundry");
 const visible=services.filter(s=>cashierServiceAllowed(business,s,true));assert.deepEqual(visible,services);assert.equal(visible[0],services[0]);assert.equal(visible[0].price,1200);
 for(const businessType of ["WORKSHOP","RETAIL","CLINIC","SALON"])assert.notEqual(cashierActivityProfile({businessType},true).id,"laundry");
});
