import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonReadiness, peerInsights } from '../app/lib/retail-analytics/comparison-insights';
import type { ComparisonRow } from '../app/lib/retail-analytics/comparison';
const row = (id: string, extra: Partial<ComparisonRow> = {}): ComparisonRow => ({ id, name: id, account: id, currency: 'SAR', decimals: 2, orders: 30, cancelled: 0, value: 30000, payments: 30000, refunds: 0, average: 1000, cancellationRate: 0, share: 33, ...extra });
test('benchmark excludes target, separates currencies and requires two comparable peers', () => {
  const target = row('a', { average: 500 });
  assert.equal(peerInsights([target, row('b'), row('c', {currency:'USD'})], true).length, 0);
  const result = peerInsights([target, row('b'), row('c', {average:2000})], true);
  const targetInsight = result.find(insight => insight.row.id === 'a')!;
  assert.equal(targetInsight.benchmark, 1500); assert.equal(targetInsight.peers, 2);
  assert.equal(peerInsights([target, row('b'), row('c')], false).length, 0);
});
test('small samples and cancellation percentage-point threshold do not produce false signals', () => {
  assert.equal(peerInsights([row('a',{orders:9, average:1}),row('b'),row('c')],true).length,0);
  assert.equal(peerInsights([row('a',{cancelled:2,cancellationRate:10}),row('b'),row('c')],true).length,0);
  const result=peerInsights([row('a',{cancelled:3,cancellationRate:10}),row('b',{cancellationRate:5}),row('c',{cancellationRate:5})],true);
  assert.equal(result[0].kind,'cancellation'); assert.equal(result[0].benchmark,5);
  assert.equal(peerInsights([row('a',{cancelled:3,cancellationRate:9.9}),row('b',{cancellationRate:5}),row('c',{cancellationRate:5})],true).length,0);
});
test('readiness never treats failed or absent data as ready',()=>{
  const period={from:'2026-11-01',until:'2026-11-02'};
  assert.equal(comparisonReadiness({id:'a',name:'A'},period),'pending');
  assert.equal(comparisonReadiness({id:'a',name:'A',error:'unavailable'},period),'failed');
});
