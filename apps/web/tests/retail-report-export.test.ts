import test from 'node:test';
import assert from 'node:assert/strict';
import { reportCsv } from '../app/lib/retail-analytics/report-export';
import { dailyShopifyReport, type OrderReportRow } from '../app/lib/retail-analytics/shopify-report';
test('CSV protects spreadsheet formulas and preserves Arabic, separators and multiline values', () => {
  const csv = reportCsv({ title:'التقرير', metadata:['جزئي'], headers:['اسم','قيمة'], rows:[['=HYPERLINK("bad")',12],[' \t@SUM(A1)',-25],['اسم, عربي\nثانٍ','"quoted"']] });
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv, /"'=HYPERLINK/); assert.match(csv, /"' \t@SUM/);
  assert.match(csv, /"-25"/); assert.match(csv, /"اسم, عربي\nثانٍ"/); assert.match(csv, /""quoted""/);
});
test('daily totals preserve Riyadh midnight, cancellations and separate currencies', () => {
  const base: OrderReportRow = { reference:'#1', createdAt:'2026-11-01T21:15:00Z',cancelled:false,financialStatus:'PAID',fulfillmentStatus:'FULFILLED',currency:'SAR',decimals:2,currentTotalMinor:11500,taxMinor:1500,discountsMinor:500,refundedMinor:0,netPaymentsMinor:11500 };
  const rows = dailyShopifyReport([base,{...base,reference:'#2',cancelled:true,currentTotalMinor:0,taxMinor:0,discountsMinor:0,refundedMinor:11500,netPaymentsMinor:0},{...base,currency:'USD'}]);
  assert.equal(rows.length,2); const sar=rows.find(r=>r.currency==='SAR')!;
  assert.equal(sar.day,'2026-11-02'); assert.equal(sar.orders,2); assert.equal(sar.cancelled,1); assert.equal(sar.currentTotalMinor,11500); assert.equal(sar.refundedMinor,11500);
});
