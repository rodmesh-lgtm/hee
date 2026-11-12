import test from 'node:test';
import assert from 'node:assert/strict';
import { DEMO_INVOICES, demoSummary, selectDemoInvoices } from '../app/lib/retail-analytics/demo-report';
test('demo invoice identifiers are unique and all net totals reconcile without double refunds', () => {
  assert.equal(new Set(DEMO_INVOICES.map(row => row.id)).size, DEMO_INVOICES.length);
  for (const row of DEMO_INVOICES) assert.equal(row.net, row.gross - row.discount - row.refund);
  const total = demoSummary(DEMO_INVOICES);
  assert.equal(total.net, total.gross - total.discount - total.refund);
});
test('demo filters isolate branches and period; empty search results are explicit', () => {
  assert.equal(selectDemoInvoices(7, 'all').length, 63);
  assert.equal(selectDemoInvoices(1, 'north').length, 3);
  assert.ok(selectDemoInvoices(7, 'west').every(row => row.branch === 'west' && row.day < 7));
  assert.equal(selectDemoInvoices(30, 'all', ' demo-0001 ').length, 1);
  assert.deepEqual(selectDemoInvoices(7, 'all', 'missing'), []);
  assert.equal(demoSummary([]).net, 0);
});
