import assert from 'node:assert/strict';
import test from 'node:test';
import { parseRetailTable, importRetailTable, type ColumnMap } from '../app/lib/retail-analytics/tabular-import';
const map: ColumnMap = { eventId: 0, date: 1, kind: 2, gross: 3, discount: 4, tax: 5, cost: 6 };
const scope = { businessId: 'tenant', accountId: 'account', provider: 'icg' as const, currency: 'SAR' };
const header = 'ID\tDate\tKind\tGross\tDiscount\tTax\tCost\n';
const data = header + 'inv1\t2026-11-01\tsale\t100.20\t10\t13.53\t40';
test('Excel clipboard handles quoted cells and Arabic amounts without rounding', () => {
  const rows = parseRetailTable(header + '"inv\t1"\t2026-11-01\tبيع\t١٠٠٫٢٠\t10\t13.53\t');
  const [event] = importRetailTable(rows, map, scope);
  assert.equal(event.eventId, 'inv\t1');
  assert.equal(event.grossMinor, 10020);
  assert.equal(event.costMinor, null);
  assert.equal(event.businessId, scope.businessId);
});
test('invalid dates, ambiguous amounts, unknown kinds and duplicate columns are rejected', () => {
  for (const [before, after] of [['2026-11-01','2026-02-30'], ['100.20','1,000'], ['sale','draft']]) {
    assert.throws(() => importRetailTable(parseRetailTable(data.replace(before, after)), map, scope));
  }
  assert.throws(() => importRetailTable(parseRetailTable(data), { ...map, tax: 3 }, scope), /COLUMNS/);
});
test('parser rejects ragged rows, unterminated quotes and oversized inputs', () => {
  assert.throws(() => parseRetailTable(header + 'only one cell'), /TABLE/);
  assert.throws(() => parseRetailTable(header + '"unterminated'), /TABLE/);
  assert.throws(() => parseRetailTable('a'.repeat(2_000_001)), /LARGE/);
});
test('refunds remain positive source amounts and conflicting IDs fail closed', () => {
  assert.equal(importRetailTable(parseRetailTable(data.replace('sale','refund')), map, scope)[0].kind, 'refund');
  assert.throws(() => importRetailTable(parseRetailTable(data + '\n' + data.split('\n')[1].replace('100.20','200.20')), map, scope), /CONFLICTING/);
  assert.throws(() => importRetailTable(parseRetailTable(data), map, { ...scope, currency: 'KWD' }), /CURRENCY/);
});
