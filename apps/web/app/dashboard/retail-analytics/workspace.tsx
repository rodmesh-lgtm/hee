'use client';
import { useMemo, useState } from 'react';
import { summarizeRetailEvents, type RetailEvent } from '../../lib/retail-analytics/ledger';
import { importFields, importRetailTable, parseRetailTable, type ColumnMap } from '../../lib/retail-analytics/tabular-import';

type Account = { id: string; name: string; provider: RetailEvent['provider']; events: RetailEvent[] };
const emptyMap: ColumnMap = { eventId: -1, date: -1, kind: -1, gross: -1, discount: -1, tax: -1, cost: -1 };
const labels = { eventId: ['معرّف الحركة الفريد', 'Unique event ID'], date: ['التاريخ YYYY-MM-DD', 'Date YYYY-MM-DD'], kind: ['بيع / مرتجع', 'sale / refund'], gross: ['المبيعات قبل الخصم والضريبة', 'Gross excluding tax and before discounts'], discount: ['الخصم (اختياري)', 'Discount (optional)'], tax: ['مبلغ الضريبة', 'Tax amount'], cost: ['تكلفة البضاعة الفعلية (اختياري)', 'Actual goods cost (optional)'] };
const control = 'min-h-11 w-full rounded-xl border border-slate-500/40 bg-transparent p-3 text-sm';
export default function RetailWorkspace({ businessId, businessName, english }: { businessId: string; businessName: string; english: boolean }) {
  const t = (ar: string, en: string) => english ? en : ar;
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [text, setText] = useState('');
  const [rows, setRows] = useState<string[][]>([]);
  const [columns, setColumns] = useState<ColumnMap>(emptyMap);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<RetailEvent['provider']>('icg');
  const [currency, setCurrency] = useState('SAR');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('all');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  const result = useMemo(() => {
    const visible = accounts.filter(a => selected === 'all' || a.id === selected);
    try {
      const end = until ? new Date(`${until}T00:00:00+03:00`) : null;
      if (end) end.setUTCDate(end.getUTCDate() + 1);
      return { totals: summarizeRetailEvents(visible.flatMap(a => a.events), { businessId, accountIds: visible.map(a => a.id), from: from ? `${from}T00:00:00+03:00` : '0001-01-01T00:00:00Z', until: end ? end.toISOString() : '9999-12-31T23:59:59Z' }), invalid: false };
    } catch { return { totals: [], invalid: true }; }
  }, [accounts, businessId, from, until, selected]);
  function inspect() {
    try { setRows(parseRetailTable(text)); setColumns(emptyMap); setError(''); }
    catch { setRows([]); setError(t('تعذر قراءة الجدول. انسخ العناوين والصفوف من Excel، بحد أقصى 10,000 صف و2 مليون حرف.', 'Could not parse table. Copy headers and rows from Excel, up to 10,000 rows and 2 million characters.')); }
  }
  function importData() {
    try {
      if (!name.trim() || accounts.some(a => a.name === name.trim() && a.provider === provider)) throw new Error('ACCOUNT_NAME_REQUIRED_OR_DUPLICATE');
      const id = crypto.randomUUID();
      const events = importRetailTable(rows, columns, { businessId, accountId: id, provider, currency });
      setAccounts(current => [...current, { id, name: name.trim(), provider, events }]);
      setText(''); setRows([]); setName(''); setError('');
    } catch (e) { setError(t('لم يُستورد أي صف. راجع تعيين الأعمدة والقيم. رمز الفحص: ', 'No rows imported. Check column mapping and values. Diagnostic: ') + (e instanceof Error ? e.message : 'INVALID_IMPORT')); }
  }
  return <div className="space-y-6 pb-8" dir={english ? 'ltr' : 'rtl'}>
    <header className="rounded-3xl border border-teal-500/25 bg-teal-500/5 p-6">
      <p className="text-sm">{businessName}</p><h1 className="mt-2 text-3xl font-bold">{t('تحليلات التجزئة', 'Retail analytics')}</h1>
      <p className="mt-3 leading-7">{t('قارن المبيعات والمرتجعات بين حساباتك. بيانات مستوردة يدويًا — المزامنة المباشرة غير مفعلة.', 'Compare sales and returns across accounts. Manual imports — live synchronization is not enabled.')}</p>
      <p className="mt-2 text-sm leading-6">{t('هذه جلسة تحليل مؤقتة: تبقى البيانات في هذه الصفحة فقط، ولا تُحفظ على الخادم. تحديث الصفحة أو مغادرتها يفقد الاستيراد.', 'Temporary analysis session: data stays on this page and is not saved to the server. Reloading or leaving the page discards imports.')}</p>
    </header>
    <section className="rounded-2xl border border-slate-500/30 p-5 space-y-4" aria-labelledby="retail-import">
      <h2 id="retail-import" className="text-xl font-bold">{t('إضافة تقرير حساب', 'Add an account report')}</h2>
      <p className="text-sm leading-7">{t('ICG Manager 2018: صدّر تقرير الحركات إلى Excel، ثم انسخ الجدول بعناوينه. استخدم صفًا لكل حركة، ومعرّفًا فريدًا يشمل الشركة ونوع المستند ورقمه. لا تجمع الفاتورة مع سند التسليم المقابل لها. استخدم مبالغ موجبة؛ نوع الحركة يحدد المرتجع. المبالغ دون فواصل آلاف وبمنزلتين عشريتين كحد أقصى.', 'Export transactions from ICG Manager 2018 to Excel, then copy the table with headers. Use one row per event and a unique ID including company, document type and number. Do not count both an invoice and its delivery note. Use positive amounts; the event type identifies refunds. Amounts must have no thousands separators and at most two decimals.')}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <label>{t('اسم الحساب / الشركة', 'Account / company name')}<input className={control} maxLength={80} value={name} onChange={e => setName(e.target.value)}/></label>
        <label>{t('المصدر', 'Source')}<select className={control} value={provider} onChange={e => setProvider(e.target.value as RetailEvent['provider'])}><option value="icg">ICG Manager 2018</option><option value="shopify">Shopify</option><option value="foodics">Foodics</option></select></label>
        <label>{t('عملة التقرير', 'Report currency')}<select className={control} value={currency} onChange={e => setCurrency(e.target.value)}>{['SAR','USD','EUR','AED'].map(c => <option key={c}>{c}</option>)}</select></label>
      </div>
      <label className="block">{t('جدول Excel المنسوخ', 'Copied Excel table')}<textarea className={`${control} mt-2 font-mono`} dir="auto" rows={5} maxLength={2_000_000} value={text} onChange={e => { setText(e.target.value); setRows([]); }}/></label>
      <button className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white" onClick={inspect}>{t('قراءة الأعمدة', 'Read columns')}</button>
      {rows.length > 0 ? <div className="space-y-4"><p>{t('عدد الصفوف:', 'Rows:')} {rows.length - 1}</p><div className="grid gap-3 md:grid-cols-2">{importFields.map(field => <label key={field}>{labels[field][english ? 1 : 0]}<select className={control} value={columns[field]} onChange={e => setColumns(c => ({ ...c, [field]: Number(e.target.value) }))}><option value={-1}>{t('اختر العمود', 'Select column')}</option>{rows[0].map((h, i) => <option key={i} value={i}>{i + 1}. {h}</option>)}</select></label>)}</div><p className="text-sm">{t('اترك الخصم غير محدد فقط إذا كان التقرير لا يحتوي خصومات. غياب التكلفة يمنع عرض الربح.', 'Leave discount unmapped only when no discounts apply. Missing costs prevent profit calculation.')}</p><button className="rounded-xl bg-teal-600 px-5 py-3 font-bold text-white" onClick={importData}>{t('تحليل التقرير', 'Analyze report')}</button></div> : null}
      {error ? <p role="alert" className="rounded-xl border border-red-500 p-3">{error}</p> : null}
    </section>
    {accounts.length ? <section className="space-y-4">
      <h2 className="text-xl font-bold">{t('نتائج التقارير المستوردة', 'Imported report results')}</h2>
      <div className="grid gap-3 md:grid-cols-3"><label>{t('الحساب', 'Account')}<select className={control} value={selected} onChange={e => setSelected(e.target.value)}><option value="all">{t('كل الحسابات', 'All accounts')}</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.name} · {a.provider}</option>)}</select></label><label>{t('من تاريخ', 'From')}<input type="date" className={control} value={from} onChange={e => setFrom(e.target.value)}/></label><label>{t('إلى تاريخ (شامل)', 'Through date (inclusive)')}<input type="date" className={control} value={until} onChange={e => setUntil(e.target.value)}/></label></div>
      {result.invalid ? <p role="alert">{t('تحقق من الفترة أو من تعارض البيانات.', 'Check date range or conflicting data.')}</p> : result.totals.length === 0 ? <p>{t('لا توجد حركات ضمن الفترة.', 'No events in this period.')}</p> : result.totals.map(total => <div key={total.currency} className="rounded-2xl border border-teal-500/30 p-5"><h3 className="font-bold">{total.currency}</h3><dl className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[
        [t('المبيعات قبل الخصم والضريبة', 'Gross sales excluding tax'), total.grossSalesMinor], [t('الخصومات', 'Discounts'), total.discountsMinor], [t('المرتجعات دون الضريبة', 'Returns excluding tax'), total.returnsMinor], [t('صافي المبيعات دون الضريبة', 'Net sales excluding tax'), total.netSalesMinor], [t('صافي الضريبة', 'Net tax'), total.netTaxMinor], [t('إجمالي الربح قبل المصروفات', 'Gross profit before expenses'), total.grossProfitMinor],
      ].map(([label, value]) => <div key={String(label)}><dt className="text-sm">{label}</dt><dd className="mt-2 text-xl font-bold">{value === null ? t('غير متاح: التكلفة ناقصة', 'Unavailable: costs missing') : new Intl.NumberFormat(english ? 'en' : 'ar-SA', { style: 'currency', currency: total.currency }).format(Number(value) / 100)}</dd></div>)}</dl></div>)}
      <ul className="space-y-2">{accounts.map(a => <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-500/30 p-3"><span>{a.name} · {a.provider}</span><button className="min-h-11 underline" onClick={() => { setAccounts(current => current.filter(item => item.id !== a.id)); if (selected === a.id) setSelected('all'); }}>{t('إزالة التقرير من الجلسة', 'Remove report from session')}</button></li>)}</ul>
    </section> : <p className="rounded-2xl border border-dashed border-slate-500/40 p-6">{t('لم تضف أي تقرير بعد. ستظهر الأرقام بعد قراءة بياناتك والتحقق منها.', 'No reports added. Metrics appear after importing and validating your data.')}</p>}
  </div>;
}
