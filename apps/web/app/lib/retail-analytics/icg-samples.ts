import { DEMO_BRANCHES, selectDemoInvoices } from './demo-report';
import type { Label } from './icg-catalog';

export type SampleCell = string | number | Label;
type SampleReport = { columns: Label[]; rows: SampleCell[][] };
const refDay = '2026-11-22';
const branchLabels = [['الفرع الشمالي', 'North branch'], ['الفرع المركزي', 'Central branch'], ['الفرع الغربي', 'West branch']] as const;
const products = [['قهوة', 'Coffee'], ['شاي', 'Tea'], ['معجنات', 'Pastries']] as const;
const tenders = [['بطاقة', 'Card'], ['نقد', 'Cash'], ['تحويل', 'Transfer']] as const;
const vendors = [['مورد التوريد أ', 'Supplier A'], ['مورد التوريد ب', 'Supplier B'], ['مورد التوريد ج', 'Supplier C']] as const;
const date = (day: number) => new Date(Date.parse(refDay) - day * 86400000).toISOString().slice(0, 10);
const money = (minor: number) => minor / 100;
const net: Label = ['صافي المبيعات (ر.س)', 'Net sales (SAR)'];
const count: Label = ['الفواتير', 'Invoices'];
const onHand: Label = ['المتوفر', 'On hand'];
const item: Label = ['الصنف', 'Item'];
const warehouse: Label = ['المستودع', 'Warehouse'];
const amount: Label = ['المبلغ (ر.س)', 'Amount (SAR)'];
const on: Label = ['التاريخ', 'Date'];
const branchColumn: Label = ['الفرع', 'Branch'];
const reference: Label = ['المرجع', 'Reference'];
const daysLabel: Label = ['حالة التسوية', 'Settlement status'];
const supplier: Label = ['المورد', 'Supplier'];
const quantity: Label = ['الكمية', 'Quantity'];
const settled: Label = ['مسوّى', 'Settled'];
const pending: Label = ['معلّق', 'Pending'];
const accounts = [['الصندوق', 'Cash'], ['المبيعات', 'Sales'], ['المشتريات', 'Purchases'], ['ذمم الموردين', 'Trade payables']] as const;

