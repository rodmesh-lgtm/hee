import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnedBusinessForRead } from "../../../lib/ownership";
import { getRequestLocale } from "../../../lib/i18n-server";
import { db } from "../../../lib/db";
import { sallaConfigured } from "../../../lib/commerce/salla-config";
import { hasActiveBusinessSubscription } from "../../../lib/subscription-entitlement";
import { connectSallaBookingStoreAction } from "../../../actions/working-hours";
import { SallaSubscriptionCheck } from "./subscription-check";

export default async function SallaConnectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const business = await getOwnedBusinessForRead();
  if (!business) redirect("/onboarding");
  const [locale, params, integration, subscriptionActive, sender] = await Promise.all([
    getRequestLocale(), searchParams,
    db.whatsAppCommerceIntegration.findFirst({ where: { businessId: business.id, provider: "salla" }, orderBy: { updatedAt: "desc" }, select: { id: true, displayName: true, status: true, connectedAt: true, lastWebhookAt: true } }),
    hasActiveBusinessSubscription({ businessId: business.id }),
    db.whatsAppConnection.findFirst({ where: { businessId: business.id, provider: "meta", status: "connected", disabledAt: null }, select: { id: true } }),
  ]);
  const english = locale === "en";
  const t = (ar: string, en: string) => english ? en : ar;
  const connected = integration?.status === "active";
  const result = typeof params.salla === "string" ? params.salla : "";
  const messages: Record<string, [string, string]> = {
    connected: ["تم ربط المتجر بأمان. تابع إعداد الرقم والقوالب قبل تشغيل الرسائل.", "Your store is securely connected. Set up your number and templates before enabling messages."],
    cancelled: ["أُلغي التفويض داخل سلة. يمكنك بدء الربط مجددًا.", "Salla authorization was canceled. You can start again."],
    "session-expired": ["انتهت جلسة الربط. ابدأ من زر الربط في هذه الصفحة وأكمل الخطوات خلال عشر دقائق.", "The connection session expired. Start here and complete the steps within ten minutes."],
    "store-assigned": ["هذا المتجر مرتبط بمنشأة أخرى في INFRO. راجع مالكها أو الدعم قبل نقله.", "This store belongs to another INFRO business. Contact its owner or support before moving it."],
    "store-mismatch": ["المتجر الذي تم تفويضه لا يطابق الربط الحالي. اختر المتجر الصحيح أو راجع الدعم.", "The authorized store does not match this connection. Select the correct store or contact support."],
    "activation-failed": ["لم يكتمل الربط. أعد المحاولة من هذه الصفحة أو تواصل مع الدعم.", "Connection did not complete. Start here again or contact support."],
    forbidden: ["سجّل الدخول بحساب مالك المنشأة ثم ابدأ الربط مجددًا.", "Sign in as the business owner and start the connection again."],
    "invalid-callback": ["رابط العودة غير صالح. ابدأ الربط من هذه الصفحة.", "The return link is invalid. Start the connection from this page."],
  };
  const notice = messages[result];
  const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-800 px-5 py-3 text-sm font-bold text-white disabled:opacity-50";
  return <main dir={english ? "ltr" : "rtl"} className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <p className="text-sm font-bold text-teal-300">INFRO × SALLA</p>
      <h1 className="mt-3 text-2xl font-black">{t("ربط سلة وتشغيل واتساب", "Connect Salla and set up WhatsApp")}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">{t("اربط متجر المنشأة ثم جهّز رقم واتساب والقوالب والأتمتة من حسابك في INFRO. ربط المتجر متاح قبل الاشتراك؛ تشغيل الخدمات يخضع لصلاحيات باقتك.", "Connect your business store, then configure WhatsApp, templates and automations in INFRO. You can connect before subscribing; service access depends on your plan.")}</p>
      <p className="mt-3 font-bold">{business.name}</p>
    </header>
    {notice ? <p role="status" className={`rounded-2xl border p-4 text-sm leading-7 ${result === "connected" ? "border-teal-200 bg-teal-50 text-teal-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{english ? notice[1] : notice[0]}</p> : null}
    <div className="grid gap-4 md:grid-cols-3">
      {[
        [t("١. متجر سلة", "1. Salla store"), connected ? t("متصل", "Connected") : t("بانتظار الربط", "Not connected")],
        [t("٢. صلاحيات INFRO", "2. INFRO access"), subscriptionActive ? t("يوجد اشتراك فعّال", "Active subscription") : t("لم تُفعّل الخدمات المدفوعة", "Paid access not active")],
        [t("٣. رقم واتساب", "3. WhatsApp number"), sender ? t("يوجد رقم متصل", "A number is connected") : t("بانتظار ربط Meta", "Meta setup required")],
      ].map(([title, detail]) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold text-slate-900">{title}</h2><p className="mt-2 text-sm text-slate-600">{detail}</p></article>)}
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black">{t("المتجر والاشتراك", "Store and subscription")}</h2>
      {connected ? <><p className="mt-3 text-sm leading-7">{integration.displayName || t("متجر سلة", "Salla store")}</p><p className="mt-2 text-sm text-slate-500">{t("آخر تحديث للربط: ", "Last connection update: ")}{(integration.lastWebhookAt ?? integration.connectedAt)?.toLocaleString(english ? "en-GB" : "ar-SA", { timeZone: "Asia/Riyadh" }) ?? t("لم يصل تحديث بعد", "No update yet")}</p><SallaSubscriptionCheck integrationId={integration.id} english={english} /></> : <form action={connectSallaBookingStoreAction} className="mt-4 space-y-4"><p className="text-sm leading-7 text-slate-600">{t("سيتعرّف INFRO على المتجر الذي تسمح له داخل سلة. لا تحتاج إلى نسخ المفاتيح أو إدخال معرّف المتجر.", "INFRO identifies the store you authorize in Salla. You do not need to copy API keys or enter a store ID.")}</p><button disabled={!sallaConfigured()} className={buttonClass}>{t("ربط متجر سلة بأمان", "Securely connect Salla")}</button>{!sallaConfigured() ? <p role="status" className="text-sm text-amber-800">{t("الربط غير متاح حاليًا. تواصل مع الدعم.", "Connection is currently unavailable. Contact support.")}</p> : null}</form>}
      <p className="mt-4 text-sm leading-7 text-slate-600">{t("ربط المتجر لا ينشئ اشتراكًا مدفوعًا ولا يخصم مبلغًا. فحص اشتراك سلة للقراءة فقط؛ تفعيل باقات سلة تلقائيًا لم يُتح بعد. رسوم رسائل Meta يدفعها التاجر مباشرة، وهي منفصلة عن اشتراك INFRO.", "Connecting does not create a paid subscription or take payment. The Salla subscription check is read-only; automatic Salla plan activation is not available yet. Merchants pay Meta messaging fees directly, separately from INFRO subscriptions.")}</p>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-black">{t("أكمل تجهيز الرسائل", "Prepare your messages")}</h2>
      <ol className="mt-4 list-inside list-decimal space-y-3 text-sm leading-7 text-slate-600"><li>{t("اربط رقم المنشأة الرسمي من إعدادات واتساب.", "Connect your official business number in WhatsApp settings.")}</li><li>{t("زامن القوالب المعتمدة وحدد رسائل الطلبات والسلات المتروكة. لا تُرسل حملات إلا لجهات وافقت على استقبالها.", "Sync approved templates and configure order and abandoned-cart messages. Only send campaigns to opted-in contacts.")}</li><li>{t("اختبر بجهة اتصال مخصصة ثم راجع نتيجة التسليم قبل تشغيل الأتمتة.", "Test with a dedicated contact and check delivery before enabling automations.")}</li></ol>
      <div className="mt-5 flex flex-wrap gap-3"><Link className={buttonClass} href="/dashboard/whatsapp/setup">{t("إعداد رقم واتساب", "WhatsApp setup")}</Link><Link className="inline-flex min-h-11 items-center px-4 font-bold text-teal-800 underline" href={english ? "/integrations/salla?lang=en" : "/integrations/salla"}>{t("دليل التشغيل", "Setup guide")}</Link><Link className="inline-flex min-h-11 items-center px-4 font-bold text-teal-800 underline" href="/dashboard/working-hours">{t("إعدادات المزامنة والحجز والفصل", "Sync, booking and disconnect settings")}</Link><Link className="inline-flex min-h-11 items-center px-4 font-bold text-teal-800 underline" href="/dashboard/support">{t("الدعم", "Support")}</Link></div>
      <p className="mt-4 text-sm leading-7 text-slate-500">{t("إذا كانت المواعيد ضمن باقتك: ربط متجر نشط يفعّل شرط وجود طلب مدفوع ومؤكد لقبول حجز العميل. يمكنك مراجعة هذا الشرط وإدارة الفصل من إعدادات الحجز.", "If your plan includes appointments: connecting an active store requires customers to have a paid, confirmed order before booking. Review this condition and manage disconnection in booking settings.")}</p>
    </section>
  </main>;
}
