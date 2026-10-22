import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "../lib/auth";
import { getDashboardBusinessForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { accountingActivity, allowedAccountingViews } from "../lib/accounting-program";
import { AccountingWorkspacePage } from "../Laundromat/server-workspace";
import { LaundryProfessionalWorkspace } from "../Laundromat/professional-workspace";
import { LaundryDeliveryWorkspace } from "../Laundromat/Delivery/workspace";
import "../Laundromat/laundry.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "INFRO · البرنامج المحاسبي", robots: { index: false, follow: false, noarchive: true } };
export default async function AccountingProgram({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; filter?: string }> }) {
  const user = await getCurrentUser();
  const business = user ? await getDashboardBusinessForUser(user.id) : null;
  if (!user || !business) return <main className="laundry-gate" dir="rtl"><h1>البرنامج المحاسبي</h1><p>سجّل الدخول واختر منشأتك للوصول إلى حساباتها.</p><Link href={user ? "/dashboard" : "/login"}>{user ? "اختيار المنشأة" : "تسجيل الدخول"}</Link></main>;
  const owner = business.ownerId === user.id;
  const views = allowedAccountingViews(owner, business.members[0]?.permissions);
  if (!views.length) return <main className="laundry-gate" dir="rtl"><h1>تحتاج صلاحية البرنامج المحاسبي</h1><p>يحدد مالك المنشأة مهامك من الموظفين والصلاحيات.</p><Link href="/dashboard">لوحة التحكم</Link></main>;
  const params = await searchParams;
  const view = params.view ? views.find(item => item.id === params.view) : views[0];
  if (!view) return <main className="laundry-gate" dir="rtl"><h1>هذه المهمة غير متاحة لحسابك</h1><Link href="/Accounting">العودة إلى البرنامج المحاسبي</Link></main>;
  // Preserve an existing tenant catalogue without hardcoding a customer identity.
  const catalogue = await db.$queryRaw<Array<{ configured: boolean }>>`SELECT EXISTS (SELECT 1 FROM "LaundryService" WHERE "businessId"=${business.id} AND ("name" LIKE '% — غسيل وكوي' OR "name" LIKE '% — كوي' OR "name" LIKE '% — تنظيف جاف')) AS configured`;
  const activity = accountingActivity(business, catalogue[0]?.configured);
  const activityLabel = activity === "laundry" ? "مغسلة ملابس" : business.businessCategory || business.businessType || "خدمات ومنتجات";
  const navigation = owner ? views.filter(item => item.id === "cashier" || item.id === "delivery" || item.id === view.id) : views;
  return <>
    <section className="accounting-program-bar" dir="rtl" aria-label="البرنامج المحاسبي">
      <div><strong>البرنامج المحاسبي</strong><span>{business.name} · {activityLabel}</span></div>
      <nav aria-label="مهام البرنامج المحاسبي">{navigation.map(item => <Link key={item.id} href={`/Accounting?view=${item.id}`} aria-current={view.id === item.id ? "page" : undefined}>{owner && item.id === "cashier" ? "مساحة العمل" : item.label}</Link>)}</nav>
    </section>
    {view.id === "cashier" ? <AccountingWorkspacePage searchParams={Promise.resolve(params)} activity={activity} basePath="/Accounting" />
      : view.id === "delivery" ? <LaundryDeliveryWorkspace program key={business.id} business={{ id: business.id, name: business.name }} owner={owner} />
      : <LaundryProfessionalWorkspace key={`${business.id}:${view.id}`} mode={view.id} owner={owner} program business={{ id: business.id, name: business.name, logoUrl: business.logoUrl }} />}
  </>;
}
