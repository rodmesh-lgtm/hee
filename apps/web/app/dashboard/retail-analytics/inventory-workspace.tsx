'use client';
import { useRef, useState } from 'react';
import ReportTable from './report-table';
import type { InventoryReport } from '../../lib/retail-analytics/shopify-inventory';
export default function InventoryWorkspace({ businessName, businessId, english, accounts }: { businessName: string; businessId: string; english: boolean; accounts: { id: string; displayName: string | null; externalStoreId: string }[] }) {
  const t = (ar: string, en: string) => english ? en : ar;
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [report, setReport] = useState<InventoryReport | null>(null), [error, setError] = useState(''), [busy, setBusy] = useState(false), [stock, setStock] = useState('all');
  const generation = useRef(0);
  async function refresh() {
    const run = ++generation.current; setBusy(true); setError(''); setReport(null);
    try {
      const response = await fetch(`/api/retail-analytics/shopify?${new URLSearchParams({ businessId, accountId, report: 'inventory' })}`, { cache: 'no-store', signal: AbortSignal.timeout(85000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (data.businessId !== businessId || data.accountId !== accountId || !Array.isArray(data.report?.items)) throw new Error('WORKSPACE_CHANGED');
      if (run === generation.current) setReport(data.report);
    } catch (e) {
      if (run === generation.current) setError(e instanceof Error && e.message === 'PRODUCT_ACCESS_REQUIRED' ? t('الحساب لا يملك صلاحية قراءة المنتجات بعد. يلزم تحديث صلاحيات التطبيق لدى Shopify ثم إعادة التفويض؛ بيانات المبيعات لا تتأثر.', 'Product read access has not been granted. Update the Shopify app permissions and reauthorize; sales access is unaffected.') : t('تعذرت قراءة المخزون. تحقق من الحساب والصلاحيات ثم أعد المحاولة.', 'Inventory could not be read. Check the account and permissions, then retry.'));
    } finally { if (run === generation.current) setBusy(false); }
  }
  const items = report?.items.filter(i => stock === 'all' || (stock === 'untracked' ? !i.tracked : i.status === 'ACTIVE' && i.tracked && i.quantity !== null && (stock === 'out' ? i.quantity <= 0 : i.quantity > 0 && i.quantity <= 5))) ?? [];
  return <section className="space-y-5 rounded-2xl border border-slate-500/30 p-5">
    <h2 className="text-2xl font-bold">{t('المنتجات والمخزون الحالي', 'Products and current inventory')}</h2>
    <p className="leading-7">{t('الكميات القابلة للبيع لكل متغير منتج عبر المواقع. هذه لقطة حالية وليست حركة مخزون تاريخية. لا تُحسب قيمة المخزون أو الربح دون بيانات تكلفة موثوقة.', 'Current sellable quantities per product variant across locations. This is a current snapshot, not historical stock movement. Inventory valuation and profit require verified cost data.')}</p>
    <div className="flex flex-wrap gap-3"><label>{t('الحساب', 'Account')}<select className="mx-3 min-h-11 rounded-xl border bg-transparent px-3" value={accountId} onChange={e => { generation.current++; setAccountId(e.target.value); setReport(null); setError(''); setBusy(false); }}><option value="" disabled>{t('اختر حسابًا', 'Select an account')}</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.displayName || a.externalStoreId}</option>)}</select></label><button disabled={!accountId || busy} onClick={refresh} className="min-h-11 rounded-xl bg-teal-600 px-5 font-bold text-white disabled:opacity-50">{busy ? t('جارٍ القراءة…', 'Reading…') : t('تحديث المخزون', 'Refresh inventory')}</button></div>
    {!accounts.length ? <p>{t('اربط حساب Shopify من قسم الحسابات والربط أولًا.', 'Connect Shopify from Accounts and connection first.')}</p> : null}
    {error ? <p role="alert" className="rounded-xl border border-amber-500 p-4">{error}</p> : null}
    {report ? <><p>{t('وقت القراءة', 'Fetched')}: {new Date(report.fetchedAt).toLocaleString(english ? 'en-GB' : 'ar-SA', { timeZone: 'Asia/Riyadh' })}</p>{!report.complete ? <p role="alert" className="rounded-xl border border-amber-500 p-4">{t('قراءة جزئية: عُرضت أول 500 نتيجة كحد أقصى. المؤشرات تخص النتائج المقروءة فقط.', 'Partial snapshot: at most the first 500 variants. Indicators cover fetched results only.')}</p> : null}
    <dl className="grid gap-4 sm:grid-cols-3">{[[t('متغيرات مقروءة', 'Variants read'), report.items.length], [t('نفد المتاح من الأصناف النشطة', 'Active variants with no sellable stock'), report.items.filter(i => i.status === 'ACTIVE' && i.tracked && i.quantity !== null && i.quantity <= 0).length], [t('مخزون منخفض: من 1 إلى 5', 'Low stock: 1 to 5'), report.items.filter(i => i.status === 'ACTIVE' && i.tracked && i.quantity !== null && i.quantity > 0 && i.quantity <= 5).length]].map(([label,value]) => <div key={String(label)} className="rounded-xl bg-teal-500/5 p-4"><dt>{label}</dt><dd className="mt-2 text-2xl font-bold">{value}</dd></div>)}</dl>
    <label className="block">{t('حالة المخزون','Stock filter')}<select className="mx-3 min-h-11 rounded-xl border bg-transparent px-3" value={stock} onChange={e => setStock(e.target.value)}>{[['all',t('الكل','All')],['out',t('نافد — نشط','Out of stock — active')],['low',t('منخفض — نشط','Low stock — active')],['untracked',t('غير متتبع','Not tracked')]].map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
    <ReportTable key={`${accountId}:${report.fetchedAt}:${stock}`} english={english} report={{title:t('INFRO · تقرير المنتجات والمخزون','INFRO · Products and inventory report'), metadata:[businessName, accounts.find(a=>a.id===accountId)?.externalStoreId ?? '', `${t('وقت القراءة','Fetched')}: ${new Date(report.fetchedAt).toLocaleString(english?'en-GB':'ar-SA',{timeZone:'Asia/Riyadh'})}`, `${t('فلتر المخزون','Stock filter')}: ${stock}`, report.complete?t('لقطة مكتملة','Complete snapshot'):t('لقطة جزئية — أول 500 نتيجة فقط','Partial snapshot — first 500 variants only'),t('الكميات الحالية القابلة للبيع عبر المواقع؛ ليست حركة تاريخية أو تقييمًا ماليًا للمخزون.','Current sellable quantities across locations; not historical movement or inventory valuation.')], headers:[t('المنتج','Product'),'SKU',t('الحالة','Status'),t('الكمية القابلة للبيع','Sellable quantity')],rows:items.map(i=>[i.name,i.sku||'—',i.status=== 'ACTIVE'?t('نشط','Active'):i.status==='DRAFT'?t('مسودة','Draft'):t('مؤرشف','Archived'),!i.tracked?t('غير متتبع','Not tracked'):i.quantity??t('غير متاح','Unavailable')])}}/>
    </> : null}
  </section>;
}
