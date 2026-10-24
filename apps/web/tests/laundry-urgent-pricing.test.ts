import test from "node:test";
import assert from "node:assert/strict";
import { laundryPricedLines,laundryPriceToken,type LaundryService } from "../app/lib/laundry-domain";
import { quoteSubscriberOrder,type SubscriberBalance } from "../app/lib/accounting-packages";
const catalog:LaundryService[]=[{id:"wash",name:"Wash",category:"Laundry",active:true,price:1000,urgentPrice:1500},{id:"iron",name:"Iron",category:"Laundry",active:true,price:500,urgentPrice:null}];
const now=new Date("2026-10-24T06:00Z");
const sub:SubscriberBalance={id:"pieces",name:"Two washes",kind:"pieces",unitsIncluded:2,unitsRemaining:2,remaining:1600,serviceIds:["wash"],startsAt:"2026-10-01",expiresAt:"2026-11-01"};
test("server uses selected rate, blocks unset/invalid urgent rates and preserves snapshots",()=>{
 const items=[{serviceId:"wash",quantity:2}];
 assert.equal(laundryPricedLines(items,catalog,"normal")[0].total,2000);
 const snapshot=laundryPricedLines(items,catalog,"urgent");
 assert.equal(snapshot[0].total,3000);assert.equal(snapshot[0].regularUnitPrice,1000);
 catalog[0].urgentPrice=1700;
 assert.equal(snapshot[0].unitPrice,1500);
 assert.notEqual(laundryPriceToken(snapshot),laundryPriceToken(laundryPricedLines(items,catalog,"urgent")));
 catalog[0].urgentPrice=1500;
 assert.throws(()=>laundryPricedLines([{serviceId:"iron",quantity:1}],catalog,"urgent"));
 assert.throws(()=>laundryPricedLines(items,[{...catalog[0],urgentPrice:1000}],"urgent"));
 assert.throws(()=>laundryPricedLines(items,[{...catalog[0],active:false}],"urgent"));
 assert.throws(()=>laundryPricedLines([{serviceId:"foreign",quantity:1}],catalog,"urgent"));
});
test("counted subscriptions cover units while urgent difference is still collected",()=>{
 const lines=laundryPricedLines([{serviceId:"wash",quantity:3}],catalog,"urgent");
 const quote=quoteSubscriberOrder([sub],lines,0,now);
 assert.equal(quote.covered,1600);assert.equal(quote.total,4100);assert.equal(quote.outstanding,2500);
 assert.equal(quote.lines.find(l=>l.name.startsWith("فرق المستعجل"))?.total,1000);
 assert.equal(quote.allocations[0].unitsRemaining,0);
 const paid=quoteSubscriberOrder([sub],lines,2500,now);assert.equal(paid.outstanding,0);
 assert.throws(()=>quoteSubscriberOrder([sub],lines,2501,now));
});
test("financial credit can cover urgent difference without spending counted units twice",()=>{
 const lines=laundryPricedLines([{serviceId:"wash",quantity:2}],catalog,"urgent");
 const credit={...sub,id:"credit",kind:"credit" as const,remaining:1000,unitsRemaining:null,unitsIncluded:null};
 const quote=quoteSubscriberOrder([sub,credit],lines,0,now);
 assert.equal(quote.total,2600);assert.equal(quote.covered,2600);assert.equal(quote.outstanding,0);
 assert.equal(quote.allocations.find(a=>a.id==="pieces")?.units,2);
 assert.equal(quote.allocations.find(a=>a.id==="credit")?.amount,1000);
});
test("price token is stable across display ordering, and rejects changed quantities or rates",()=>{
 const lines=laundryPricedLines([{serviceId:"wash",quantity:2},{serviceId:"iron",quantity:1}],catalog,"normal");
 assert.equal(laundryPriceToken(lines),laundryPriceToken([...lines].reverse()));
 assert.notEqual(laundryPriceToken(lines),laundryPriceToken([{...lines[0],quantity:3},lines[1]]));
});
