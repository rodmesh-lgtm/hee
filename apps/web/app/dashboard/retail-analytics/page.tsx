import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { getActiveBusinessForUser } from '../../lib/active-business';
import { getRequestLocale } from '../../lib/i18n-server';
import Link from 'next/link';
import { db } from '../../lib/db';
import { retailOAuthReady } from '../../lib/retail-analytics/oauth';
import ConnectedRetailWorkspace from './connected-workspace';

export const dynamic = 'force-dynamic';
export default async function RetailAnalyticsPage({ searchParams }: { searchParams: Promise<{ connection?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Financial reports are owner-only; visitor analytics permission is insufficient.
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect('/dashboard');
  const english = await getRequestLocale() === 'en';
  const accounts = await db.whatsAppCommerceIntegration.findMany({
    where: { businessId: business.id, provider: { in: ['shopify', 'foodics'] } },
    select: { provider: true, id: true, displayName: true, externalStoreId: true, status: true },
    orderBy: { createdAt: 'asc' },
  });
  const t = (ar: string, en: string) => english ? en : ar;
  const providers = [
    { id: 'shopify', name: 'Shopify', ready: retailOAuthReady('shopify'), description: t('المبيعات والمرتجعات والخصومات والمنتجات والمخزون.', 'Sales, refunds, discounts, products and inventory.') },
    { id: 'foodics', name: 'Foodics', ready: retailOAuthReady('foodics'), description: t('حسابات فودكس في لوحة مستقلة. التقارير تنتظر تفعيل الربط الرسمي.', 'A dedicated Foodics workspace. Reports await official integration activation.') },
    { id: 'icg', name: 'ICG Manager 2018', ready: false, description: t('لوحة مستقلة لحسابات ICG بعد استلام وثائق الربط المعتمدة.', 'A dedicated ICG workspace pending approved integration documentation.') },
  ];
  const status = (await searchParams).connection;
  const shopifyAccounts = accounts.filter(account => account.provider === 'shopify');
  const reportingAccounts = shopifyAccounts.filter(account => account.status === 'active');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  return <div dir={english ? 'ltr' : 'rtl'} className="space-y-6 pb-8">
    <header className="rounded-3xl border border-teal-500/25 bg-teal-500/5 p-6"><p>{business.name}</p><h1 className="mt-2 text-3xl font-bold">{t('مركز تحليلات التجزئة', 'Retail analytics hub')}</h1><p className="mt-3 leading-7">{t('تابع حسابات منشأتك من مكان واحد. استعرض التقارير المتاحة أدناه، أو افتح لوحة منصة محددة للتفاصيل وإدارة الربط.', 'Review your business accounts in one place. Read available reports below, or open a platform workspace for details and connection management.')}</p></header>
    {status ? <p role="status" className="rounded-xl border p-4">{status === 'connected' || status === 'already-connected' ? t('تم ربط الحساب. افتح لوحة المنصة لقراءة بياناته.', 'Account connected. Open the platform dashboard to read its data.') : t('راجع حالة الربط داخل لوحة المنصة.', 'Review connection status in the platform dashboard.')}</p> : null}
    <section className="grid gap-5 lg:grid-cols-3">{providers.map(provider => {
      const own = accounts.filter(a => a.provider === provider.id);
      return <Link key={provider.id} href={`/dashboard/retail-analytics/${provider.id}`} className="flex flex-col gap-5 rounded-3xl border border-teal-500/30 p-6 transition hover:bg-teal-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600">
        <h2 className="text-2xl font-bold">{provider.name}</h2><p className="min-h-20 leading-7">{provider.description}</p>
        <p>{t('الحسابات المرتبطة', 'Connected accounts')}: <strong>{own.filter(a => a.status === 'active').length}</strong></p>
        <p className="text-sm">{provider.ready ? t('الربط متاح', 'Connection available') : t('بانتظار استكمال متطلبات المزود', 'Awaiting provider requirements')}</p>
        <span className="mt-auto rounded-xl bg-teal-600 px-4 py-3 text-center font-bold text-white">{t('فتح لوحة', 'Open dashboard')} {provider.name}</span>
      </Link>;
    })}</section>
    <section aria-labelledby="unified-reports-title" className="space-y-5">
      <header className="rounded-2xl border border-teal-500/25 p-5">
        <h2 id="unified-reports-title" className="text-2xl font-bold">{t('تقارير حساباتك في مكان واحد', 'Your account reports in one place')}</h2>
        <p className="mt-3 leading-7">{t('اختر الفترة والحساب لمتابعة المبيعات والمخزون دون مغادرة INFRO. عند اكتمال قراءة عدة متاجر، يظهر ملخصها المجمع مع فصل العملات، ثم تفاصيل كل متجر.', 'Choose a period and account to review sales and inventory without leaving INFRO. Complete multi-store reads include a combined summary with separate currencies, followed by individual stores.')}</p>
        <p className="mt-3 text-sm font-semibold">{t('نطاق التقارير الحالي: Shopify', 'Current reporting coverage: Shopify')} · {reportingAccounts.length} {t('حساب متصل', 'connected accounts')}</p>
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-7">{t('Foodics وICG بانتظار استكمال التكامل الرسمي. لا تدخل بياناتهما في الإجماليات المعروضة، ولا تُعامل كأن مبيعاتهما صفر.', 'Foodics and ICG await completion of their official integrations. Their data is not included in displayed totals and is not treated as zero sales.')}</p>
      </header>
      {shopifyAccounts.length ? <ConnectedRetailWorkspace key={`${business.id}:hub`} embedded provider="shopify" businessId={business.id} businessName={business.name} english={english} accounts={shopifyAccounts} configured={retailOAuthReady('shopify')} foodicsConfigured={retailOAuthReady('foodics')} connectionStatus="" today={today}/> : <div className="rounded-2xl border border-dashed border-teal-500/30 p-6"><h3 className="text-xl font-bold">{t('ابدأ بربط أول حساب', 'Connect your first account')}</h3><p className="my-3 leading-7">{t('اربط متجر Shopify من بطاقته أعلاه، وستظهر تقاريره هنا تلقائيًا. يمكنك إضافة أكثر من متجر للمنشأة نفسها.', 'Connect a Shopify store using its card above. Its reports will appear here automatically, and you can add multiple stores to the same business.')}</p><Link href="/dashboard/retail-analytics/shopify" className="inline-block rounded-xl bg-teal-600 px-4 py-3 font-bold text-white">{t('ربط متجر Shopify', 'Connect Shopify store')}</Link></div>}
    </section>
  </div>;
}
