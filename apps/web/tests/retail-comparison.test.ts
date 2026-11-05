import test from 'node:test';
import assert from 'node:assert/strict';
import { compareAccounts } from '../app/lib/retail-analytics/comparison';
import type { OrderReportRow, ShopifyReport } from '../app/lib/retail-analytics/shopify-report';
const period={from:'2026-11-01',until:'2026-11-02'};
const order=(extra:Partial<OrderReportRow>={}):OrderReportRow=>({reference:'#1',createdAt:'2026-11-01T12:00:00Z',cancelled:false,financialStatus:'PAID',fulfillmentStatus:'FULFILLED',currency:'SAR',decimals:2,currentTotalMinor:10000,taxMinor:1500,discountsMinor:0,refundedMinor:0,netPaymentsMinor:10000,...extra});
const report=(orders:OrderReportRow[],extra:Partial<ShopifyReport>={}):ShopifyReport=>({...period,fetchedAt:'2026-11-02T12:00:00Z',complete:true,ordersRead:orders.length,orders,totals:[],...extra});
test('account comparisons preserve currencies and exclude cancellations from average',()=>{
 const result=compareAccounts([{id:'a',name:'A',report:report([order(),order({cancelled:true,currentTotalMinor:0,refundedMinor:5000}),order({currency:'USD'})])},{id:'b',name:'B',report:report([order({currentTotalMinor:30000})])}],period,'accounts');
 assert.equal(result.complete,true);assert.equal(result.rows.length,3);
 const a=result.rows.find(r=>r.account==='A'&&r.currency==='SAR')!;
 assert.equal(a.average,10000);assert.equal(a.cancellationRate,50);assert.equal(a.share,25);
 assert.equal(result.rows.find(r=>r.currency==='USD')!.share,100);
});
test('failed, partial and different-period accounts cannot affect rankings or become zero sales',()=>{
 for(const extra of [{error:'failed'}, {report:report([order()],{complete:false})},{report:report([order()],{from:'2026-10-31'})}]) {
  const result=compareAccounts([{id:'a',name:'A',report:report([order()])},{id:'b',name:'B',...extra}],period,'accounts');
  assert.equal(result.complete,false);assert.equal(result.excluded,1);assert.equal(result.rows.length,1);assert.equal(result.rows[0].share,null);
 }
});
test('branch identity includes account; no guessed attribution for unknown locations',()=>{
 const result=compareAccounts([{id:'a',name:'A',report:report([order({location:{id:'1',name:'Main'}}),order({location:null}),order()])},{id:'b',name:'B',report:report([order({location:{id:'1',name:'Main'}})])}],period,'branches');
 assert.equal(result.rows.length,2);assert.notEqual(result.rows[0].id,result.rows[1].id);
 assert.equal(result.unassigned,1);assert.equal(result.unavailable,1);assert.equal(result.complete,false);
});
test('zero or cancelled-only groups have no invented average or positive share',()=>{
 const result=compareAccounts([{id:'a',name:'A',report:report([order({cancelled:true,currentTotalMinor:0})])}],period,'accounts');
 assert.equal(result.rows[0].average,null);assert.equal(result.rows[0].share,null);
});
test('overflow fails instead of producing inaccurate financial figures',()=>{
 assert.throws(()=>compareAccounts([{id:'a',name:'A',report:report([order({currentTotalMinor:Number.MAX_SAFE_INTEGER}),order()])}],period,'accounts'),/OVERFLOW/);
});

test('an empty account without location permission cannot complete a branch comparison',()=>{
 const sources=[{id:'a',name:'A',report:report([],{locationsReadable:false})}];
 assert.equal(compareAccounts(sources,period,'branches').complete,false);
 assert.equal(compareAccounts(sources,period,'accounts').complete,true);
});
