import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchShopifyRetailReport, validateReportPeriod } from '../app/lib/retail-analytics/shopify-report';
const now = new Date('2026-11-01T12:00:00Z');
const input = { shop: 'retail-test.myshopify.com', token: 'test-only-token', apiVersion: '2026-10', period: { from: '2026-10-31', until: '2026-11-01' } };
const money = (amount: string, currencyCode = 'SAR') => ({ shopMoney: { amount, currencyCode } });
const order = (id = 'gid://shopify/Order/1') => ({ id, createdAt: '2026-11-01T10:00:00Z', test: false, cancelledAt: null as string | null,
  currentTotalPriceSet: money('115.00'), currentTotalTaxSet: money('15.00'), currentTotalDiscountsSet: money('5.00'), totalRefundedSet: money('23.00'), netPaymentSet: money('92.00') });
const response = (nodes: unknown[], hasNextPage = false, endCursor: string | null = null) => Response.json({ data: { orders: { nodes, pageInfo: { hasNextPage, endCursor } } } });

test('official host, private fetch, minimal fields and exact decimal aggregation', async () => {
  const fetcher: typeof fetch = async (url, init) => {
    assert.equal(String(url), 'https://retail-test.myshopify.com/admin/api/2026-10/graphql.json');
    assert.equal(init?.redirect, 'error'); assert.equal(init?.cache, 'no-store');
    const body = JSON.parse(String(init?.body));
    assert.match(body.variables.query, /created_at:>=2026-10-30T21:00:00.000Z/);
    assert.doesNotMatch(body.query, /email|phone|customer|address/i);
    return response([order()]);
  };
  const report = await fetchShopifyRetailReport(input, fetcher, now);
  assert.equal(report.complete, true);
  assert.equal(report.totals[0].currentTotalMinor, 11500);
  assert.equal(report.totals[0].netPaymentsMinor, 9200);
  assert.equal(report.totals[0].refundedMinor, 2300); // Not deducted twice from current totals.
  assert.doesNotMatch(JSON.stringify(report), /test-only-token|gid:\/\//);
});
test('cancelled value excluded but actual payments/refunds retained; test orders excluded', async () => {
  const cancelled = { ...order(), cancelledAt: '2026-11-01T11:00:00Z' };
  const report = await fetchShopifyRetailReport(input, async () => response([cancelled, { ...order('2'), test: true }]), now);
  assert.equal(report.totals[0].orders, 1); assert.equal(report.totals[0].cancelled, 1);
  assert.equal(report.totals[0].currentTotalMinor, 0); assert.equal(report.totals[0].netPaymentsMinor, 9200);
});
test('pagination reads each page and refuses repeated IDs or cursors', async () => {
  let calls = 0;
  const report = await fetchShopifyRetailReport(input, async () => { calls++; return response([order(String(calls))], calls < 2, 'next'); }, now);
  assert.equal(calls, 2); assert.equal(report.ordersRead, 2);
  await assert.rejects(fetchShopifyRetailReport(input, async () => response([order()], true, 'next'), now), /PAGINATION_CHANGED/);
  let id = 0;
  await assert.rejects(fetchShopifyRetailReport(input, async () => response([order(String(++id))], true, 'repeat'), now), /PAGINATION/);
});
test('bounded refresh marks reports incomplete instead of claiming all orders', async () => {
  let calls = 0;
  const report = await fetchShopifyRetailReport(input, async () => response([order(String(++calls))], true, String(calls)), now);
  assert.equal(calls, 5); assert.equal(report.complete, false);
});
test('credentials never follow supplied or redirected hosts', async () => {
  let called = false;
  await assert.rejects(fetchShopifyRetailReport({ ...input, shop: 'retail.myshopify.com.attacker.test' }, async () => { called = true; return response([]); }, now), /HOST/);
  assert.equal(called, false);
});
test('provider auth/rate/query failures are errors, not zero reports', async () => {
  for (const [status, code] of [[401,'REAUTHORIZE'],[429,'RATE_LIMIT'],[500,'UNAVAILABLE']] as const) {
    await assert.rejects(fetchShopifyRetailReport(input, async () => new Response('', { status }), now), new RegExp(code));
  }
  await assert.rejects(fetchShopifyRetailReport(input, async () => Response.json({ errors: [{ message: 'secret provider details' }] }), now), /QUERY_FAILED/);
});
test('invalid amounts and mixed currency fields fail closed', async () => {
  await assert.rejects(fetchShopifyRetailReport(input, async () => response([{ ...order(), currentTotalTaxSet: money('15','USD') }]), now), /CURRENCY_MISMATCH/);
  await assert.rejects(fetchShopifyRetailReport(input, async () => response([{ ...order(), currentTotalTaxSet: money('0.001') }]), now), /MONEY/);
});
test('period rejects invalid dates and inaccessible history', () => {
  assert.throws(() => validateReportPeriod({ from: '2026-02-30', until: '2026-03-01' }, now), /PERIOD/);
  assert.throws(() => validateReportPeriod({ from: '2026-01-01', until: '2026-01-10' }, now), /PERIOD/);
  assert.throws(() => validateReportPeriod({ from: '2026-10-31', until: '2026-10-30' }, now), /PERIOD/);
});

test('combined report requires identical complete periods and keeps currencies separate', async () => {
  const { combineShopifyReports } = await import('../app/lib/retail-analytics/shopify-report');
  const report = await fetchShopifyRetailReport(input, async () => response([order()]), now);
  const combined = combineShopifyReports([report, report]);
  assert.equal(combined[0].currentTotalMinor, 23000);
  assert.equal(report.totals[0].currentTotalMinor, 11500);
  assert.throws(() => combineShopifyReports([report, { ...report, complete: false }]), /INCOMPLETE/);
  assert.throws(() => combineShopifyReports([report, { ...report, from: '2026-10-30' }]), /INCOMPLETE/);
  const usd = { ...report, totals: report.totals.map(t => ({ ...t, currency: 'USD' })) };
  assert.equal(combineShopifyReports([report, usd]).length, 2);
});
