import { dailyShopifyReport, type ShopifyReport } from './shopify-report';
export function dashboardInsights(report: ShopifyReport, currency: string) {
  const rows = dailyShopifyReport(report.orders).filter(row => row.currency === currency);
  const dates: string[] = [];
  for (let time = Date.parse(report.from); time <= Date.parse(report.until) && dates.length < 31; time += 86400000) dates.push(new Date(time).toISOString().slice(0,10));
  const series = dates.map(day => {
    const row = rows.find(row => row.day === day);
    return { day, value: row?.currentTotalMinor ?? (report.complete ? 0 : null), orders: row?.orders ?? (report.complete ? 0 : null) };
  });
  const today = new Date(Date.parse(report.fetchedAt) + 10800000).toISOString().slice(0,10);
  const completed = series.filter(row => row.day < today);
  const previous = completed.at(-2), latest = completed.at(-1);
  const comparison = report.complete && previous && latest && previous.value !== null && latest.value !== null ? {
    previousDay: previous.day, latestDay: latest.day, previous: previous.value, latest: latest.value,
    percent: previous.value > 0 ? Math.round((latest.value - previous.value) / previous.value * 1000) / 10 : null,
  } : null;
  const orders = report.orders.filter(order => order.currency === currency);
  return { series, comparison, pending: orders.filter(o => !o.cancelled && o.fulfillmentStatus === 'UNFULFILLED').length,
    refunds: orders.filter(o => o.refundedMinor > 0).length, cancelled: orders.filter(o => o.cancelled).length,
    peak: report.complete && orders.length ? series.reduce((best, row) => (row.value ?? 0) > (best.value ?? 0) ? row : best, series[0]) : null };
}
