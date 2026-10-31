import Link from "next/link";
import { redirect } from "next/navigation";
import { getOwnedBusinessForRead } from "../../../lib/ownership";
import { getRequestLocale } from "../../../lib/i18n-server";
import { db } from "../../../lib/db";
import { sallaConfigured } from "../../../lib/commerce/salla-config";
import { hasActiveBusinessSubscription } from "../../../lib/subscription-entitlement";
import { connectSallaBookingStoreAction } from "../../../actions/working-hours";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { SallaBookingCheck } from "./booking-check";
import { SallaSubscriptionCheck } from "./subscription-check";

export default async function SallaConnectionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWhatsAppReadContext("connection.manage");
  if (!context) redirect("/dashboard");
  const business = await getOwnedBusinessForRead();
  if (!business || business.id !== context.businessId) redirect("/onboarding");
  const [locale, params, integration, subscriptionActive, sender] = await Promise.all([
    getRequestLocale(), searchParams,
    db.whatsAppCommerceIntegration.findFirst({ where: { businessId: business.id, provider: "salla" }, orderBy: { updatedAt: "desc" }, select: { id: true, displayName: true, status: true, connectedAt: true, lastWebhookAt: true } }),
    hasActiveBusinessSubscription({ businessId: business.id }),
    db.whatsAppConnection.findFirst({ where: { businessId: business.id, provider: "meta", status: "connected", disabledAt: null }, select: { id: true, marketingEnabled: true, bookingEnabled: true } }),
  ]);
  const english = locale === "en";
  const t = (ar: string, en: string) => english ? en : ar;
  const connected = integration?.status === "active";
  const approvedTemplates = sender ? await db.whatsAppTemplate.count({ where: { businessId: business.id, connectionId: sender.id, status: "approved", connection: { businessId: business.id, status: "connected", disabledAt: null } } }) : 0;
  const steps = [
    { title: t("اربط متجر سلة", "Connect Salla"), detail: connected ? t("المتجر متصل بهذه المنشأة.", "Store connected to this business.") : t("اختر متجرك وامنح التفويض من سلة.", "Select your store and authorize it in Salla."), done: connected, href: "#store", action: t("إعداد المتجر", "Set up store") },
    { title: t("تحقق من صلاحيات الخدمة", "Check service access"), detail: subscriptionActive ? t("صلاحيات الخدمة فعالة. هذا لا يثبت شراء باقة من سلة.", "Service access is active. This is not proof of a Salla purchase.") : t("راجع اشتراكك قبل تشغيل الخدمات.", "Review your subscription before running services."), done: subscriptionActive, href: "/dashboard/settings", action: t("مراجعة الاشتراك", "Review access") },
    { title: t("اربط رقم واتساب", "Connect WhatsApp"), detail: sender ? t("يوجد رقم مرتبط؛ راجع تسجيله للإرسال في الإعدادات.", "A number is linked; verify send registration in settings.") : t("استخدم رقم منشأتك الرسمي.", "Use your official business number."), done: Boolean(sender), href: "/dashboard/whatsapp/setup", action: t("إعداد الرقم", "Set up number") },
    { title: t("جهّز القوالب", "Prepare templates"), detail: approvedTemplates ? t(`${approvedTemplates} قالب معتمد. اختر القالب المتوافق لكل رسالة.`, `${approvedTemplates} approved templates. Choose a compatible template for each message.`) : t("زامن القوالب أو قدّم قالبًا وانتظر اعتماد Meta.", "Sync or submit templates and wait for Meta approval."), done: approvedTemplates > 0, href: "/dashboard/whatsapp/templates", action: t("مركز القوالب", "Template center") },
  ];
  const nextStep = steps.find(step => !step.done);
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
  return <main dir={english ? "ltr" : "rtl"} className="mx-auto max-w-5xl space-y-6 p-4 text-slate-900 sm:p-6 [[data-dashboard-theme=dark]_&]:text-slate-100 [&_section]:bg-white [[data-dashboard-theme=dark]_&_section]:bg-slate-900">
    <header className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
      <p className="text-sm font-bold text-teal-300">INFRO × SALLA</p>
      <h1 className="mt-3 text-2xl font-black">{t("ابدأ تشغيل متجرك مع INFRO", "Get your store running with INFRO")}</h1>
      <p className="mt-3 text-sm leading-7 text-slate-300">{t("اربط متجر المنشأة ثم جهّز رقم واتساب والقوالب والأتمتة من حسابك في INFRO. ربط المتجر متاح قبل الاشتراك؛ تشغيل الخدمات يخضع لصلاحيات باقتك.", "Connect your business store, then configure WhatsApp, templates and automations in INFRO. You can connect before subscribing; service access depends on your plan.")}</p>
      <p className="mt-3 font-bold">{business.name}</p>
    </header>
    {notice ? <p role="status" className={`rounded-2xl border p-4 text-sm leading-7 ${result === "connected" ? "border-teal-200 bg-teal-50 text-teal-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{english ? notice[1] : notice[0]}</p> : null}
    <section className="rounded-2xl border border-teal-600/40 p-6">
      <p className="text-sm font-bold text-teal-700 [[data-dashboard-theme=dark]_&]:text-teal-300">{t("خطوتك التالية", "Your next step")}</p>
      <h2 className="mt-2 text-xl font-black">{nextStep?.title ?? t("جرّب الخدمة قبل تشغيلها للعملاء", "Test before going live")}</h2>
      <p className="mt-2 text-sm leading-7">{nextStep?.detail ?? t("اكتمال الإعدادات لا يثبت وصول الرسائل. اختبر طلبًا وراجع التسليم في التقارير.", "Completed settings do not prove delivery. Test an order and inspect delivery reports.")}</p>
      <Link href={nextStep?.href ?? "#test-service"} className={`${buttonClass} mt-4`}>{nextStep?.action ?? t("ابدأ الاختبار", "Start testing")}</Link>
    </section>
    <ol aria-label={t("خطوات تشغيل سلة", "Salla setup steps")} className="grid gap-3 sm:grid-cols-2">
      {steps.map((step, index) => <li key={step.title} className="rounded-2xl border border-slate-400/30 p-5">
        <div className="flex items-center justify-between gap-2"><span className="text-sm opacity-70">{index + 1} / 4</span><span className="text-sm font-bold">{step.done ? t("تم الإعداد", "Configured") : t("يحتاج إجراء", "Action needed")}</span></div>
        <h2 className="mt-3 font-bold">{step.title}</h2><p className="mt-2 text-sm leading-7 opacity-80">{step.detail}</p><Link href={step.href} className="mt-3 inline-flex min-h-11 items-center font-bold underline">{step.action}</Link>
      </li>)}
    </ol>
    <section id="store" className="rounded-2xl border border-slate-400/30 p-6">
      <h2 className="text-lg font-black">{t("المتجر والاشتراك", "Store and subscription")}</h2>
      {connected ? <><p className="mt-3 text-sm leading-7">{integration.displayName || t("متجر سلة", "Salla store")}</p><p className="mt-2 text-sm text-slate-500 [[data-dashboard-theme=dark]_&]:text-slate-400">{t("آخر تحديث للربط: ", "Last connection update: ")}{(integration.lastWebhookAt ?? integration.connectedAt)?.toLocaleString(english ? "en-GB" : "ar-SA", { timeZone: "Asia/Riyadh" }) ?? t("لم يصل تحديث بعد", "No update yet")}</p><SallaSubscriptionCheck integrationId={integration.id} english={english} /></> : <form action={connectSallaBookingStoreAction} className="mt-4 space-y-4"><p className="text-sm leading-7 text-slate-600 [[data-dashboard-theme=dark]_&]:text-slate-300">{t("سيتعرّف INFRO على المتجر الذي تسمح له داخل سلة. لا تحتاج إلى نسخ المفاتيح أو إدخال معرّف المتجر.", "INFRO identifies the store you authorize in Salla. You do not need to copy API keys or enter a store ID.")}</p><button disabled={!sallaConfigured()} className={buttonClass}>{t("ربط متجر سلة بأمان", "Securely connect Salla")}</button>{!sallaConfigured() ? <p role="status" className="text-sm text-amber-800">{t("الربط غير متاح حاليًا. تواصل مع الدعم.", "Connection is currently unavailable. Contact support.")}</p> : null}</form>}
      <p className="mt-4 text-sm leading-7 text-slate-600 [[data-dashboard-theme=dark]_&]:text-slate-300">{t("ربط المتجر لا ينشئ اشتراكًا مدفوعًا ولا يخصم مبلغًا. فحص اشتراك سلة للقراءة فقط؛ تفعيل باقات سلة تلقائيًا لم يُتح بعد. رسوم رسائل Meta يدفعها التاجر مباشرة، وهي منفصلة عن اشتراك INFRO.", "Connecting does not create a paid subscription or take payment. The Salla subscription check is read-only; automatic Salla plan activation is not available yet. Merchants pay Meta messaging fees directly, separately from INFRO subscriptions.")}</p>
    </section>
    <section id="test-service" className="rounded-2xl border border-slate-400/30 p-6">
      <h2 className="text-xl font-black">{t("اختر الخدمة التي تريد تجربتها", "Choose a service to test")}</h2>
      <p className="mt-2 text-sm leading-7 opacity-80">{t("لا تحتاج إلى تفعيل كل الخدمات. ابدأ بخدمة واحدة وأكمل اختبارها أولًا.", "You do not need every service. Start with one and complete its test first.")}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {[
          { title: t("رسائل الطلبات والسلات", "Order and cart messages"), body: t("اختر السيناريو والقالب. أنشئ طلبًا تجريبيًا ثم راجع قبول الرسالة وتسليمها.", "Choose a scenario and template. Create a test order, then review acceptance and delivery."), href: "/dashboard/whatsapp/automations" },
          { title: t("حملات واتساب", "WhatsApp campaigns"), body: t("جهّز قالبًا تسويقيًا وجهة اتصال وافقت على التجربة. راجع المعاينة قبل الإرسال.", "Prepare a marketing template and a consenting test contact. Review before sending."), href: "/dashboard/whatsapp/campaigns" },
          { title: t("المواعيد والتذكيرات", "Appointments and reminders"), body: t("اضبط الخدمة والساعات، وافحص أهلية جوال الطلب أدناه قبل تجربة حجز الموعد.", "Set services and hours, then check the order phone below before testing a booking."), href: "/dashboard/working-hours" },
        ].map(item => <article key={item.href} className="rounded-xl border border-slate-400/30 p-4"><h3 className="font-bold">{item.title}</h3><p className="mt-2 text-sm leading-7 opacity-80">{item.body}</p><Link href={item.href} className="mt-3 inline-flex min-h-11 items-center font-bold underline">{t("إعداد وتجربة", "Configure and test")}</Link></article>)}
      </div>
      <div className="mt-4 flex flex-wrap gap-4"><Link className="inline-flex min-h-11 items-center font-bold underline" href="/dashboard/whatsapp/messages">{t("متابعة نتائج الرسائل", "Message results")}</Link><Link className="inline-flex min-h-11 items-center font-bold underline" href="/dashboard/appointments">{t("متابعة الحجوزات", "View bookings")}</Link></div>
    </section>
    <SallaBookingCheck english={english} />
    <footer className="flex flex-wrap gap-4 text-sm"><Link className="min-h-11 underline" href="/integrations/salla">{t("دليل سلة", "Salla guide")}</Link><Link className="min-h-11 underline" href="/dashboard/support">{t("الحصول على مساعدة", "Get help")}</Link></footer>
  </main>;
}
