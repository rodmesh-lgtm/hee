export type ReportDocument = { title: string; metadata: string[]; headers: string[]; rows: (string | number)[][] };
/** Quote every cell and neutralize formula/control prefixes in spreadsheet applications. */
export function reportCsv(report: ReportDocument): string {
  const cell = (value: string | number) => {
    let text = String(value);
    if (typeof value === 'string' && /^[\s\u0000-\u001f]*[=+@-]/u.test(text)) text = `'${text}`;
    if (/^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [[report.title], ...report.metadata.map(m => [m]), [], report.headers, ...report.rows].map(row => row.map(cell).join(',')).join('\r\n');
}
export function downloadReport(report: ReportDocument) {
  const url = URL.createObjectURL(new Blob([reportCsv(report)], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'INFRO-report.csv'; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** Build a separate print document with text nodes only. Never interpolate merchant data as HTML. */
export function printReport(report: ReportDocument, english: boolean): boolean {
  const popup = window.open('', '_blank', 'width=1100,height=800');
  if (!popup) return false;
  popup.opener = null;
  const doc = popup.document; doc.title = report.title; doc.documentElement.lang = english ? 'en' : 'ar'; doc.documentElement.dir = english ? 'ltr' : 'rtl';
  const style = doc.createElement('style'); style.textContent = '@page{size:A4 landscape;margin:12mm}body{font:12px Arial,sans-serif;color:#172c2b;padding:16px}h1{font-size:22px}p{line-height:1.6}table{border-collapse:collapse;width:100%;margin-top:20px}th,td{border:1px solid #c5d6d3;padding:7px;text-align:start;overflow-wrap:anywhere}th{background:#edf7f4}thead{display:table-header-group}tr{break-inside:avoid}button{padding:12px;margin:12px 0}@media print{button{display:none}body{padding:0}}'; doc.head.append(style);
  const heading = doc.createElement('h1'); heading.textContent = report.title; doc.body.append(heading);
  for (const text of report.metadata) { const p = doc.createElement('p'); p.textContent = text; doc.body.append(p); }
  const button = doc.createElement('button'); button.textContent = english ? 'Print / Save as PDF' : 'طباعة / حفظ PDF'; button.onclick = () => popup.print(); doc.body.append(button);
  const table = doc.createElement('table'), head = doc.createElement('thead'), body = doc.createElement('tbody');
  const header = doc.createElement('tr'); for (const label of report.headers) { const th = doc.createElement('th'); th.textContent = label; header.append(th); } head.append(header);
  for (const values of report.rows) { const tr = doc.createElement('tr'); for (const value of values) { const td = doc.createElement('td'); td.textContent = String(value); tr.append(td); } body.append(tr); }
  table.append(head, body); doc.body.append(table); popup.focus(); return true;
}
