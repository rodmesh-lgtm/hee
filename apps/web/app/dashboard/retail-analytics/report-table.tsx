'use client';
import { useState } from 'react';
import { downloadReport, printReport, type ReportDocument } from '../../lib/retail-analytics/report-export';
export default function ReportTable({ report, english }: { report: ReportDocument; english: boolean }) {
  const [search, setSearch] = useState(''), [page, setPage] = useState(0), [blocked, setBlocked] = useState(false);
  const rows = report.rows.filter(row => row.some(value => String(value).toLocaleLowerCase().includes(search.toLocaleLowerCase())));
  const last = Math.max(0, Math.ceil(rows.length / 25) - 1), current = Math.min(page, last);
  const filtered = { ...report, metadata: [...report.metadata, `${english ? 'Search filter' : 'فلتر البحث'}: ${search || (english ? 'All' : 'الكل')}`, `${english ? 'Exported rows' : 'الصفوف المصدّرة'}: ${rows.length}`], rows };
  return <section className="space-y-4 rounded-2xl border border-slate-500/30 p-4">
    <h3 className="text-xl font-bold">{report.title}</h3>
    <div className="flex flex-wrap gap-3"><label className="grow">{english ? 'Search report' : 'بحث في التقرير'}<input className="mt-1 min-h-11 w-full rounded-xl border border-slate-500/40 bg-transparent px-3" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}/></label><button className="min-h-11 rounded-xl border border-teal-600 px-4 font-bold" onClick={() => setBlocked(!printReport(filtered, english))}>{english ? 'Print / PDF' : 'طباعة / PDF'}</button><button className="min-h-11 rounded-xl border border-teal-600 px-4 font-bold" onClick={() => downloadReport(filtered)}>{english ? 'Export CSV' : 'تصدير CSV'}</button></div>
    <p className="text-sm">{english ? 'Printing and export include all matching rows, not only this page.' : 'الطباعة والتصدير يشملان جميع النتائج المطابقة، وليس الصفحة الحالية فقط.'}</p>
    {blocked ? <p role="alert">{english ? 'Allow pop-ups for INFRO, then press Print again.' : 'اسمح بالنوافذ المنبثقة لمنصة INFRO ثم اضغط الطباعة مجددًا.'}</p> : null}
    <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{report.title}</caption><thead><tr>{report.headers.map((h,i) => <th scope="col" className="whitespace-nowrap p-3 text-start" key={i}>{h}</th>)}</tr></thead><tbody>{rows.slice(current*25,(current+1)*25).map((row,i) => <tr key={i} className="border-t border-slate-500/20">{row.map((v,j) => <td key={j} className="p-3">{v}</td>)}</tr>)}</tbody></table></div>
    {!rows.length ? <p>{english ? 'No matching records in the fetched report.' : 'لا توجد سجلات مطابقة في التقرير المقروء.'}</p> : null}
    <div className="flex flex-wrap items-center gap-3"><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={!current} onClick={() => setPage(current-1)}>{english ? 'Previous' : 'السابق'}</button><span>{current+1} / {last+1} · {rows.length} {english ? 'rows' : 'سجل'}</span><button className="min-h-11 rounded-xl border px-4 disabled:opacity-40" disabled={current >= last} onClick={() => setPage(current+1)}>{english ? 'Next' : 'التالي'}</button></div>
  </section>;
}
