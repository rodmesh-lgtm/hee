import { getRequestLocale } from "../../lib/i18n-server";
import { LOCALE_META } from "../../lib/i18n";
import { uiText } from "../../lib/ui-i18n";
import { db } from "../../lib/db";
import { ensureCommercialCatalog } from "../../lib/commercial-catalog";
import { commercialUsageSummary } from "../../lib/commercial-usage";
import Link from "next/link";
import {isAdminEmail} from "../../lib/admin";
import { redirect } from "next/navigation";
import { COMMERCIAL_PLANS, PLAN_BILLING_NOTE } from "../../lib/commercial-plans";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../lib/active-business";
import { getPlanEntitlements,isCommercialUpgrade } from "../../lib/plan-entitlements";
import { paidCheckoutEntryAllowed } from "../../lib/billing";
import { startPaidCheckoutAction } from "../../actions/billing";
export const dynamic="force-dynamic";
export default async function PlansPage(){
 const locale=await getRequestLocale(),{dir,intlLocale}=LOCALE_META[locale],tr=(text:string)=>uiText(locale,text);

 const user=await getCurrentUser();if(!user)redirect("/login");
 const business=await getActiveBusinessWithPlanForUser(user.id);if(!business)redirect("/onboarding");
 await db.$transaction(tx=>ensureCommercialCatalog(tx));
 const usage=await commercialUsageSummary(business.id);
 const current=getPlanEntitlements(business.plan?.code),ready=paidCheckoutEntryAllowed(user.email);
 return <main dir={dir} className="space-y-6"><header><p className="text-sm font-bold text-teal-700">{tr("باقات INFRO")}</p><h1 className="mt-2 text-3xl font-black">{tr("هوية مجانية، وخدمات تتوسع مع نشاطك")}</h1><p className="mt-3 text-sm leading-7">{tr("باقتك الحالية:")}{" "}<strong>{tr(current.label)}</strong>{tr(". حساب المالك ضمن عدد المستخدمين. الاشتراكات السابقة تحتفظ بشروطها وأسعارها.")}</p></header><section aria-label={tr("استخدام الباقة هذا الشهر")} className="rounded-2xl border p-4 text-sm leading-8"><h2 className="font-bold">{tr("استخدام الشهر الحالي")}</h2><p>{tr("المستخدمون:")}{" "}{usage.staff} / {current.staffLimit??tr("وفق الاشتراك السابق")}{" "}{tr("· الفواتير:")}{" "}{usage.invoices} / {current.monthlyInvoices??tr("وفق الاشتراك السابق")}{" "}{tr("· الحجوزات الجديدة:")}{" "}{usage.bookings} / {current.monthlyBookings??tr("وفق الاشتراك السابق")}</p><p>{tr("معالجة القوالب:")}{" "}{usage.templates} / {current.monthlyTemplates??tr("وفق الاشتراك السابق")}{" "}{tr("· نقل المشاهدة:")}{" "}{(usage.liveKB*1024/1e9).toFixed(2)} GB / {current.liveTransferKB===null?tr("وفق الاشتراك السابق"):(current.liveTransferKB*1024/1e9).toFixed(0)+" GB"}</p>{current.monthlyMarketingTemplates!==undefined?<p>{tr("الحملات والأتمتة:")}{" "}{usage.marketing.toLocaleString(intlLocale)} / {current.monthlyMarketingTemplates.toLocaleString(intlLocale)}{" "}{tr("· إشعارات التشغيل:")}{" "}{usage.operational.toLocaleString(intlLocale)} / {current.monthlyOperationalTemplates?.toLocaleString(intlLocale)}</p>:null}</section><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{COMMERCIAL_PLANS.map(plan=><article key={plan.code} className={`flex flex-col rounded-3xl border p-5 ${plan.featured?"border-teal-500 bg-teal-50 text-slate-950":"border-slate-200 bg-white text-slate-950"}`}><h2 className="text-xl font-black">{tr(plan.name)}</h2><p className="my-4 text-3xl font-black">{plan.monthlyPrice||tr("مجانية")}{plan.monthlyPrice?<small className="text-sm">{" "}{tr("ر.س / شهر")}</small>:null}</p><p className="mb-4 text-sm leading-6">{tr(plan.description)}</p><ul className="mb-5 space-y-3 text-sm leading-6">{plan.features.map(feature=><li key={feature}>✓ {tr(feature)}</li>)}</ul><div className="mt-auto">{current.code===plan.code?<p className="rounded-xl bg-slate-100 p-3 text-center font-bold">{tr("باقتك الحالية")}</p>:plan.code==="FREE"?<Link href="/dashboard/billing/manage" className="block rounded-xl border p-3 text-center text-sm">{tr("إدارة الاشتراك الحالي")}</Link>:!isCommercialUpgrade(current.code,plan.code,business.plan?.monthlyPrice??0)?<p className="text-sm">{tr("لتغيير الباقة راجع إدارة الاشتراك؛ لا يتغير اشتراكك تلقائيًا.")}</p>:<form action={startPaidCheckoutAction}><input type="hidden" name="plan" value={plan.code}/><button disabled={!ready} className="w-full rounded-xl bg-teal-700 p-3 font-bold text-white disabled:opacity-50">{ready?tr("اختيار الباقة ومراجعة الدفع"):tr("الدفع غير متاح حاليًا")}</button></form>}</div></article>)}</div><p className="rounded-2xl border p-4 text-sm leading-7">{tr(PLAN_BILLING_NOTE)}</p><Link href="/services" className="inline-flex min-h-12 items-center rounded-xl border px-4 font-bold">{tr("تفاصيل المحاسبة وواتساب والبث وشروطها")}</Link>{isAdminEmail(user.email)?<Link href="/dashboard/billing/setup" className="inline-block rounded-xl border px-4 py-3 text-sm font-bold">{tr("تجهيز بوابة الدفع — إدارة INFRO")}</Link>:null}<Link href="/dashboard/plans/services" className="inline-block rounded-xl bg-teal-700 px-4 py-3 font-bold text-white">{tr("أريد خدمة منفصلة")}</Link><Link href="/dashboard/billing/manage" className="inline-block font-bold text-teal-700 underline">{tr("سجل الفوترة وإدارة التجديد")}</Link></main>;
}
