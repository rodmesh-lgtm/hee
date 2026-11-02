'use client';
import { connectRetailAccount, disconnectRetailAccountAction } from './actions';
import Link from 'next/link';
import InventoryWorkspace from './inventory-workspace';
import SalesReportDetails from './sales-report-details';
import { useAutoRefresh, RefreshStatus } from './auto-refresh';
import { useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
function ConnectButton({ disabled, label, pendingLabel }: { disabled: boolean; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return <button disabled={disabled || pending} className="min-h-11 rounded-xl bg-teal-600 px-4 font-bold text-white disabled:opacity-50">{pending ? pendingLabel : label}</button>;
}
import { combineShopifyReports, type ShopifyReport } from '../../lib/retail-analytics/shopify-report';

type Account = { provider: string; id: string; displayName: string | null; externalStoreId: string; status: string };
type Result = { report?: ShopifyReport; error?: string };
const inputClass = 'min-h-11 w-full rounded-xl border border-slate-500/40 bg-transparent px-3';
export default function ConnectedRetailWorkspace({ provider, businessId, businessName, english, accounts, configured, foodicsConfigured, connectionStatus, today, embedded = false, initialAccountId = 'all' }: {
  provider: 'shopify' | 'foodics' | 'icg'; businessId: string; businessName: string; english: boolean; accounts: Account[]; configured: boolean; foodicsConfigured: boolean; connectionStatus: string; today: string; embedded?: boolean; initialAccountId?: string;
}) {
  const t = (ar: string, en: string) => english ? en : ar;
  const [tab, setTab] = useState<'sales' | 'inventory' | 'accounts'>(provider === 'shopify' ? 'sales' : 'accounts');
  const [selectedAccount, setSelectedAccount] = useState(initialAccountId);
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(today);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const inFlight = useRef(false);
  const [rollingDays, setRollingDays] = useState<number | null>(1);
  const [currentDay, setCurrentDay] = useState(today);
  const errors: Record<string, string> = {
    INVALID_PERIOD: t('اختر فترة لا تتجاوز 31 يومًا ضمن آخر 59 يومًا.', 'Choose up to 31 days within the last 59 days.'),
    REAUTHORIZE_REQUIRED: t('انتهى التفويض أو نقصت الصلاحيات. أعد ربط الحساب.', 'Authorization expired or lacks access. Reconnect this account.'),
    WORKSPACE_CHANGED: t('تغيرت المنشأة أو الصلاحيات. حدّث الصفحة.', 'Workspace or access changed. Reload this page.'),
    ACCOUNT_UNAVAILABLE: t('الحساب مفصول أو غير متاح لهذه المنشأة.', 'Account disconnected or unavailable to this business.'),
    RATE_LIMITED: t('انتظر دقيقة ثم أعد التحديث.', 'Wait a minute before refreshing.'),
    PROVIDER_RATE_LIMIT: t('وصل الحساب إلى حد الطلبات لدى Shopify. أعد المحاولة لاحقًا.', 'Shopify rate limit reached. Try again later.'),
  };
  const active = accounts.filter(account => account.status === 'active' && account.provider === 'shopify' && (selectedAccount === 'all' || account.id === selectedAccount));
  let combined: ShopifyReport['totals'] = [];
  const allComplete = active.length > 0 && active.every(a => results[a.id]?.report?.complete && !results[a.id]?.error);
  if (allComplete) {
    try { combined = combineShopifyReports(active.map(a => results[a.id].report!)); } catch { combined = []; }
  }
  async function refresh(signal?: AbortSignal) {
    if (inFlight.current) return true;
    const nowDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year:'numeric', month:'2-digit', day:'2-digit' }).format(new Date());
    setCurrentDay(nowDay);
    if (rollingDays && until !== nowDay) {
      const start = new Date(`${nowDay}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - rollingDays + 1);
      setFrom(start.toISOString().slice(0,10)); setUntil(nowDay); setResults({}); return true;
    }
    inFlight.current = true;
    let success = true;
    const nextResults: Record<string, Result> = {};
    const run = ++generation.current;
    setLoading(true);
    for (const [index, account] of active.entries()) {
      if (index) await new Promise(resolve => setTimeout(resolve, 8000));
      if (generation.current !== run || signal?.aborted) break;
      try {
        const params = new URLSearchParams({ businessId, accountId: account.id, from, until });
        const response = await fetch(`/api/retail-analytics/shopify?${params}`, { cache: 'no-store', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(85000)]) : AbortSignal.timeout(85000) });
        const payload = await response.json();
        if (generation.current !== run || signal?.aborted) break;
        if (!response.ok) throw new Error(payload.error || 'REPORT_UNAVAILABLE');
        if (payload.businessId !== businessId || payload.accountId !== account.id || !payload.report) throw new Error('WORKSPACE_CHANGED');
        nextResults[account.id] = { report: payload.report };
      } catch (error) {
        if (generation.current !== run || signal?.aborted) break;
        success = false;
        const code = error instanceof Error ? error.message : '';
        const accessLost = ['WORKSPACE_CHANGED','ACCOUNT_UNAVAILABLE','REAUTHORIZE_REQUIRED','UNAUTHENTICATED'].includes(code);
        if (code === 'WORKSPACE_CHANGED' || code === 'UNAUTHENTICATED') for (const key of Object.keys(nextResults)) delete nextResults[key];
        nextResults[account.id] = { ...(accessLost ? {} : results[account.id]), error: errors[code] ?? t('تعذرت قراءة التقرير. أعد المحاولة؛ لم تُستبدل البيانات بأرقام صفرية.', 'Report unavailable. Retry; failure is not represented as zero sales.') };
        if (accessLost) { setResults({}); break; }
      }
    }
    inFlight.current = false;
    if (generation.current === run) { if (!signal?.aborted) setResults(nextResults); setLoading(false); }
    return success;
  }
  const automatic = useAutoRefresh(`${businessId}:${selectedAccount}:${from}:${until}:${active.map(a=>a.id).join(',')}`, provider === 'shopify' && tab === 'sales' && configured && active.length > 0, refresh);
  function changePeriod(field: 'from' | 'until', value: string) {
    setRollingDays(null);
    generation.current++; setLoading(false); setResults({});
    if (field === 'from') setFrom(value); else setUntil(value);
  }
  function quickPeriod(days: number) {
    setRollingDays(days);
    const start = new Date(`${currentDay}T12:00:00Z`); start.setUTCDate(start.getUTCDate() - days + 1);
    generation.current++; setLoading(false); setResults({}); setFrom(start.toISOString().slice(0,10)); setUntil(currentDay);
  }
  return <div className="space-y-6 pb-8" dir={english ? 'ltr' : 'rtl'}>
    {!embedded ? <><Link href="/dashboard/retail-analytics" className="inline-block font-bold text-teal-700 dark:text-teal-300">{t('العودة إلى مركز تحليلات الأعمال', 'Back to business analytics hub')}</Link>
    <header className="rounded-3xl border border-teal-500/25 bg-teal-500/5 p-6">
      <p>{businessName}</p><h1 className="mt-2 text-3xl font-bold">{provider === 'icg' ? 'ICG Manager 2018' : provider === 'shopify' ? 'Shopify' : 'Foodics'} · {t('لوحة التحليلات', 'Analytics dashboard')}</h1>
      <p className="mt-3 leading-7">{t('اقرأ تقارير حساباتك المصرّح بها من المصدر الرسمي في لوحة واحدة. تظهر حالة كل حساب وآخر وقت قراءة بصورة مستقلة.', 'Read authorized account reports from the official provider in one dashboard. Each account shows its own status and fetch time.')}</p>
    </header></> : null}
    {connectionStatus ? <p role="status" className="rounded-xl border border-teal-500/40 p-4">{connectionStatus === 'connected' || connectionStatus === 'already-connected' ? t('الحساب مرتبط. يمكنك قراءة التقارير المتاحة أدناه.', 'Account connected. Read available reports below.') : connectionStatus === 'not-configured' ? t('يحتاج الربط إلى إكمال إعداد تطبيق INFRO لدى المزود.', 'INFRO provider app setup must be completed.') : connectionStatus === 'disconnected' ? t('تم فصل الحساب وإيقاف الوصول.', 'Account disconnected and access stopped.') : connectionStatus === 'revocation-pending' ? t('توقفت القراءة في INFRO؛ إلغاء التفويض لدى المزود لم يتأكد بعد. أعد محاولة الفصل.', 'INFRO reads stopped; provider revocation is not confirmed. Retry disconnect.') : connectionStatus === 'cancelled' ? t('تم إلغاء التفويض.', 'Authorization cancelled.') : t('لم يكتمل التفويض. تحقق من تسجيل الدخول والمنشأة، ثم أعد المحاولة برابط جديد.', 'Authorization did not complete. Check your sign-in and workspace, then try a new authorization link.')} </p> : null}
    {provider === 'shopify' ? <nav aria-label={t('أقسام Shopify', 'Shopify sections')} className="flex flex-wrap gap-3">{(['sales', 'inventory', 'accounts'] as const).map(value => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)} className={`min-h-11 rounded-xl border px-5 font-bold ${tab === value ? 'bg-teal-600 text-white' : 'border-slate-500/30'}`}>{value === 'sales' ? t('المبيعات والمدفوعات', 'Sales and payments') : value === 'inventory' ? t('المنتجات والمخزون', 'Products and inventory') : t('الحسابات والربط', 'Accounts and connection')}</button>)}</nav> : null}
    {provider === 'shopify' && tab === 'inventory' ? <InventoryWorkspace businessName={businessName} businessId={businessId} english={english} accounts={accounts.filter(a => a.status === 'active')}/> : null}
    <div hidden={tab !== 'accounts' && accounts.length > 0}>
    <section className="grid gap-4" aria-label={t('حالة المنصات', 'Provider readiness')}>
      {provider === 'shopify' ? <div className="rounded-2xl border border-slate-500/30 p-5"><h2 className="text-xl font-bold">Shopify</h2><p className="my-3">{configured ? t('قراءة عبر Admin API للحسابات المرتبطة.', 'Admin API reporting for connected accounts.') : t('إعداد تطبيق Shopify على الخادم غير مكتمل.', 'Server-side Shopify app configuration is incomplete.')}</p><form action={connectRetailAccount} className="space-y-3"><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="provider" value="shopify"/><label className="block text-sm">{t('عنوان المتجر الأصلي', 'Original shop domain')}<input name="shop" required maxLength={255} placeholder="store.myshopify.com" autoCapitalize="none" autoCorrect="off" dir="ltr" className={inputClass}/></label><ConnectButton disabled={!configured} label={t('ربط حساب Shopify', 'Connect Shopify account')} pendingLabel={t('جارٍ فتح التفويض…', 'Opening authorization…')}/></form></div> : null}
      {provider === 'foodics' ? <div className="rounded-2xl border border-amber-500/30 p-5"><h2 className="text-xl font-bold">Foodics</h2><p className="my-3">{foodicsConfigured ? t('سجّل الدخول لدى Foodics ووافق على صلاحيات القراءة.', 'Sign in to Foodics and approve read access.') : t('ينتظر تفعيل تطبيق INFRO وبيانات التفويض من Foodics.', 'Awaiting INFRO app activation and OAuth credentials from Foodics.')}</p><form action={connectRetailAccount}><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="provider" value="foodics"/><ConnectButton disabled={!foodicsConfigured} label={t('ربط حساب Foodics', 'Connect Foodics account')} pendingLabel={t('جارٍ فتح التفويض…', 'Opening authorization…')}/></form></div> : null}
      {provider === 'icg' ? <div className="rounded-2xl border border-amber-500/30 p-5"><h2 className="text-xl font-bold">ICG Manager 2018</h2><p className="my-3">{t('بانتظار وثائق الربط المعتمدة من ICG. بوابة المستندات وحدها لا تفعّل مزامنة التحليلات.', 'Awaiting ICG-approved integration documentation. The document portal alone does not enable analytics synchronization.')}</p></div> : null}
    </section>
    </div>
    <div hidden={provider !== 'shopify' || tab !== 'sales'} className="space-y-6">
    <section className="space-y-4 rounded-2xl border border-slate-500/30 p-5">
      <h2 className="text-xl font-bold">{t('تقرير طلبات Shopify', 'Shopify order report')}</h2>
      <details className="rounded-xl border border-slate-500/20 p-3"><summary className="cursor-pointer text-sm font-semibold">{t('كيف تُحسب هذه الأرقام؟','How are these figures calculated?')}</summary>      <p className="text-sm leading-7">{t('الفترة حسب تاريخ إنشاء الطلب بتوقيت الرياض. القيم تعكس الحالة الحالية لتلك الطلبات، وتشمل استرداداتها اللاحقة؛ ليست تقرير حركة النقد خلال الفترة. تُستبعد الطلبات التجريبية، ولا تُحتسب قيمة الطلبات الملغاة ضمن إجمالي الطلبات. لا يُعرض الربح دون تكلفة البضاعة.', 'Period uses order creation date in Riyadh time. Values reflect those orders’ current state, including later refunds; this is not a cash-movement report for the period. Test orders are excluded. Cancelled order values are excluded from current order totals. Profit is unavailable without goods costs.')}</p></details>
      <label className="block">{t('الحساب', 'Account')}<select className={inputClass} value={selectedAccount} onChange={e => { generation.current++; setResults({}); setLoading(false); setSelectedAccount(e.target.value); }}><option value="all">{t('جميع حسابات Shopify', 'All Shopify accounts')}</option>{accounts.filter(a => a.status === 'active').map(a => <option key={a.id} value={a.id}>{a.displayName || a.externalStoreId}</option>)}</select></label>
      <div className="flex flex-wrap gap-2">{[1,7,30].map(days => <button key={days} aria-pressed={rollingDays===days} onClick={() => quickPeriod(days)} className={`min-h-11 rounded-xl border px-4 font-semibold ${rollingDays===days?'border-teal-600 bg-teal-600 text-white':'border-slate-500/30'}`}>{days === 1 ? t('اليوم','Today') : `${t('آخر','Last')} ${days} ${t('أيام','days')}`}</button>)}</div>
      <p className="text-sm">{t('يمكن اختيار فترة حتى 31 يومًا ضمن آخر 59 يومًا. التاريخ الأقدم يحتاج موافقة Shopify وصلاحية إضافية.', 'Choose up to 31 days within the last 59 days. Older history needs Shopify approval and additional access.')}</p>
      <div className="grid items-end gap-4 md:grid-cols-3"><label>{t('من', 'From')}<input className={inputClass} type="date" value={from} max={currentDay} onChange={e => changePeriod('from', e.target.value)}/></label><label>{t('إلى (شامل)', 'Through (inclusive)')}<input className={inputClass} type="date" value={until} max={currentDay} onChange={e => changePeriod('until', e.target.value)}/></label><button disabled={loading || !configured || !active.length} className="min-h-11 rounded-xl bg-teal-600 px-4 font-bold text-white disabled:opacity-50" onClick={() => void refresh()}>{loading ? t('جارٍ قراءة الحسابات…', 'Reading accounts…') : t('تحديث التقارير من Shopify', 'Refresh reports from Shopify')}</button></div>
      <p className="text-sm">{t('حسابات متصلة:', 'Connected accounts:')} {active.length}</p>{active.length && configured ? <RefreshStatus state={automatic} busy={loading} english={english}/> : null}
    </section>
    {allComplete && active.length > 1 ? <SalesReportDetails english={english} businessName={businessName} accountName={t('جميع المتاجر: ','All stores: ') + active.map(a=>a.externalStoreId).join(', ')} report={{...results[active[0].id].report!, fetchedAt: active.map(a=>results[a.id].report!.fetchedAt).sort()[0], totals:combined, ordersRead:active.reduce((n,a)=>n+results[a.id].report!.ordersRead,0), orders:active.flatMap(a=>results[a.id].report!.orders.map(o=>({...o,reference:`${a.externalStoreId} · ${o.reference}`})))}}/> : null}

    </div>
    <div hidden={tab === 'inventory'} className="space-y-5">
    {!accounts.length ? <p className="rounded-2xl border border-dashed border-slate-500/40 p-6">{t('لم تُضف حسابات إلى هذه المنشأة. ابدأ بالربط من بطاقات المنصات أعلاه.', 'No accounts belong to this workspace yet. Start with the provider cards above.')}</p> : accounts.filter(a => tab === 'accounts' || selectedAccount === 'all' || selectedAccount === a.id).map(account => {
      const result = results[account.id];
      return <section key={account.id} className="space-y-4 rounded-2xl border border-slate-500/30 p-5">
        <h2 className="text-xl font-bold">{account.displayName || (account.externalStoreId.startsWith('pending:') ? 'Foodics' : account.externalStoreId)}</h2><p dir="ltr" className="text-sm">{account.provider} · {account.externalStoreId.startsWith('pending:') ? t('بانتظار التفويض', 'Awaiting authorization') : account.externalStoreId}</p>
        <p>{account.status === 'active' ? t('التفويض متصل', 'Authorization connected') : account.status === 'authorizing' ? t('جارٍ التحقق من التفويض؛ التقارير غير متاحة بعد.', 'Authorization verification in progress; reports are not available yet.') : account.status === 'authorization_review_required' ? t('تعثر التفويض ويحتاج مراجعة الدعم قبل إعادة المحاولة. لم يُفعّل الوصول إلى التقارير.', 'Authorization requires support review before retrying. Report access was not enabled.') : account.status === 'revocation_pending' ? t('القراءة متوقفة؛ إلغاء التفويض قيد الإكمال', 'Reads stopped; revocation pending') : t('يحتاج إكمال الربط', 'Connection required')}</p>
        {['draft', 'disconnected'].includes(account.status) ? <form action={connectRetailAccount}><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="provider" value={account.provider}/><input type="hidden" name="integrationId" value={account.id}/><input type="hidden" name="shop" value={account.provider === 'shopify' ? account.externalStoreId : ''}/><ConnectButton disabled={account.provider === 'shopify' ? !configured : !foodicsConfigured} label={t('إكمال ربط هذا الحساب', 'Complete this account connection')} pendingLabel={t('جارٍ فتح التفويض…', 'Opening authorization…')}/></form> : null}
        {tab === 'accounts' && (account.status === 'active' || account.status === 'revocation_pending') ? <details className="rounded-xl border border-slate-500/30 p-3"><summary className="cursor-pointer">{t('فصل الحساب وإلغاء التفويض', 'Disconnect and revoke access')}</summary><p className="my-3 text-sm">{t('يوقف قراءة هذا الحساب في INFRO ويلغي وصول التطبيق لدى المزود. في Shopify يُزال تطبيق INFRO من هذا المتجر. قد تتأثر خدمات أخرى تستخدم الربط نفسه، ويمكن إعادة الربط لاحقًا.', 'Stops INFRO reads and revokes provider access. On Shopify, INFRO is uninstalled from this store. Other services sharing this connection may be affected. You can authorize again later.')}</p><form action={disconnectRetailAccountAction}><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="integrationId" value={account.id}/><label className="mb-3 flex gap-2"><input type="checkbox" name="confirm" value="yes" required/>{t('أؤكد فصل هذا الحساب', 'I confirm disconnection of this account')}</label><ConnectButton disabled={false} label={t('تأكيد الفصل', 'Confirm disconnect')} pendingLabel={t('جارٍ الفصل…', 'Disconnecting…')}/></form></details> : null}
        {result?.error ? <p role="alert" className="rounded-xl border border-amber-500 p-3">{result.error}{result.report ? t(' المعروض أدناه آخر قراءة ناجحة وقد يكون قديمًا.', ' Below is the last successful snapshot and may be stale.') : ''}</p> : null}
        {result?.report ? <>
          <SalesReportDetails report={result.report} english={english} businessName={businessName} accountName={`${account.displayName || account.externalStoreId} · ${account.externalStoreId}`}/>

        </> : !result?.error ? <p className="text-sm">{account.provider === 'foodics' ? t('التحقق من الحساب متاح؛ قارئ تقارير Foodics لم يُفعّل بعد.', 'Account verification is supported; Foodics reporting is not enabled yet.') : loading ? t('جارٍ تجهيز مؤشرات المتجر…', 'Preparing store insights…') : t('تظهر البيانات بعد أول قراءة ناجحة. يمكنك تحديثها من الأعلى.', 'Data appears after the first successful read. You can refresh above.')}</p> : null}
      </section>;
    })}
    </div>
  </div>;
}
