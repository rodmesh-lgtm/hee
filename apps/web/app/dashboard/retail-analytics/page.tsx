import { redirect } from 'next/navigation';
import { getCurrentUser } from '../../lib/auth';
import { getActiveBusinessForUser } from '../../lib/active-business';
import { getRequestLocale } from '../../lib/i18n-server';
import Link from 'next/link';
import { db } from '../../lib/db';
import { retailOAuthReady } from '../../lib/retail-analytics/oauth';

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
  return <div dir={english ? 'ltr' : 'rtl'} className="space-y-6 pb-8">
    <header className="rounded-3xl border border-teal-500/25 bg-teal-500/5 p-6"><p>{business.name}</p><h1 className="mt-2 text-3xl font-bold">{t('مركز تحليلات التجزئة', 'Retail analytics hub')}</h1><p className="mt-3 leading-7">{t('اختر المنصة لفتح لوحتها الخاصة، ثم استعرض حساباتها وتقاريرها. بيانات كل منشأة معزولة عن المنشآت الأخرى.', 'Choose a platform to open its dashboard, accounts and reports. Each business has its own isolated workspace.')}</p></header>
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
  </div>;
}
