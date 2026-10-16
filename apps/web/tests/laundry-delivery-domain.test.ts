import test from "node:test";
import assert from "node:assert/strict";
import { laundryDeliveryTransition as transition } from "../app/lib/laundry-delivery-domain";
import { memberCanAccess,staffCanOpenPath } from "../app/lib/staff-permissions";
test("delivery permission grants assigned-job workspace without cashier or accounts",()=>{
 assert.equal(memberCanAccess(["laundryDelivery"],"laundry"),false);
 assert.equal(staffCanOpenPath("/Laundromat/Delivery",["laundryDelivery"]),true);
 assert.equal(staffCanOpenPath("/Laundromat",["laundryDelivery"]),false);
 assert.equal(staffCanOpenPath("/Laundromat/Delivery",["laundry"]),false);
});
test("delivery cannot skip route, reopen delivered or retry failure without owner",()=>{
 assert.equal(transition("assigned","delivered",true),false);
 assert.equal(transition("assigned","out_for_delivery",false),true);
 assert.equal(transition("out_for_delivery","delivered",false),true);
 assert.equal(transition("out_for_delivery","failed",false),true);
 assert.equal(transition("failed","assigned",false),false);
 assert.equal(transition("failed","assigned",true),true);
 assert.equal(transition("delivered","assigned",true),false);
});

test("accounting and operations scopes do not imply cashier or each other",()=>{
 for(const [section,path,denied] of [["laundryAccounting","/Laundromat/Accounting","/Laundromat/Operations"],["laundryOperations","/Laundromat/Operations","/Laundromat/Accounting"]]){
  assert.equal(staffCanOpenPath(path,[section]),true);assert.equal(staffCanOpenPath(denied,[section]),false);assert.equal(staffCanOpenPath("/Laundromat",[section]),false);assert.equal(staffCanOpenPath("/Laundromat/Delivery",[section]),false);
 }
});
