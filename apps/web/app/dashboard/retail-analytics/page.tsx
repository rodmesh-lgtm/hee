import { Infro360Plan } from "../../../components/infro-360-plan";
import { commercialAccess } from "../../lib/commercial-access";
import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { getActiveBusinessForUser } from '../../lib/active-business';
import { getRequestLocale } from '../../lib/i18n-server';
import Link from 'next/link';
import { db } from '../../lib/db';
import { retailOAuthReady } from '../../lib/retail-analytics/oauth';
import ConnectedRetailWorkspace from './connected-workspace';
import BranchWorkspace from './branch-workspace';
import AccountDirectory from './account-directory';
import RetailDemoWorkspace from './demo-workspace';

export const dynamic = 'force-dynamic';
export async function generateMetadata() {
  return { title: (await getRequestLocale()) === 'en' ? 'Business analytics hub | INFRO' : 'مركز تحليلات الأعمال | INFRO' };
}
export default async function RetailAnalyticsPage({ searchParams }: { searchParams: Promise<{ connection?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  // Financial report access requires explicit membership permission and a current paid seat.
  const business = await getActiveBusinessForUser(user.id, "businessAnalytics");
  if (!business) redirect('/dashboard');
  const isOwner = business.ownerId === user.id;
  const seats = isOwner ? await Promise.all([
    commercialAccess(business.id),
    db.businessMember.count({where:{businessId:business.id,status:"active"}}),
    db.oAuthState.count({where:{provider:"business-staff-invite",nonce:business.id,expiresAt:{gt:new Date()}}}),
  ]).then(([plan, members, pending])=>({limit:plan.staffLimit,used:members+1,pending})) : undefined;
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
    <header className="rounded-3xl border border-teal-500/25 bg-teal-500/5 p-6"><p>{business.name}</p><h1 className="mt-2 text-3xl font-bold">{t('INFRO 360 · مركز أعمالك', 'INFRO 360 · Your business center')}</h1><p className="mt-3 leading-7">{t('لوحة واحدة لحسابات منشأتك عبر المنصات، لمختلف الأنشطة: المطاعم والضيافة والتجارة والخدمات. تتحدد التقارير المتاحة بحسب النظام المرتبط وصلاحياته.', 'One workspace for your business accounts across platforms, serving hospitality, restaurants, commerce and services. Available reports depend on the connected system and its permissions.')}</p></header>
    {status ? <p role="status" className="rounded-xl border p-4">{status === 'connected' || status === 'already-connected' ? t('تم ربط الحساب. افتح لوحة المنصة لقراءة بياناته.', 'Account connected. Open the platform dashboard to read its data.') : t('راجع حالة الربط داخل لوحة المنصة.', 'Review connection status in the platform dashboard.')}</p> : null}
    {accounts.length === 0 ? <RetailDemoWorkspace english={english}/> : <details className="rounded-2xl border border-teal-500/30 p-5"><summary className="cursor-pointer font-bold">{t('استكشف العرض التجريبي المستقل', 'Explore the standalone demo')}</summary><div className="mt-4"><RetailDemoWorkspace english={english}/></div></details>}
    <details className="rounded-2xl border border-teal-500/30 p-5"><summary className="cursor-pointer font-bold">{t("اشتراك INFRO 360 وإضافة مستخدمين", "INFRO 360 subscription and additional users")}</summary><div className="mt-4"><Infro360Plan workspace canManage={isOwner} seats={seats}/></div></details>
    <nav aria-label={t('مركز عمل INFRO 360','INFRO 360 work center')} className="flex flex-wrap gap-3">{[['#unified-reports-title',t('الحسابات والمقارنات','Accounts and comparisons')],['#infro-branches',t('فروع INFRO','INFRO branches')],['#provider-connections',t('إدارة المنصات','Manage platforms')]].map(([href,label])=><a key={href} href={href} className="min-h-11 rounded-xl border border-teal-500/30 px-5 py-3 font-bold">{label}</a>)}</nav>
    {accounts.length > 0 ? <AccountDirectory accounts={accounts} english={english}/> : null}
    <details open={accounts.length === 0} className="rounded-2xl border border-slate-500/20 p-5">
      <summary className="cursor-pointer text-xl font-bold">{t('دليل البدء: من الربط إلى التقرير', 'Getting started: from connection to report')}</summary>
      <ol className="mt-4 grid gap-4 md:grid-cols-3">
        <li><strong>{t('1. اختر منصتك', '1. Choose your platform')}</strong><p className="mt-2 text-sm leading-6">{t('افتح بطاقة المنصة أدناه وراجع حالة إتاحة الربط.', 'Open a platform card below and review connection availability.')}</p></li>
        <li><strong>{t('2. اربط حسابات المنشأة', '2. Connect business accounts')}</strong><p className="mt-2 text-sm leading-6">{t('سجّل الدخول لدى المزود وامنح صلاحيات القراءة لكل حساب ترغب بإضافته.', 'Sign in with the provider and authorize read access for each account you want to add.')}</p></li>
        <li><strong>{t('3. تابع التقارير', '3. Review reports')}</strong><p className="mt-2 text-sm leading-6">{t('اختر الحساب والفترة، وراجع وقت آخر قراءة. الربط وحده لا يعني توفر كل أنواع التقارير.', 'Choose the account and period, and check the last read time. A connection does not guarantee every report type.')}</p></li>
      </ol>
      {reportingAccounts.length ? <a href="#unified-reports-title" className="mt-4 inline-block rounded-xl bg-teal-600 px-4 py-3 font-bold text-white">{t('انتقل إلى تقارير حساباتي', 'Go to my account reports')}</a> : null}
    </details>
    <section id="provider-connections" aria-label={t('ربط المنصات', 'Platform connections')} className="grid gap-5 lg:grid-cols-3">{providers.map(provider => {
      const own = accounts.filter(a => a.provider === provider.id);
      return <Link key={provider.id} href={`/dashboard/retail-analytics/${provider.id}`} className="flex flex-col gap-5 rounded-3xl border border-teal-500/30 p-6 transition hover:bg-teal-500/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600">
        <h2 className="text-2xl font-bold">{provider.name}</h2><p className="min-h-20 leading-7">{provider.description}</p>
        <p>{t('الحسابات المرتبطة', 'Connected accounts')}: <strong>{own.filter(a => a.status === 'active').length}</strong></p>
        <p className="text-sm">{provider.ready ? t('الربط متاح', 'Connection available') : t('بانتظار استكمال متطلبات المزود', 'Awaiting provider requirements')}</p>
        <span className="mt-auto rounded-xl bg-teal-600 px-4 py-3 text-center font-bold text-white">{provider.id === 'shopify' && provider.ready ? t('الحسابات والتقارير', 'Accounts and reports') : t('حالة الربط والمتطلبات', 'Connection status and requirements')} {provider.name}</span>
      </Link>;
    })}</section>
    <section aria-labelledby="unified-reports-title" className="space-y-5">
      <header className="rounded-2xl border border-teal-500/25 p-5">
        <h2 id="unified-reports-title" className="text-2xl font-bold">{t('تقارير حساباتك في مكان واحد', 'Your account reports in one place')}</h2>
        <p className="mt-3 leading-7">{t('اختر الفترة والحساب لمتابعة المبيعات والمخزون دون مغادرة INFRO. عند اكتمال قراءة عدة متاجر، يظهر ملخصها المجمع مع فصل العملات، ثم تفاصيل كل متجر.', 'Choose a period and account to review sales and inventory without leaving INFRO. Complete multi-store reads include a combined summary with separate currencies, followed by individual stores.')}</p>
        <p className="mt-3 text-sm font-semibold">{t('نطاق التقارير الحالي: Shopify', 'Current reporting coverage: Shopify')} · {reportingAccounts.length} {t('حساب متصل', 'connected accounts')}</p>
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm leading-7">{t('Foodics وICG بانتظار استكمال التكامل الرسمي. لا تدخل بياناتهما في الإجماليات المعروضة، ولا تُعامل كأن مبيعاتهما صفر.', 'Foodics and ICG await completion of their official integrations. Their data is not included in displayed totals and is not treated as zero sales.')}</p>
      </header>
      {shopifyAccounts.length ? <ConnectedRetailWorkspace canManage={business.ownerId === user.id} key={`${business.id}:hub`} embedded provider="shopify" businessId={business.id} businessName={business.name} english={english} accounts={shopifyAccounts} configured={retailOAuthReady('shopify')} foodicsConfigured={retailOAuthReady('foodics')} connectionStatus="" today={today}/> : <div className="rounded-2xl border border-dashed border-teal-500/30 p-6"><h3 className="text-xl font-bold">{t('ابدأ بربط أول حساب', 'Connect your first account')}</h3><p className="my-3 leading-7">{t('اربط متجر Shopify من بطاقته أعلاه، وستظهر تقاريره هنا تلقائيًا. يمكنك إضافة أكثر من متجر للمنشأة نفسها.', 'Connect a Shopify store using its card above. Its reports will appear here automatically, and you can add multiple stores to the same business.')}</p><Link href="/dashboard/retail-analytics/shopify" className="inline-block rounded-xl bg-teal-600 px-4 py-3 font-bold text-white">{t('ربط متجر Shopify', 'Connect Shopify store')}</Link></div>}
    </section>
    <div id="infro-branches"><BranchWorkspace key={business.id} businessId={business.id} today={today} english={english}/></div>
  </div>;
}
