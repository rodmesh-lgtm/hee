import test from "node:test";
import assert from "node:assert/strict";
import { allocateSubscriptions,packagePeriod,subscriberStatus,assertSubscriptionServices,type SubscriberBalance } from "../app/lib/accounting-packages";
const now=new Date("2026-10-22T12:00:00Z");
const sub=(overrides:Partial<SubscriberBalance>={}):SubscriberBalance=>({id:"one",name:"Monthly",remaining:10000,startsAt:"2026-10-01T00:00:00Z",expiresAt:"2026-11-01T00:00:00Z",serviceIds:[],...overrides});
test("cashier uses earliest expiring packages, retains cash and never double covers lines",()=>{
 const result=allocateSubscriptions([sub({id:"late",remaining:700,expiresAt:"2026-12-01T00:00:00Z"}),sub({remaining:800,serviceIds:["iron"]})],[{serviceId:"iron",total:1000},{serviceId:"wash",total:1000}],1700,now);
 assert.deepEqual(result,{covered:1500,outstanding:200,allocations:[{id:"one",name:"Monthly",amount:800,remaining:0},{id:"late",name:"Monthly",amount:700,remaining:0}]});
 assert.equal(allocateSubscriptions([sub(),sub({id:"two"})],[{serviceId:"iron",total:1000}],600,now).covered,600);
});
test("future, expired and exhausted balances cannot fund orders; restrictions apply per line",()=>{
 const result=allocateSubscriptions([sub({remaining:0}),sub({startsAt:"2026-12-01T00:00:00Z"}),sub({expiresAt:now.toISOString()}),sub({id:"restricted",serviceIds:["iron"]})],[{serviceId:"wash",total:2000},{serviceId:"iron",total:500}],2500,now);
 assert.equal(result.covered,500);assert.equal(result.allocations[0].remaining,9500);
 assert.equal(subscriberStatus(sub({startsAt:"2026-12-01T00:00:00Z"}),now),"scheduled");
 assert.throws(()=>assertSubscriptionServices(["iron"],[{serviceId:"wash"}]));
 assert.throws(()=>assertSubscriptionServices(["iron"],[]));
});
test("package periods use Riyadh calendar and reject rollover and past dates",()=>{
 const p=packagePeriod("2026-10-22",30,now);assert.equal(p.startsAt.toISOString(),"2026-10-21T21:00:00.000Z");assert.equal(p.expiresAt.toISOString(),"2026-11-20T21:00:00.000Z");
 for(const start of ["2026-10-21","2027-02-30","2026-13-01","invalid"])assert.throws(()=>packagePeriod(start,30,now));
 assert.throws(()=>packagePeriod("2026-10-22",0,now));
 assert.throws(()=>allocateSubscriptions([sub()],[{serviceId:"a",total:1.2}],1,now));
});
