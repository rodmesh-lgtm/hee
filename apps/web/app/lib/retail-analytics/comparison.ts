import type { ShopifyReport, OrderReportRow } from './shopify-report';
export type ComparisonSource = { id: string; name: string; report?: ShopifyReport; error?: string };
export type ComparisonRow = { id: string; name: string; account: string; currency: string; decimals: number; orders: number; cancelled: number; value: number; payments: number; refunds: number; average: number | null; cancellationRate: number | null; share: number | null };
/** Only complete, current-period successful snapshots participate. Missing data never becomes zero. */
export function compareAccounts(sources: ComparisonSource[], period: { from: string; until: string }, mode: 'accounts' | 'branches') {
  const eligible = sources.filter(s => !s.error && s.report?.complete && s.report.from === period.from && s.report.until === period.until);
  const rows: ComparisonRow[] = [];
  let unassigned = 0, unavailable = 0;
  for (const source of eligible) {
    const groups = new Map<string, { name: string; orders: OrderReportRow[] }>();
    if (mode === 'accounts') groups.set(source.id, { name: source.name, orders: source.report!.orders });
    else for (const order of source.report!.orders) {
      if (order.location === undefined) { unavailable++; continue; }
      if (!order.location) { unassigned++; continue; }
      const group = groups.get(order.location.id) ?? { name: order.location.name, orders: [] };
      group.orders.push(order); groups.set(order.location.id, group);
    }
    for (const [id, group] of groups) {
      const currencies = new Map<string, ComparisonRow>();
      for (const order of group.orders) {
        const row = currencies.get(order.currency) ?? { id: `${source.id}:${id}:${order.currency}`, name: group.name, account: source.name, currency: order.currency, decimals: order.decimals, orders: 0, cancelled: 0, value: 0, payments: 0, refunds: 0, average: null, cancellationRate: null, share: null };
        if (row.decimals !== order.decimals) throw new Error('PROVIDER_CURRENCY_MISMATCH');
        row.orders++; if (order.cancelled) row.cancelled++;
        row.value += order.currentTotalMinor; row.payments += order.netPaymentsMinor; row.refunds += order.refundedMinor;
        if (![row.value,row.payments,row.refunds].every(Number.isSafeInteger)) throw new Error('AMOUNT_OVERFLOW');
        currencies.set(row.currency, row);
      }
      for (const row of currencies.values()) {
        row.average = row.orders > row.cancelled ? row.value / (row.orders - row.cancelled) : null;
        row.cancellationRate = row.orders ? row.cancelled / row.orders * 100 : null;
        rows.push(row);
      }
    }
  }
  // Do not issue portfolio rankings/shares when any selected account is unavailable.
  const complete = sources.length > 0 && eligible.length === sources.length && (mode === 'accounts' || unavailable === 0);
  if (complete) for (const row of rows) {
    const total = rows.filter(r => r.currency === row.currency).reduce((sum,r) => sum + r.value, 0);
    if (!Number.isSafeInteger(total)) throw new Error('AMOUNT_OVERFLOW');
    row.share = total > 0 && row.value >= 0 ? row.value / total * 100 : null;
  }
  return { rows, complete, eligible: eligible.length, excluded: sources.length - eligible.length, unassigned, unavailable };
}
