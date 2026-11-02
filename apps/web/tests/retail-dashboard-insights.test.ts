import test from 'node:test';
import assert from 'node:assert/strict';
import { dashboardInsights } from '../app/lib/retail-analytics/dashboard-insights';
import type { ShopifyReport, OrderReportRow } from '../app/lib/retail-analytics/shopify-report';
const order=(day:string,value:number,currency='SAR'):OrderReportRow=>({reference:day,createdAt:`${day}T10:00:00Z`,cancelled:false,financialStatus:'PAID',fulfillmentStatus:'UNFULFILLED',currency,decimals:2,currentTotalMinor:value,taxMinor:0,discountsMinor:0,refundedMinor:0,netPaymentsMinor:value});
const report=(orders:OrderReportRow[], complete=true):ShopifyReport=>({from:'2026-10-30',until:'2026-11-02',fetchedAt:'2026-11-02T08:00:00Z',orders,complete,ordersRead:orders.length,totals:[]});
test('daily comparison excludes unfinished current day and keeps currency separate',()=>{
 const result=dashboardInsights(report([order('2026-10-31',10000),order('2026-11-01',15000),order('2026-11-02',90000),order('2026-11-01',900000,'USD')]),'SAR');
 assert.equal(result.comparison?.percent,50);assert.equal(result.comparison?.latestDay,'2026-11-01');assert.equal(result.pending,3);assert.equal(result.series[0].value,0);
});
test('zero baseline never invents a growth percentage; a drop to zero is -100%',()=>{
 assert.equal(dashboardInsights(report([order('2026-11-01',100)]),'SAR').comparison?.percent,null);
 assert.equal(dashboardInsights(report([order('2026-10-31',100)]),'SAR').comparison?.percent,-100);
});
test('partial data suppresses comparisons and peak claims and marks missing days unknown',()=>{
 const result=dashboardInsights(report([order('2026-11-01',100)],false),'SAR');assert.equal(result.comparison,null);assert.equal(result.peak,null);assert.equal(result.series[0].value,null);assert.equal(result.series[0].orders,null);
});
test('Riyadh midnight determines completed days; cancelled requests are not pending',()=>{
 const r=report([{...order('2026-11-01',0),cancelled:true,refundedMinor:100}]);r.fetchedAt='2026-11-01T21:00:00Z';
 const result=dashboardInsights(r,'SAR');assert.equal(result.comparison?.latestDay,'2026-11-01');assert.equal(result.pending,0);assert.equal(result.cancelled,1);assert.equal(result.refunds,1);
});
