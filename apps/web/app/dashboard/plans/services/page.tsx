import { getRequestLocale } from "../../../lib/i18n-server";
import { LOCALE_META } from "../../../lib/i18n";
import { uiText } from "../../../lib/ui-i18n";
import Link from "next/link";
import {redirect} from "next/navigation";
import {getCurrentUser} from "../../../lib/auth";
import {getActiveBusinessWithPlanForUser} from "../../../lib/active-business";
import {STANDALONE_SERVICES,PLAN_BILLING_NOTE} from "../../../lib/commercial-plans";
import {isCommercialUpgrade} from "../../../lib/plan-entitlements";
import {paidCheckoutEntryAllowed} from "../../../lib/billing";
import {startPaidCheckoutAction} from "../../../actions/billing";
export const dynamic="force-dynamic";
export default async function Services(){
 const locale=await getRequestLocale(),{dir}=LOCALE_META[locale],tr=(text:string)=>uiText(locale,text);
const user=await getCurrentUser();if(!user)redirect("/login");const business=await getActiveBusinessWithPlanForUser(user.id);if(!business)redirect("/onboarding");const ready=paidCheckoutEntryAllowed(user.email);return <main dir={dir} className="space-y-6"><header><h1 className="text-3xl font-black">{tr("اشترك في الخدمة التي تحتاجها")}</h1><p className="mt-3 text-sm leading-7">{tr("الهوية الرقمية الأساسية مجانية مع كل خدمة. إذا احتجت أكثر من خدمة، اختر باقة جامعة؛ اشتراك الحساب لا يجمع رسوم خدمات منفصلة تلقائيًا.")}</p></header><div className="grid gap-4 md:grid-cols-2">{STANDALONE_SERVICES.map(service=><article key={service.code} className="flex flex-col gap-4 rounded-3xl border bg-white p-6 text-slate-950"><h2 className="text-xl font-black">{tr(service.name)}</h2><p className="text-3xl font-black text-teal-700">{service.monthlyPrice} <small className="text-sm">{tr("ر.س / شهر")}</small></p><p className="text-sm leading-7">{tr(service.description)}</p><ul className="space-y-2 text-sm leading-7">{service.features.map(feature=><li key={feature}>✓ {tr(feature)}</li>)}</ul>{business.plan?.code===service.code?<p className="font-bold">{tr("خدمتك الحالية")}</p>:!isCommercialUpgrade(business.plan?.code,service.code,business.plan?.monthlyPrice??0)?<Link href="/dashboard/billing/manage" className="mt-auto font-bold underline">{tr("إدارة اشتراكك الحالي قبل تغيير الخدمة")}</Link>:<form action={startPaidCheckoutAction} className="mt-auto"><input type="hidden" name="plan" value={service.code}/><button disabled={!ready} className="rounded-xl bg-teal-700 px-4 py-3 font-bold text-white disabled:opacity-50">{ready?tr("اختيار الخدمة ومراجعة الدفع"):tr("الدفع غير متاح حاليًا")}</button></form>}</article>)}</div><p className="rounded-2xl border p-4 text-sm leading-7">{tr(PLAN_BILLING_NOTE)}</p><Link href="/services" className="inline-flex min-h-12 items-center rounded-xl border px-4 font-bold">{tr("تفاصيل الميزات وشروط التشغيل")}</Link><Link href="/dashboard/plans" className="font-bold text-teal-700 underline">{tr("مقارنة الباقات الجامعة")}</Link></main>;}
