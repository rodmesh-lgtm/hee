import { summarizeRetailEvents, type RetailEvent } from './ledger';

export const importFields = ['eventId', 'date', 'kind', 'gross', 'discount', 'tax', 'cost'] as const;
export type ImportField = typeof importFields[number];
export type ColumnMap = Record<ImportField, number>;

/** Excel clipboard (tab separated). Quoted cells and embedded newlines are supported. */
export function parseRetailTable(input: string): string[][] {
  if (input.length > 2_000_000) throw new Error('FILE_TOO_LARGE');
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, closed = false;
  const text = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '\t' || c === '\n') {
      row.push(cell); cell = ''; closed = false;
      if (c === '\n') { if (row.some(v => v.trim())) rows.push(row); row = []; }
    } else if (c === '"' && !cell && !closed) quoted = true;
    else { if (closed) throw new Error('INVALID_TABLE'); cell += c; }
  }
  if (quoted) throw new Error('INVALID_TABLE');
  row.push(cell);
  if (row.some(v => v.trim())) rows.push(row);
  if (rows.length < 2 || rows.length > 10001 || rows[0].length > 100
    || rows.some(r => r.length !== rows[0].length)) throw new Error('INVALID_TABLE');
  return rows;
}

function amount(value: string): number {
  const clean = value.trim().replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/٫/g, '.');
  // Ambiguous thousands separators and negatives require explicit preparation.
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new Error('INVALID_AMOUNT');
  const [whole, fraction = ''] = clean.split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('INVALID_AMOUNT');
  return result;
}

export function importRetailTable(rows: string[][], columns: ColumnMap, scope: {
  businessId: string; accountId: string; provider: RetailEvent['provider']; currency: string;
}): RetailEvent[] {
  if (!['SAR', 'USD', 'EUR', 'AED'].includes(scope.currency)) throw new Error('UNSUPPORTED_CURRENCY');
  const selected = importFields.map(f => columns[f]).filter(i => i >= 0);
  if (new Set(selected).size !== selected.length || selected.some(i => !Number.isInteger(i) || i >= rows[0].length)
    || ['eventId', 'date', 'kind', 'gross', 'tax'].some(f => columns[f as ImportField] < 0)) throw new Error('INVALID_COLUMNS');
  const events = rows.slice(1).map((row, index): RetailEvent => {
    try {
      const value = (f: ImportField) => columns[f] >= 0 ? (row[columns[f]] ?? '').trim() : '';
      const date = value('date');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))
        || new Date(date).toISOString().slice(0, 10) !== date) throw new Error('INVALID_DATE');
      const kind = value('kind').toLowerCase();
      if (kind !== 'sale' && kind !== 'refund' && kind !== 'بيع' && kind !== 'مرتجع') throw new Error('INVALID_KIND');
      const eventId = value('eventId');
      if (!eventId || eventId.length > 200) throw new Error('INVALID_ID');
      return { ...scope, eventId, occurredAt: `${date}T12:00:00+03:00`, kind: kind === 'refund' || kind === 'مرتجع' ? 'refund' : 'sale',
        grossMinor: amount(value('gross')), discountMinor: columns.discount < 0 ? 0 : amount(value('discount')),
        taxMinor: amount(value('tax')), costMinor: !value('cost') ? null : amount(value('cost')) };
    } catch (error) { throw new Error(`ROW_${index + 2}:${error instanceof Error ? error.message : 'INVALID_ROW'}`); }
  });
  summarizeRetailEvents(events, { businessId: scope.businessId, accountIds: [scope.accountId], from: '0001-01-01T00:00:00Z', until: '9999-12-31T23:59:59Z' });
  return events;
}