export function icgSampleReport(sample: string | undefined, days: number, branch: string): SampleReport | null {
  const source = selectDemoInvoices(days, branch).map(row => {
    const index = (Number(row.id.slice(5)) - 1) % 3;
    const branchIndex = DEMO_BRANCHES.indexOf(row.branch);
    return { ...row, index, branchIndex, branchLabel: branchLabels[branchIndex], product: products[(index + row.day) % 3] };
  });
  const branches = DEMO_BRANCHES.map((id, index) => ({ id, index, label: branchLabels[index] })).filter(row => branch === 'all' || row.id === branch);
  const aggregate = (column: Label, key: (row: typeof source[number]) => string, label: (row: typeof source[number]) => SampleCell): SampleReport => {
    const groups = new Map<string, { label: SampleCell; value: number; count: number; units: number }>();
    for (const row of source) {
      const id = key(row);
      const total = groups.get(id) ?? { label: label(row), value: 0, count: 0, units: 0 };
      total.value += row.net;
      total.count++;
      total.units += row.quantity;
      groups.set(id, total);
    }
    return { columns: [column, count, quantity, net], rows: [...groups.values()].map(row => [row.label, row.count, row.units, money(row.value)]) };
  };
  const purchases = branches.flatMap(b => Array.from({ length: days }, (_, day) => {
    const idx = (day + b.index) % 3;
    return { ref: `PO-${b.index + 1}-${day + 1}`, day, branch: b.label, supplier: vendors[idx], item: products[idx], qty: 6 + idx, total: (6 + idx) * (31 + 9 * idx) * 100 };
  }));
  const selectedBranch = branches.length === 1 ? branches[0].label : undefined;
  const stock = branches.flatMap(b => products.map((product, index) => ({ branch: b.label, item: product, qty: 7 + index * 12 + b.index * 5, index })));
  const payments = source.map(row => ({ day: row.day, ref: row.id, branch: row.branchLabel, status: row.day === 0 && row.index === 0 ? pending : settled, total: row.net }));
  const outgoing = purchases.map(row => ({ ...row, status: row.day === 0 ? pending : settled }));
  switch (sample) {
    case 'invoices':
      return { columns: [reference, on, branchColumn, ['الإجمالي (ر.س)', 'Gross (SAR)'], ['الخصم (ر.س)', 'Discount (SAR)'], ['المرتجع (ر.س)', 'Refund (SAR)'], net],
        rows: source.map(row => [row.id, date(row.day), row.branchLabel, ...[row.gross, row.discount, row.refund, row.net].map(money)]) };
    case 'daily':
      return aggregate(on, row => date(row.day), row => date(row.day));
    case 'weekly':
      return aggregate(['بداية الأسبوع (الأحد)', 'Week beginning (Sunday)'], row => date(Math.ceil(row.day / 7) * 7), row => date(Math.ceil(row.day / 7) * 7));
    case 'hourly':
      return aggregate(['الساعة', 'Hour'], row => String(row.index), row => [9, 13, 19][row.index] + ':00');
    case 'branches':
      return aggregate(branchColumn, row => row.branch, row => row.branchLabel);
    case 'brands':
      return aggregate(['العلامة · القسم', 'Brand · department'], row => row.product[1],
        row => [`علامة ${row.product[0]} · الأغذية`, `${row.product[1]} brand · Food`]);
    case 'sellers':
      return aggregate(['معرّف البائع', 'Seller ID'], row => `${row.branch}-${row.index}`, row => `EMP-${row.branchIndex + 1}${row.index + 1}`);
    case 'clients':
      return aggregate(['معرّف العميل', 'Customer ID'], row => String((row.day + row.index) % 7), row => `CUSTOMER-${(row.day + row.index) % 7 + 1}`);
    case 'items':
      return aggregate(item, row => row.product[1], row => row.product);
    case 'payments':
      return aggregate(['وسيلة الدفع', 'Tender'], row => String(row.index), row => tenders[row.index]);
    case 'tills':
      return { columns: [on, branchColumn, ['المتوقع (ر.س)', 'Expected (SAR)'], ['المعدود (ر.س)', 'Counted (SAR)'], ['الفرق (ر.س)', 'Difference (SAR)']],
        rows: source.filter(row => row.index === 1).map(row => {
          const variance = row.day % 4 === 0 ? -2 : 0;
          return [date(row.day), row.branchLabel, money(row.net), money(row.net) + variance, variance];
        }) };
    case 'exceptions':
      return { columns: [reference, on, branchColumn, ['السبب', 'Reason'], amount],
        rows: source.flatMap(row => row.refund ? [[row.id, date(row.day), row.branchLabel, ['إرجاع جزئي', 'Partial return'], money(row.refund)]]
          : row.discount ? [[row.id, date(row.day), row.branchLabel, ['عرض ترويجي', 'Promotion'], money(row.discount)]] : []) };
    case 'purchases':
      return { columns: [reference, on, branchColumn, supplier, item, quantity, amount],
        rows: purchases.map(row => [row.ref, date(row.day), row.branch, row.supplier, row.item, row.qty, money(row.total)]) };
    case 'purchase-items':
      return { columns: [item, quantity, amount], rows: products.map(product => {
        const rows = purchases.filter(row => row.item === product);
        return [product, rows.reduce((sum, row) => sum + row.qty, 0), money(rows.reduce((sum, row) => sum + row.total, 0))];
      }) };
    case 'targets':
      return { columns: [branchColumn, net, ['الهدف (ر.س)', 'Target (SAR)'], ['فرق الأداء (ر.س)', 'Variance (SAR)']],
        rows: branches.map(b => {
          const actual = money(source.filter(row => row.branch === b.id).reduce((sum, row) => sum + row.net, 0));
          const target = days * (1100 + b.index * 60);
          return [b.label, actual, target, Math.round((actual - target) * 100) / 100];
        }) };
    case 'cashflow':
      return { columns: [daysLabel, ['وارد (ر.س)', 'Inflow (SAR)'], ['صادر (ر.س)', 'Outflow (SAR)'], ['الصافي (ر.س)', 'Net (SAR)']],
        rows: [settled, pending].map(status => {
          const income = payments.filter(row => row.status === status).reduce((sum, row) => sum + row.total, 0);
          const expense = outgoing.filter(row => row.status === status).reduce((sum, row) => sum + row.total, 0);
          return [status, money(income), money(expense), money(income - expense)];
        }) };
    case 'collections':
      return { columns: [reference, on, branchColumn, daysLabel, amount], rows: payments.map(row => [row.ref, date(row.day), row.branch, row.status, money(row.total)]) };
    case 'outgoing':
      return { columns: [reference, on, supplier, daysLabel, amount], rows: outgoing.map(row => [row.ref, date(row.day), row.supplier, row.status, money(row.total)]) };
    case 'journal':
    case 'ledger': {
      const debit: Label = ['مدين (ر.س)', 'Debit (SAR)'], credit: Label = ['دائن (ر.س)', 'Credit (SAR)'];
      const posted = payments.filter(row => row.status === settled);
      if (sample === 'journal') return { columns: [reference, on, ['الحساب', 'Account'], debit, credit], rows: posted.flatMap(row => [
        [row.ref, date(row.day), accounts[0], money(row.total), 0], [row.ref, date(row.day), accounts[1], 0, money(row.total)],
      ]) };
      const total = money(posted.reduce((sum, row) => sum + row.total, 0));
      return { columns: [['الحساب', 'Account'], debit, credit], rows: [[accounts[0], total, 0], [accounts[1], 0, total]] };
    }
    case 'stock':
      return { columns: [warehouse, item, onHand, ['تاريخ اللقطة', 'Snapshot date']], rows: stock.map(row => [row.branch, row.item, row.qty, refDay]) };
    case 'thresholds':
      return { columns: [warehouse, item, onHand, ['الحد الأدنى', 'Minimum'], ['الحد الأقصى', 'Maximum']], rows: stock.map(row => [row.branch, row.item, row.qty, 10, 60]) };
    case 'counts':
      return { columns: [warehouse, item, ['دفترية', 'Expected'], ['معدودة', 'Counted'], ['الفرق', 'Variance'], on],
        rows: stock.map(row => [row.branch, row.item, row.qty, row.qty - row.index, -row.index, refDay]) };
    case 'transfers':
      return { columns: [reference, on, ['من', 'From'], ['إلى', 'To'], item, quantity],
        rows: branchLabels.flatMap((from, i) => {
          const to = branchLabels[(i + 1) % 3];
          return branch === 'all' || from === selectedBranch || to === selectedBranch
            ? [[`TR-${i + 1}`, date(0), from, to, products[i], 2 + i]] : [];
        }) };
    case 'master':
      return { columns: [warehouse, item, ['القسم', 'Department'], ['العلامة', 'Brand']],
        rows: stock.map(row => [row.branch, row.item, ['الأغذية', 'Food'], [`علامة ${row.item[0]}`, `${row.item[1]} brand`]]) };
    case 'loyalty':
      return { columns: [on, reference, branchColumn, ['النقاط المكتسبة', 'Points earned']],
        rows: source.filter(row => row.index === 2).map(row => [date(row.day), `MEMBER-${row.branchIndex + 1}`, row.branchLabel, Math.floor(row.net / 1000)]) };
    case 'cube':
      return aggregate(['الفرع × الصنف', 'Branch × item'], row => `${row.branch}/${row.product[1]}`,
        row => [`${row.branchLabel[0]} / ${row.product[0]}`, `${row.branchLabel[1]} / ${row.product[1]}`]);
    default:
      return null;
  }
}
