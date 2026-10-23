import test from "node:test";
import assert from "node:assert/strict";
import { quoteSubscriberOrder,countedValue,allocateSubscriptions,packagePeriod,subscriberStatus,assertSubscriptionServices,type SubscriberBalance } from "../app/lib/accounting-packages";
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

test("overlapping packages reallocate general credit instead of leaving a false debt",()=>{
 const result=allocateSubscriptions([sub({id:"general",remaining:500}),sub({id:"iron-only",remaining:500,serviceIds:["iron"],expiresAt:"2026-12-01T00:00:00Z"})],[{serviceId:"iron",total:500},{serviceId:"wash",total:500}],1000,now);
 assert.equal(result.covered,1000);assert.equal(result.outstanding,0);
 assert.deepEqual(result.allocations.map(a=>a.amount),[500,500]);
});

test("counted units use purchased value, preserve exact pennies and restrict the service",()=>{
 const s=sub({kind:"pieces",remaining:1000,unitsIncluded:3,unitsRemaining:3,serviceIds:["iron"]});
 const lines=[{serviceId:"iron",name:"Iron",quantity:2,unitPrice:500,total:1000},{serviceId:"wash",name:"Wash",quantity:1,unitPrice:700,total:700}];
 const q=quoteSubscriberOrder([s],lines,200,now);
 assert.equal(q.total,1366);assert.equal(q.covered,666);assert.equal(q.outstanding,500);
 assert.equal(q.allocations[0].unitsRemaining,1);assert.equal(q.allocations[0].remaining,334);
 assert.ok(q.lines.every(l=>l.total===l.quantity*l.unitPrice));
 const last=quoteSubscriberOrder([{...s,remaining:334,unitsRemaining:1}],[{...lines[0],quantity:1,total:500}],0,now);
 assert.equal(last.covered,334);assert.equal(last.allocations[0].remaining,0);assert.equal(last.allocations[0].unitsRemaining,0);
 assert.throws(()=>quoteSubscriberOrder([s],lines,701,now));
});
test("visits count service quantities, never unrelated items; credit covers only uncovered lines",()=>{
 const s=sub({kind:"visits",remaining:1000,unitsIncluded:2,unitsRemaining:2,serviceIds:["visit"]});
 const lines=[{serviceId:"visit",name:"Visit",quantity:3,unitPrice:800,total:2400},{serviceId:"parts",name:"Parts",quantity:1,unitPrice:900,total:900}];
 const q=quoteSubscriberOrder([s,sub({id:"credit",remaining:400})],lines,100,now);
 assert.equal(q.total,2700);assert.equal(q.covered,1400);assert.equal(q.outstanding,1200);
 assert.equal(q.allocations[0].units,2);assert.equal(q.allocations[1].amount,400);
 for(const dates of [{startsAt:"2027-01-01T00:00:00Z"},{expiresAt:now.toISOString()}]){
  const inactive=quoteSubscriberOrder([{...s,...dates}],lines,0,now);assert.equal(inactive.covered,0);assert.equal(inactive.total,3300);
 }
});
test("multiple counted renewals use earliest expiry and quote token detects equal-value balance changes",()=>{
 const s=sub({kind:"pieces",remaining:400,unitsIncluded:2,unitsRemaining:2,serviceIds:["iron"]});
 const lines=[{serviceId:"iron",name:"Iron",quantity:3,unitPrice:500,total:1500}];
 const q=quoteSubscriberOrder([s,{...s,id:"second",expiresAt:"2026-12-01T00:00:00Z"}],lines,0,now);
 assert.deepEqual(q.allocations.map(a=>a.units),[2,1]);assert.equal(q.outstanding,0);assert.equal(q.total,600);
 const single=[{...lines[0],quantity:1,total:500}];
 assert.notEqual(quoteSubscriberOrder([s],single,0,now).token,quoteSubscriberOrder([{...s,remaining:200,unitsRemaining:1}],single,0,now).token);
 assert.throws(()=>countedValue(1,2,1));
});
