'use client';
import { connectRetailAccount, disconnectRetailAccountAction } from './actions';
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
export default function ConnectedRetailWorkspace({ businessId, businessName, english, accounts, configured, foodicsConfigured, connectionStatus, today }: {
  businessId: string; businessName: string; english: boolean; accounts: Account[]; configured: boolean; foodicsConfigured: boolean; connectionStatus: string; today: string;
}) {
  const t = (ar: string, en: string) => english ? en : ar;
  const [from, setFrom] = useState(today);
  const [until, setUntil] = useState(today);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const errors: Record<string, string> = {
    INVALID_PERIOD: t('اختر فترة لا تتجاوز 31 يومًا ضمن آخر 59 يومًا.', 'Choose up to 31 days within the last 59 days.'),
    REAUTHORIZE_REQUIRED: t('انتهى التفويض أو نقصت الصلاحيات. أعد ربط الحساب.', 'Authorization expired or lacks access. Reconnect this account.'),
    WORKSPACE_CHANGED: t('تغيرت المنشأة أو الصلاحيات. حدّث الصفحة.', 'Workspace or access changed. Reload this page.'),
    ACCOUNT_UNAVAILABLE: t('الحساب مفصول أو غير متاح لهذه المنشأة.', 'Account disconnected or unavailable to this business.'),
    RATE_LIMITED: t('انتظر دقيقة ثم أعد التحديث.', 'Wait a minute before refreshing.'),
    PROVIDER_RATE_LIMIT: t('وصل الحساب إلى حد الطلبات لدى Shopify. أعد المحاولة لاحقًا.', 'Shopify rate limit reached. Try again later.'),
  };
  const active = accounts.filter(account => account.status === 'active' && account.provider === 'shopify');
  let combined: ShopifyReport['totals'] = [];
  const allComplete = active.length > 0 && active.every(a => results[a.id]?.report?.complete);
  if (allComplete) {
    try { combined = combineShopifyReports(active.map(a => results[a.id].report!)); } catch { combined = []; }
  }
  async function refresh() {
    const run = ++generation.current;
    setLoading(true); setResults({});
    for (const account of active) {
      if (generation.current !== run) break;
      try {
        const params = new URLSearchParams({ businessId, accountId: account.id, from, until });
        const response = await fetch(`/api/retail-analytics/shopify?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(85000) });
        const payload = await response.json();
        if (generation.current !== run) break;
        if (!response.ok) throw new Error(payload.error || 'REPORT_UNAVAILABLE');
        if (payload.businessId !== businessId || payload.accountId !== account.id || !payload.report) throw new Error('WORKSPACE_CHANGED');
        setResults(current => ({ ...current, [account.id]: { report: payload.report } }));
      } catch (error) {
        if (generation.current !== run) break;
        const code = error instanceof Error ? error.message : '';
        setResults(current => ({ ...current, [account.id]: { error: errors[code] ?? t('تعذرت قراءة التقرير. أعد المحاولة؛ لم تُستبدل البيانات بأرقام صفرية.', 'Report unavailable. Retry; failure is not represented as zero sales.') } }));
      }
    }
    if (generation.current === run) setLoading(false);
  }
  function changePeriod(field: 'from' | 'until', value: string) {
    generation.current++; setLoading(false); setResults({});
    if (field === 'from') setFrom(value); else setUntil(value);
  }
  return <div className="space-y-6 pb-8" dir={english ? 'ltr' : 'rtl'}>
    <header className="rounded-3xl border border-teal-500/25 bg-teal-500/5 p-6">
      <p>{businessName}</p><h1 className="mt-2 text-3xl font-bold">{t('تحليلات التجزئة — حساباتك المرتبطة', 'Retail analytics — connected accounts')}</h1>
      <p className="mt-3 leading-7">{t('اقرأ تقارير حساباتك المصرّح بها من المصدر الرسمي في لوحة واحدة. تظهر حالة كل حساب وآخر وقت قراءة بصورة مستقلة.', 'Read authorized account reports from the official provider in one dashboard. Each account shows its own status and fetch time.')}</p>
    </header>
    {connectionStatus ? <p role="status" className="rounded-xl border border-teal-500/40 p-4">{connectionStatus === 'connected' || connectionStatus === 'already-connected' ? t('الحساب مرتبط. يمكنك قراءة التقارير المتاحة أدناه.', 'Account connected. Read available reports below.') : connectionStatus === 'not-configured' ? t('يحتاج الربط إلى إكمال إعداد تطبيق INFRO لدى المزود.', 'INFRO provider app setup must be completed.') : connectionStatus === 'disconnected' ? t('تم فصل الحساب وإيقاف الوصول.', 'Account disconnected and access stopped.') : connectionStatus === 'revocation-pending' ? t('توقفت القراءة في INFRO؛ إلغاء التفويض لدى المزود لم يتأكد بعد. أعد محاولة الفصل.', 'INFRO reads stopped; provider revocation is not confirmed. Retry disconnect.') : connectionStatus === 'cancelled' ? t('تم إلغاء التفويض.', 'Authorization cancelled.') : t('لم يكتمل التفويض. تحقق من تسجيل الدخول والمنشأة، ثم أعد المحاولة برابط جديد.', 'Authorization did not complete. Check your sign-in and workspace, then try a new authorization link.')} </p> : null}
    <section className="grid gap-4 md:grid-cols-3" aria-label={t('حالة المنصات', 'Provider readiness')}>
      <div className="rounded-2xl border border-slate-500/30 p-5"><h2 className="text-xl font-bold">Shopify</h2><p className="my-3">{configured ? t('قراءة عبر Admin API للحسابات المرتبطة.', 'Admin API reporting for connected accounts.') : t('إعداد تطبيق Shopify على الخادم غير مكتمل.', 'Server-side Shopify app configuration is incomplete.')}</p><form action={connectRetailAccount} className="space-y-3"><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="provider" value="shopify"/><label className="block text-sm">{t('عنوان المتجر الأصلي', 'Original shop domain')}<input name="shop" required maxLength={255} placeholder="store.myshopify.com" autoCapitalize="none" autoCorrect="off" dir="ltr" className={inputClass}/></label><ConnectButton disabled={!configured} label={t('ربط حساب Shopify', 'Connect Shopify account')} pendingLabel={t('جارٍ فتح التفويض…', 'Opening authorization…')}/></form></div>
      <div className="rounded-2xl border border-amber-500/30 p-5"><h2 className="text-xl font-bold">Foodics</h2><p className="my-3">{foodicsConfigured ? t('سجّل الدخول لدى Foodics ووافق على صلاحيات القراءة.', 'Sign in to Foodics and approve read access.') : t('ينتظر تفعيل تطبيق INFRO وبيانات التفويض من Foodics.', 'Awaiting INFRO app activation and OAuth credentials from Foodics.')}</p><form action={connectRetailAccount}><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="provider" value="foodics"/><ConnectButton disabled={!foodicsConfigured} label={t('ربط حساب Foodics', 'Connect Foodics account')} pendingLabel={t('جارٍ فتح التفويض…', 'Opening authorization…')}/></form></div>
      <div className="rounded-2xl border border-amber-500/30 p-5"><h2 className="text-xl font-bold">ICG Manager 2018</h2><p className="my-3">{t('بانتظار وثائق الربط المعتمدة من ICG. بوابة المستندات وحدها لا تفعّل مزامنة التحليلات.', 'Awaiting ICG-approved integration documentation. The document portal alone does not enable analytics synchronization.')}</p></div>
    </section>
    <section className="space-y-4 rounded-2xl border border-slate-500/30 p-5">
      <h2 className="text-xl font-bold">{t('تقرير طلبات Shopify', 'Shopify order report')}</h2>
      <p className="text-sm leading-7">{t('الفترة حسب تاريخ إنشاء الطلب بتوقيت الرياض. القيم تعكس الحالة الحالية لتلك الطلبات، وتشمل استرداداتها اللاحقة؛ ليست تقرير حركة النقد خلال الفترة. تُستبعد الطلبات التجريبية، ولا تُحتسب قيمة الطلبات الملغاة ضمن إجمالي الطلبات. لا يُعرض الربح دون تكلفة البضاعة.', 'Period uses order creation date in Riyadh time. Values reflect those orders’ current state, including later refunds; this is not a cash-movement report for the period. Test orders are excluded. Cancelled order values are excluded from current order totals. Profit is unavailable without goods costs.')}</p>
      <div className="grid items-end gap-4 md:grid-cols-3"><label>{t('من', 'From')}<input className={inputClass} type="date" value={from} max={today} onChange={e => changePeriod('from', e.target.value)}/></label><label>{t('إلى (شامل)', 'Through (inclusive)')}<input className={inputClass} type="date" value={until} max={today} onChange={e => changePeriod('until', e.target.value)}/></label><button disabled={loading || !configured || !active.length} className="min-h-11 rounded-xl bg-teal-600 px-4 font-bold text-white disabled:opacity-50" onClick={refresh}>{loading ? t('جارٍ قراءة الحسابات…', 'Reading accounts…') : t('تحديث التقارير من Shopify', 'Refresh reports from Shopify')}</button></div>
      <p role="status" className="text-sm">{t('حسابات متصلة:', 'Connected accounts:')} {active.length} · {t('التحديث عند الطلب؛ لا توجد مزامنة مجدولة بعد.', 'Refresh on demand; scheduled synchronization is not enabled yet.')}</p>
    </section>
    {combined.length ? <section className="rounded-2xl border border-teal-500/40 p-5"><h2 className="text-xl font-bold">{t('إجمالي حسابات Shopify المكتملة', 'Combined complete Shopify reports')}</h2><p className="my-2 text-sm">{t('تُجمع الحسابات المتصلة بعد نجاح قراءة جميع تقاريرها بالكامل للفترة نفسها، مع فصل العملات.', 'Connected accounts are combined only when all reports are complete for the same period. Currencies remain separate.')}</p><dl className="grid gap-4 sm:grid-cols-2">{combined.map(total => <div key={total.currency}><dt>{total.currency} · {t('قيمة الطلبات الحالية شاملة الضريبة', 'Current order value including tax')}</dt><dd className="mt-2 text-2xl font-bold">{new Intl.NumberFormat(english ? 'en' : 'ar-SA', { style: 'currency', currency: total.currency }).format(total.currentTotalMinor / 10 ** total.decimals)}</dd></div>)}</dl></section> : null}
    {!accounts.length ? <p className="rounded-2xl border border-dashed border-slate-500/40 p-6">{t('لم تُضف حسابات إلى هذه المنشأة. ابدأ بالربط من بطاقات المنصات أعلاه.', 'No accounts belong to this workspace yet. Start with the provider cards above.')}</p> : accounts.map(account => {
      const result = results[account.id];
      return <section key={account.id} className="space-y-4 rounded-2xl border border-slate-500/30 p-5">
        <h2 className="text-xl font-bold">{account.displayName || (account.externalStoreId.startsWith('pending:') ? 'Foodics' : account.externalStoreId)}</h2><p dir="ltr" className="text-sm">{account.provider} · {account.externalStoreId.startsWith('pending:') ? t('بانتظار التفويض', 'Awaiting authorization') : account.externalStoreId}</p>
        <p>{account.status === 'active' ? t('التفويض متصل', 'Authorization connected') : account.status === 'authorizing' ? t('جارٍ التحقق من التفويض؛ التقارير غير متاحة بعد.', 'Authorization verification in progress; reports are not available yet.') : account.status === 'authorization_review_required' ? t('تعثر التفويض ويحتاج مراجعة الدعم قبل إعادة المحاولة. لم يُفعّل الوصول إلى التقارير.', 'Authorization requires support review before retrying. Report access was not enabled.') : account.status === 'revocation_pending' ? t('القراءة متوقفة؛ إلغاء التفويض قيد الإكمال', 'Reads stopped; revocation pending') : t('يحتاج إكمال الربط', 'Connection required')}</p>
        {['draft', 'disconnected'].includes(account.status) ? <form action={connectRetailAccount}><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="provider" value={account.provider}/><input type="hidden" name="integrationId" value={account.id}/><input type="hidden" name="shop" value={account.provider === 'shopify' ? account.externalStoreId : ''}/><ConnectButton disabled={account.provider === 'shopify' ? !configured : !foodicsConfigured} label={t('إكمال ربط هذا الحساب', 'Complete this account connection')} pendingLabel={t('جارٍ فتح التفويض…', 'Opening authorization…')}/></form> : null}
        {account.status === 'active' || account.status === 'revocation_pending' ? <details className="rounded-xl border border-slate-500/30 p-3"><summary className="cursor-pointer">{t('فصل الحساب وإلغاء التفويض', 'Disconnect and revoke access')}</summary><p className="my-3 text-sm">{t('يوقف قراءة هذا الحساب في INFRO ويلغي وصول التطبيق لدى المزود. في Shopify يُزال تطبيق INFRO من هذا المتجر. قد تتأثر خدمات أخرى تستخدم الربط نفسه، ويمكن إعادة الربط لاحقًا.', 'Stops INFRO reads and revokes provider access. On Shopify, INFRO is uninstalled from this store. Other services sharing this connection may be affected. You can authorize again later.')}</p><form action={disconnectRetailAccountAction}><input type="hidden" name="businessId" value={businessId}/><input type="hidden" name="integrationId" value={account.id}/><label className="mb-3 flex gap-2"><input type="checkbox" name="confirm" value="yes" required/>{t('أؤكد فصل هذا الحساب', 'I confirm disconnection of this account')}</label><ConnectButton disabled={false} label={t('تأكيد الفصل', 'Confirm disconnect')} pendingLabel={t('جارٍ الفصل…', 'Disconnecting…')}/></form></details> : null}
        {result?.error ? <p role="alert" className="rounded-xl border border-amber-500 p-3">{result.error}</p> : null}
        {result?.report ? <>
          <p>{t('وقت القراءة:', 'Fetched:')} {new Date(result.report.fetchedAt).toLocaleString(english ? 'en-GB' : 'ar-SA', { timeZone: 'Asia/Riyadh' })}</p>
          {!result.report.complete ? <p role="alert" className="rounded-xl border border-amber-500 p-3">{t('تقرير جزئي: تجاوزت النتائج حد القراءة. الأرقام أدناه تخص الجزء المقروء فقط؛ ضيّق الفترة لإكمال التقرير.', 'Partial report: read limit exceeded. Figures below cover only fetched orders; narrow the period to complete the report.')}</p> : null}
          {!result.report.totals.length ? <p>{t('لا توجد طلبات متاحة ضمن هذه الفترة.', 'No accessible orders in this period.')}</p> : result.report.totals.map(total => <div key={total.currency}><h3 className="font-bold">{total.currency} · {t('الطلبات:', 'Orders:')} {total.orders} · {t('الملغاة:', 'Cancelled:')} {total.cancelled}</h3><dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
            [t('قيمة الطلبات الحالية شاملة الضريبة', 'Current order value including tax'), total.currentTotalMinor],
            [t('ضريبة الطلبات الحالية', 'Current order tax'), total.taxMinor],
            [t('الخصومات الحالية', 'Current discounts'), total.discountsMinor],
            [t('المبالغ المستردة لهذه الطلبات', 'Refunds for these orders'), total.refundedMinor],
            [t('صافي المدفوعات لهذه الطلبات', 'Net payments for these orders'), total.netPaymentsMinor],
          ].map(([label, amount]) => <div key={String(label)}><dt className="text-sm">{label}</dt><dd className="mt-2 text-lg font-bold">{new Intl.NumberFormat(english ? 'en' : 'ar-SA', { style: 'currency', currency: total.currency }).format(Number(amount) / 10 ** total.decimals)}</dd></div>)}</dl></div>)}
        </> : !result?.error ? <p className="text-sm">{account.provider === 'foodics' ? t('التحقق من الحساب متاح؛ قارئ تقارير Foodics لم يُفعّل بعد.', 'Account verification is supported; Foodics reporting is not enabled yet.') : t('لم يُقرأ التقرير بعد. اضغط تحديث التقارير.', 'Report not fetched yet. Select Refresh reports.')}</p> : null}
      </section>;
    })}
  </div>;
}
