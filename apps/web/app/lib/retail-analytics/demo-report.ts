/** Synthetic, client-safe examples. Never persist these rows or merge them with provider reports. */
export type DemoInvoice = { id: string; day: number; branch: 'north' | 'central' | 'west'; gross: number; discount: number; refund: number; net: number; quantity: number };
export const DEMO_BRANCHES = ['north', 'central', 'west'] as const;
export const DEMO_INVOICES: DemoInvoice[] = Array.from({ length: 30 }, (_, day) =>
  DEMO_BRANCHES.flatMap((branch, branchIndex) => Array.from({ length: 3 }, (_, index) => {
    const gross = (180 + ((day * 37 + branchIndex * 83 + index * 29) % 430)) * 100;
    const discount = index === 1 ? 2000 : 0;
    const refund = day % 6 === 0 && index === 2 ? 5000 : 0;
    return { id: `DEMO-${String(day * 9 + branchIndex * 3 + index + 1).padStart(4, '0')}`, day, branch, gross, discount, refund, net: gross - discount - refund, quantity: index + 1 };
  })),
).flat();
export function demoSummary(rows: readonly DemoInvoice[]) {
  return rows.reduce((sum, row) => ({ count: sum.count + 1, gross: sum.gross + row.gross, discount: sum.discount + row.discount, refund: sum.refund + row.refund, net: sum.net + row.net }), { count: 0, gross: 0, discount: 0, refund: 0, net: 0 });
}
export function selectDemoInvoices(days: number, branch: string, search = '') {
  return DEMO_INVOICES.filter(row => row.day < days && (branch === 'all' || row.branch === branch) && row.id.toLowerCase().includes(search.trim().toLowerCase()));
}
