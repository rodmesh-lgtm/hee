import { getRequestLocale } from "../lib/i18n-server";
import { uiText } from "../lib/ui-i18n";
import { UiText, UiAttributes } from "../../components/i18n/locale-provider";
import { commercialAccess } from "../lib/commercial-access";
import { invoiceContactPhone } from "../lib/invoice-contact";
import Link from "next/link";
import type { Metadata } from "next";
import { getCurrentUser } from "../lib/auth";
import { getDashboardBusinessForUser } from "../lib/active-business";
import { cashierActivityProfile } from "../lib/cashier-activity";
import { accountingActivity, allowedAccountingViews } from "../lib/accounting-program";
import { AccountingWorkspacePage } from "../Laundromat/server-workspace";
import { LaundryProfessionalWorkspace } from "../Laundromat/professional-workspace";
import { LaundryDeliveryWorkspace } from "../Laundromat/Delivery/workspace";
import "../Laundromat/laundry.css";

export const dynamic = "force-dynamic";
export async function generateMetadata():Promise<Metadata>{const locale=await getRequestLocale();return {title:{absolute:`INFRO · ${uiText(locale,"البرنامج المحاسبي")}`},robots:{index:false,follow:false,noarchive:true}};}
export default async function AccountingProgram({ searchParams }: { searchParams: Promise<{ view?: string; q?: string; filter?: string }> }) {
  const user = await getCurrentUser();
  const business = user ? await getDashboardBusinessForUser(user.id, true) : null;
  if (!user || !business) return <UiAttributes direction><main className="laundry-gate" dir="rtl"><h1><UiText>{"البرنامج المحاسبي"}</UiText></h1><p><UiText>{"سجّل الدخول واختر منشأتك للوصول إلى حساباتها."}</UiText></p><Link href={user ? "/dashboard" : "/login"}><UiText>{user ? "اختيار المنشأة" : "تسجيل الدخول"}</UiText></Link></main></UiAttributes>;
  if(!(await commercialAccess(business.id)).cashier)return <UiAttributes direction><main className="laundry-gate" dir="rtl"><h1><UiText>{"الكاشير والبرنامج المحاسبي"}</UiText></h1><p><UiText>{"هذه الخدمات ضمن باقات التشغيل والنمو والشاملة. الهوية مجانية دون مواعيد أو كاشير."}</UiText></p><Link href="/dashboard/plans"><UiText>{"مقارنة الباقات والترقية"}</UiText></Link></main></UiAttributes>;
  const owner = business.ownerId === user.id;
  const views = allowedAccountingViews(owner, business.members[0]?.permissions);
  if (!views.length) return <UiAttributes direction><main className="laundry-gate" dir="rtl"><h1><UiText>{"تحتاج صلاحية البرنامج المحاسبي"}</UiText></h1><p><UiText>{"يحدد مالك المنشأة مهامك من الموظفين والصلاحيات."}</UiText></p><Link href="/dashboard"><UiText>{"لوحة التحكم"}</UiText></Link></main></UiAttributes>;
  const params = await searchParams;
  const view = params.view ? views.find(item => item.id === params.view) : views[0];
  if (!view) return <UiAttributes direction><main className="laundry-gate" dir="rtl"><h1><UiText>{"هذه المهمة غير متاحة لحسابك"}</UiText></h1><Link href="/Accounting"><UiText>{"العودة إلى البرنامج المحاسبي"}</UiText></Link></main></UiAttributes>;
  const activity = accountingActivity(business);
  const profile = cashierActivityProfile(business);
  const activityLabel = profile.label;
  const navigation = owner ? views.filter(item => item.id === "cashier" || item.id === "delivery" || item.id === view.id) : views;
  return <>
    <UiAttributes direction><section className="accounting-program-bar" dir="rtl" aria-label="البرنامج المحاسبي">
      <div><strong><UiText>{"البرنامج المحاسبي"}</UiText></strong><span>{business.name} · {activityLabel}</span></div>
      <UiAttributes><nav aria-label="مهام البرنامج المحاسبي">{navigation.map(item => <Link key={item.id} href={`/Accounting?view=${item.id}`} aria-current={view.id === item.id ? "page" : undefined}><UiText>{owner && item.id === "cashier" ? "مساحة العمل" : item.label}</UiText></Link>)}</nav></UiAttributes>
    </section></UiAttributes>
    {view.id === "cashier" ? <AccountingWorkspacePage searchParams={Promise.resolve(params)} activity={activity} expectedBusinessId={business.id} basePath="/Accounting" />
      : view.id === "delivery" ? <LaundryDeliveryWorkspace program key={`${business.id}:${profile.id}`} business={{ id: business.id, name: business.name }} owner={owner} />
      : <LaundryProfessionalWorkspace key={`${business.id}:${profile.id}:${view.id}`} mode={view.id} owner={owner} program business={{ id: business.id, name: business.name, logoUrl: business.logoUrl,phone:invoiceContactPhone(business.pageModules,business.businessType),address:business.address??"" }} />}
  </>;
}
