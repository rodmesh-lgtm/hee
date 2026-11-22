'use client';

import { useState } from 'react';
import { Download, Search, Table2 } from 'lucide-react';
import { icgGroups, icgReports, type Label } from '../../lib/retail-analytics/icg-catalog';
import { icgSampleReport, type SampleCell } from '../../lib/retail-analytics/icg-samples';
import { DEMO_BRANCHES } from '../../lib/retail-analytics/demo-report';
import { downloadReport } from '../../lib/retail-analytics/report-export';
import styles from './demo-workspace.module.css';

export default function IcgReportCenter({ english }: { english: boolean }) {
  const t = (ar: string, en: string) => english ? en : ar;
  const label = (value: Label) => value[english ? 1 : 0];
  const display = (cell: SampleCell) => typeof cell === 'string' || typeof cell === 'number' ? cell : label(cell);
  const locale = english ? 'en-SA' : 'ar-SA';
  const [category, setCategory] = useState('sales');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(icgReports[0].id);
  const [rowFilter, setRowFilter] = useState('');
  const [sortColumn, setSortColumn] = useState<number | null>(null);
  const [ascending, setAscending] = useState(true);
  const [days, setDays] = useState(7);
  const [branch, setBranch] = useState('all');
  const branches: Label[] = [['الشمالي','North'], ['المركزي','Central'], ['الغربي','West']];
  const queryText = query.trim().toLowerCase();
  const results = icgReports.filter(report => (category === 'all' || category === report.group) &&
    (!queryText || [...report.title, ...report.fields].some(value => value.toLowerCase().includes(queryText))));
  const active = results.find(report => report.id === selected) ?? results[0];
  const sample = icgSampleReport(active?.sample, days, branch);
  const snapshot = ['stock', 'thresholds', 'counts', 'master'].includes(active?.sample ?? '');
  const filtered = sample?.rows.map(row => row.map(display))
    .filter(row => row.some(cell => String(cell).toLowerCase().includes(rowFilter.trim().toLowerCase()))) ?? [];
  if (sortColumn !== null) {
    const column = sortColumn;
    filtered.sort((a,b) => (ascending ? 1 : -1) * (typeof a[column] === 'number' && typeof b[column] === 'number'
      ? a[column] - b[column] : String(a[column]).localeCompare(String(b[column]), locale, { numeric: true })));
  }
  function resetTable() {
    setRowFilter('');
    setSortColumn(null);
  }
  function exportCsv() {
    if (!active || !sample) return;
    downloadReport({
      title: label(active.title),
      metadata: [t('بيانات تجريبية مولّدة · ICG غير متصل', 'Synthetic sample · ICG is not connected'),
        [snapshot ? [] : [t(`الفترة ${days} أيام`, `Period ${days} days`)],
          branch === 'all' ? t('جميع الفروع', 'All branches') : label(branches[DEMO_BRANCHES.findIndex(id => id === branch)])].flat().join(' · ')],
      headers: sample.columns.map(label), rows: filtered,
    });
  }
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });

  return <section className={styles.workspace} aria-labelledby="icg-report-title" data-testid="icg-report-center">
    <header className={styles.hero}><div>
      <h2 id="icg-report-title">{t('مركز تقارير ICG', 'ICG reporting center')}</h2>
      <p>{t('استعرض دليل التقارير المستخلص من تسجيل ICG Manager 2018، وجرّب المعاينات المعلّمة ببيانات تجريبية.', 'Browse the report catalog from the ICG Manager 2018 recording and try the labeled sample previews.')}</p>
    </div><span className="self-start rounded-lg border border-white/30 px-3 py-2 text-sm">{t('للقراءة فقط · الربط بانتظار المزود', 'Read-only · vendor connection pending')}</span></header>
    <div className={styles.body}>
      <div className={styles.toolbar}>
        <label>{t('البحث في جميع التقارير', 'Search all reports')}<input type="search" value={query} onChange={event => { setQuery(event.target.value); if (event.target.value.trim()) setCategory('all'); resetTable(); }} placeholder={t('مثل دفتر الأستاذ أو المورد', 'Try ledger or supplier')}/></label>
      </div>
      <nav aria-label={t('أقسام التقارير','Report categories')} className="flex flex-wrap gap-2">
        {[['all', 'جميع الأقسام', 'All categories'], ...icgGroups].map(([id, ar, en]) => <button key={id} type="button"
          aria-pressed={category === id} onClick={() => { setCategory(id); setQuery(''); resetTable(); }}
          className="min-h-11 rounded-xl border border-teal-500/35 px-3 py-2 text-start text-sm font-semibold aria-pressed:bg-teal-700 aria-pressed:text-white">{t(ar,en)}</button>)}
      </nav>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(225px,1fr)_minmax(0,2.6fr)]">
        <section className={styles.panel} aria-labelledby="icg-report-list">
          <h3 id="icg-report-list">{t('التقارير', 'Reports')} · {number.format(results.length)}</h3>
          <ul className="grid max-h-72 gap-2 overflow-y-auto xl:max-h-[31rem]">{results.map(report => <li key={report.id}><button
            type="button" aria-pressed={active?.id === report.id} onClick={() => { setSelected(report.id); resetTable(); }}
            className="w-full rounded-xl border border-teal-500/25 px-3 py-2 text-start text-sm hover:bg-teal-500/10 aria-pressed:border-teal-500 aria-pressed:bg-teal-500/15">
            <strong className="block">{label(report.title)}</strong>
            <small>{report.sample ? t('معاينة تجريبية', 'Sample preview') : t('يتطلب بيانات ICG', 'Requires ICG data')}</small>
          </button></li>)}</ul>
          {!results.length ? <p className={styles.empty}><Search size={18} className="mx-auto mb-2"/>{t('لا توجد تقارير مطابقة.', 'No matching reports.')}</p> : null}
        </section>
        {active ? <section className={styles.panel} aria-labelledby="icg-active-report">
          <h3 id="icg-active-report">{label(active.title)}</h3>
          <p className="mb-4 text-sm leading-7"><strong>{t('البيانات المطلوبة من ICG', 'Required ICG data')}</strong><br/>{label(active.fields)}</p>
          {sample ? <>
            <p className={styles.notice} role="status">{t('معاينة ببيانات مولّدة. تعرض مثالًا على التقرير، وتختلف التفاصيل المتاحة حسب حقول الربط المعتمدة.', 'Synthetic preview. The details available in a live report depend on the approved source fields.')}</p>
            <div className={`my-4 ${styles.toolbar}`}>
              {!snapshot ? <label>{t('الفترة التجريبية', 'Sample period')}<select value={days} onChange={event => setDays(Number(event.target.value))}>
                {[1,7,30].map(day => <option key={day} value={day}>{day} {t('يوم', 'days')}</option>)}
              </select></label> : null}
              <label>{t('الفرع التجريبي', 'Sample branch')}<select value={branch} onChange={event => setBranch(event.target.value)}>
                <option value="all">{t('جميع الفروع','All branches')}</option>
                {DEMO_BRANCHES.map((id,index) => <option key={id} value={id}>{label(branches[index])}</option>)}
              </select></label>
              <label>{t('البحث داخل الجدول','Filter rows')}<input type="search" value={rowFilter} onChange={event => setRowFilter(event.target.value)}/></label>
              <button type="button" className="inline-flex items-center gap-2" onClick={exportCsv} disabled={!filtered.length}><Download size={16}/>{t('تنزيل CSV تجريبي','Download sample CSV')}</button>
            </div>
            <div className={styles.tableScroll} tabIndex={0} role="region" aria-label={t('جدول معاينة التقرير', 'Report preview table')}>
              <table className={styles.table}>
                <thead><tr>{sample.columns.map((column,index) => <th key={column[1]} scope="col" aria-sort={sortColumn === index ? ascending ? 'ascending' : 'descending' : undefined}>
                  <button type="button" className="underline underline-offset-4" onClick={() => { setSortColumn(index); setAscending(sortColumn === index ? !ascending : true); }}>
                    {label(column)} {sortColumn === index ? ascending ? '↑' : '↓' : ''}
                  </button></th>)}</tr></thead>
                <tbody>{filtered.map((row,index) => <tr key={index}>{row.map((cell,i) => <td key={i}>{typeof cell === 'number' ? number.format(cell) : cell}</td>)}</tr>)}</tbody>
              </table>
              {!filtered.length ? <p className={styles.empty}>{t('لا توجد صفوف مطابقة لهذه التصفية.', 'No rows match the current filters.')}</p> : null}
            </div>
            <p className="mt-3 text-sm" role="status">{number.format(filtered.length)} {t('صف في التقرير','report rows')}</p>
          </> : <p className="flex items-start gap-2 rounded-xl border border-amber-500/35 p-4 text-sm leading-6"><Table2 size={18} className="shrink-0"/>{t('بانتظار بيانات المصدر وتعريف الحقول لهذا التقرير من مزود الربط.', 'This report awaits source data and field definitions from the integration provider.')}</p>}
        </section> : null}
      </div>
    </div>
  </section>;
}
