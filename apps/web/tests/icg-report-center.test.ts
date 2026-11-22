import assert from 'node:assert/strict';
import { test } from 'node:test';
import { icgGroups, icgReports } from '../app/lib/retail-analytics/icg-catalog';
import { icgSampleReport } from '../app/lib/retail-analytics/icg-samples';
import { demoSummary, selectDemoInvoices } from '../app/lib/retail-analytics/demo-report';

test('each catalog report has a distinct ID and every linked sample fits its columns', () => {
  assert.equal(new Set(icgReports.map(report => report.id)).size, icgReports.length);
  for (const [group] of icgGroups) assert.ok(icgReports.some(report => report.group === group));
  for (const report of icgReports) {
    const sample = icgSampleReport(report.sample, 7, 'north');
    if (!report.sample) {
      assert.equal(sample, null, report.id);
      continue;
    }
    assert.ok(sample?.rows.length, report.id);
    assert.ok(sample.rows.every(row => row.length === sample.columns.length && row.every(cell => cell !== undefined)), report.id);
  }
});

test('sales breakdowns reconcile to the sample ledger for the selected branch and period', () => {
  const expected = demoSummary(selectDemoInvoices(7, 'north'));
  for (const key of ['daily', 'weekly', 'hourly', 'branches', 'brands', 'sellers', 'clients', 'items', 'payments', 'cube']) {
    const sample = icgSampleReport(key, 7, 'north')!;
    assert.equal(sample.rows.reduce((sum, row) => sum + Math.round(Number(row[3]) * 100), 0), expected.net, key);
    assert.equal(sample.rows.reduce((sum, row) => sum + Number(row[1]), 0), expected.count, key);
  }
  const journal = icgSampleReport('journal', 7, 'north')!;
  const balance = journal.rows.reduce((sum, row) => sum + Math.round(Number(row[3]) * 100) - Math.round(Number(row[4]) * 100), 0);
  assert.equal(balance, 0);
});
