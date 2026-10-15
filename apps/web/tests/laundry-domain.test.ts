import test from "node:test";
import assert from "node:assert/strict";
import { laundryLines, moneyToHalalas, nextLaundryStatus } from "../app/lib/laundry-domain";
const service={id:"one",name:"ثوب — غسيل وكوي",category:"غسيل",price:525,active:true};
test("laundry amounts use exact minor units and reject malformed or excessive values",()=>{
 assert.equal(moneyToHalalas("5.25"),525);assert.equal(moneyToHalalas("0.10"),10);
 for(const value of ["-1","1e3","1.005","NaN","100000.01",""])assert.throws(()=>moneyToHalalas(value));
});
test("laundry prices come exclusively from active same-tenant catalog snapshots",()=>{
 const lines=laundryLines([{serviceId:"one",quantity:3}],[service]);assert.equal(lines[0].total,1575);
 assert.equal(lines[0].unitPrice,525);assert.throws(()=>laundryLines([{serviceId:"foreign",quantity:1}],[service]));
 assert.throws(()=>laundryLines([{serviceId:"one",quantity:1}],[{...service,active:false}]));
 for(const quantity of [0,-1,1.5,101])assert.throws(()=>laundryLines([{serviceId:"one",quantity}],[service]));
 assert.throws(()=>laundryLines([{serviceId:"one",quantity:1},{serviceId:"one",quantity:2}],[service]));
});
test("laundry lifecycle is sequential and delivery requires full payment",()=>{
 assert.equal(nextLaundryStatus("received","processing",100),true);
 assert.equal(nextLaundryStatus("received","ready",0),false);
 assert.equal(nextLaundryStatus("ready","delivered",1),false);
 assert.equal(nextLaundryStatus("ready","delivered",0),true);
 assert.equal(nextLaundryStatus("delivered","received",0),false);
});
