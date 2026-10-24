import test from "node:test";
import assert from "node:assert/strict";
import { laundryLines,laundryServiceSpeed,withLaundryServiceSpeed,type LaundryLine,type LaundryServiceSpeed } from "../app/lib/laundry-domain";
import { quoteSubscriberOrder } from "../app/lib/accounting-packages";
const lines:LaundryLine[]=laundryLines([{serviceId:"wash",quantity:2}],[{id:"wash",name:"Wash",category:"Laundry",active:true,price:500}]);
test("normal and urgent survive persisted service snapshots without changing money or descriptions",()=>{
 for(const speed of ["normal","urgent"] as const){
  const stored=JSON.parse(JSON.stringify(withLaundryServiceSpeed(lines,speed))) as LaundryLine[];
  assert.equal(laundryServiceSpeed(stored),speed);
  assert.equal(stored[0].total,1000);
  assert.equal(stored[0].name,"Wash");
  assert.equal(lines[0].serviceSpeed,undefined);
  assert.equal(quoteSubscriberOrder([],stored,0).total,1000);
 }
});
test("old invoices keep unspecified speed; invalid or mixed speeds are not mislabeled",()=>{
 assert.equal(laundryServiceSpeed(lines),undefined);
 assert.equal(laundryServiceSpeed([]),undefined);
 assert.equal(laundryServiceSpeed([...withLaundryServiceSpeed(lines,"normal"),...withLaundryServiceSpeed(lines,"urgent")]),undefined);
 assert.throws(()=>withLaundryServiceSpeed(lines,"invalid" as LaundryServiceSpeed));
});
