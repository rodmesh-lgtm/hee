/** Shopify order-cohort report. No credentials or customer PII are returned. */
export type ReportPeriod = { from: string; until: string };
export type ShopifyReport = {
  fetchedAt: string; from: string; until: string; complete: boolean; ordersRead: number;
  totals: { currency: string; decimals: number; orders: number; cancelled: number; currentTotalMinor: number; taxMinor: number; discountsMinor: number; refundedMinor: number; netPaymentsMinor: number }[];
};
const QUERY = `query InfroRetailOrders($after: String, $query: String!) {
  orders(first: 100, after: $after, query: $query, sortKey: CREATED_AT) {
    nodes { id createdAt test cancelledAt
      currentTotalPriceSet { shopMoney { amount currencyCode } }
      currentTotalTaxSet { shopMoney { amount currencyCode } }
      currentTotalDiscountsSet { shopMoney { amount currencyCode } }
      totalRefundedSet { shopMoney { amount currencyCode } }
      netPaymentSet { shopMoney { amount currencyCode } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;
export function validateReportPeriod(period: ReportPeriod, now = new Date()) {
  for (const date of [period.from, period.until]) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('INVALID_PERIOD');
  }
  const from = new Date(`${period.from}T00:00:00+03:00`);
  const until = new Date(`${period.until}T00:00:00+03:00`);
  until.setUTCDate(until.getUTCDate() + 1);
  // Conservative default-access window. Do not silently return truncated historical access.
  if (from >= until || from.getTime() < now.getTime() - 59 * 86400000 || from > now || until.getTime() - from.getTime() > 31 * 86400000) throw new Error('INVALID_PERIOD');
  return { from: from.toISOString(), until: until.toISOString() };
}
function record(v: unknown): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('INVALID_PROVIDER_RESPONSE');
  return v as Record<string, unknown>;
}
function money(raw: unknown) {
  const value = record(record(raw).shopMoney);
  if (typeof value.currencyCode !== 'string' || !/^[A-Z]{3}$/.test(value.currencyCode) || typeof value.amount !== 'string') throw new Error('INVALID_PROVIDER_MONEY');
  const currency = value.currencyCode;
  const decimals = new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value.amount);
  if (!match || /[1-9]/.test((match[3] ?? '').slice(decimals))) throw new Error('INVALID_PROVIDER_MONEY');
  const units = Number(match[2]) * 10 ** decimals + Number((match[3] ?? '').slice(0, decimals).padEnd(decimals, '0'));
  if (!Number.isSafeInteger(units)) throw new Error('INVALID_PROVIDER_MONEY');
  return { currency, decimals, units: match[1] ? -units : units };
}
function add(a: number, b: number) { const result = a + b; if (!Number.isSafeInteger(result)) throw new Error('AMOUNT_OVERFLOW'); return result; }
export async function fetchShopifyRetailReport(input: {
  shop: string; token: string; apiVersion: string; period: ReportPeriod;
}, fetcher: typeof fetch = fetch, now = new Date()): Promise<ShopifyReport> {
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(input.shop) || !/^20\d{2}-(01|04|07|10)$/.test(input.apiVersion)) throw new Error('INVALID_PROVIDER_HOST');
  const period = validateReportPeriod(input.period, now);
  const totals = new Map<string, ShopifyReport['totals'][number]>();
  const seen = new Set<string>();
  const cursors = new Set<string>();
  let after: string | null = null, complete = false;
  // Bound each refresh; partial reports explicitly report complete=false.
  for (let page = 0; page < 5; page++) {
    const response = await fetcher(`https://${input.shop}/admin/api/${input.apiVersion}/graphql.json`, {
      method: 'POST', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(12000),
      headers: { 'content-type': 'application/json', 'x-shopify-access-token': input.token },
      body: JSON.stringify({ query: QUERY, variables: { after, query: `created_at:>=${period.from} created_at:<${period.until} test:false` } }),
    });
    if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'REAUTHORIZE_REQUIRED' : response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_UNAVAILABLE');
    const payload = record(await response.json());
    if (Array.isArray(payload.errors) && payload.errors.length) throw new Error('PROVIDER_QUERY_FAILED');
    const orders = record(record(payload.data).orders), info = record(orders.pageInfo);
    if (!Array.isArray(orders.nodes) || orders.nodes.length > 100 || typeof info.hasNextPage !== 'boolean') throw new Error('INVALID_PROVIDER_RESPONSE');
    for (const raw of orders.nodes) {
      const order = record(raw);
      if (typeof order.id !== 'string' || !order.id || typeof order.test !== 'boolean' || typeof order.createdAt !== 'string'
        || !Number.isFinite(Date.parse(order.createdAt)) || (order.cancelledAt !== null && typeof order.cancelledAt !== 'string')) throw new Error('INVALID_PROVIDER_RESPONSE');
      if (seen.has(order.id)) throw new Error('PROVIDER_PAGINATION_CHANGED');
      seen.add(order.id);
      if (order.test || Date.parse(order.createdAt) < Date.parse(period.from) || Date.parse(order.createdAt) >= Date.parse(period.until)) continue;
      const current = money(order.currentTotalPriceSet), tax = money(order.currentTotalTaxSet), discounts = money(order.currentTotalDiscountsSet), refunded = money(order.totalRefundedSet), payments = money(order.netPaymentSet);
      if ([tax, discounts, refunded, payments].some(m => m.currency !== current.currency)) throw new Error('PROVIDER_CURRENCY_MISMATCH');
      const total = totals.get(current.currency) ?? { currency: current.currency, decimals: current.decimals, orders: 0, cancelled: 0, currentTotalMinor: 0, taxMinor: 0, discountsMinor: 0, refundedMinor: 0, netPaymentsMinor: 0 };
      total.orders++;
      // Include refund/payment history for cancelled orders; do not count their order value.
      if (order.cancelledAt) total.cancelled++;
      else {
        total.currentTotalMinor = add(total.currentTotalMinor, current.units);
        total.taxMinor = add(total.taxMinor, tax.units);
        total.discountsMinor = add(total.discountsMinor, discounts.units);
      }
      total.refundedMinor = add(total.refundedMinor, refunded.units);
      total.netPaymentsMinor = add(total.netPaymentsMinor, payments.units);
      totals.set(current.currency, total);
    }
    if (!info.hasNextPage) { complete = true; break; }
    if (typeof info.endCursor !== 'string' || !info.endCursor || cursors.has(info.endCursor)) throw new Error('INVALID_PROVIDER_PAGINATION');
    cursors.add(info.endCursor); after = info.endCursor;
  }
  return { fetchedAt: new Date().toISOString(), ...input.period, complete, ordersRead: seen.size, totals: [...totals.values()] };
}

export function combineShopifyReports(reports: readonly ShopifyReport[]): ShopifyReport['totals'] {
  if (!reports.length) return [];
  const totals = new Map<string, ShopifyReport['totals'][number]>();
  for (const report of reports) {
    if (!report.complete || report.from !== reports[0].from || report.until !== reports[0].until) throw new Error('INCOMPLETE_COMBINED_REPORT');
    for (const row of report.totals) {
      const total = totals.get(row.currency);
      if (!total) { totals.set(row.currency, { ...row }); continue; }
      if (total.decimals !== row.decimals) throw new Error('PROVIDER_CURRENCY_MISMATCH');
      for (const key of ['orders', 'cancelled', 'currentTotalMinor', 'taxMinor', 'discountsMinor', 'refundedMinor', 'netPaymentsMinor'] as const) total[key] = add(total[key], row[key]);
    }
  }
  return [...totals.values()];
}
