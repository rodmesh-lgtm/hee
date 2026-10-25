import test from "node:test";
import assert from "node:assert/strict";
import { cashierUrgentEnabled,hasClothingCatalogue } from "../app/lib/cashier-settings";
import { accountingActivity } from "../app/lib/accounting-program";
import { normalizePageModulesForPersistence } from "../app/lib/page-modules";
const configured=(value:unknown)=>[{id:"contact",enabled:true,config:{cashierUrgentEnabled:value,invoicePhone:"0112345678"}}];
test("only clothing laundries get speed options by default",()=>{
 for(const businessCategory of ["مغاسل الملابس","laundry"])assert.equal(cashierUrgentEnabled(null,{businessType:"خدمات",businessCategory}),true);
 for(const businessCategory of ["مغاسل السيارات","صيانة السيارات","متجر","مطعم","عيادة","car wash"]) {
  const business={businessType:"خدمات",businessCategory};
  assert.equal(accountingActivity(business),"general");assert.equal(cashierUrgentEnabled(null,business),false);
 }
});
test("owner opt-in and opt-out override defaults without changing business activity",()=>{
 assert.equal(cashierUrgentEnabled(configured(true),{businessType:"صيانة"}),true);
 assert.equal(cashierUrgentEnabled(configured(false),{businessType:"laundry"},true),false);
 assert.equal(cashierUrgentEnabled(configured("true"),{businessType:"متجر"}),false);
});
test("legacy clothing catalogue is preserved, car washes remain general",()=>{
 const legacy=hasClothingCatalogue([{name:"ثوب — غسيل وكوي"}]);assert.equal(legacy,true);
 assert.equal(cashierUrgentEnabled(null,{businessType:"خدمات"},legacy),true);
 assert.equal(accountingActivity({businessType:"مغسلة سيارات"},legacy),"general");
 assert.equal(hasClothingCatalogue([{name:"غسيل سيارة"}]),false);
});
test("persistence preserves explicit false and optional invoice contact",()=>{
 const contact=normalizePageModulesForPersistence(configured(false),"laundry").find(m=>m.id==="contact");
 assert.equal(contact?.config.cashierUrgentEnabled,false);assert.equal(contact?.config.invoicePhone,"0112345678");
});
