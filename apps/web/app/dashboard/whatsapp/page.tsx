import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  ContactRound,
  FileText,
  Gauge,
  Link2,
  MessageCircle,
  Megaphone,
  Radio,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Workflow,
  Zap,
} from "lucide-react";
import { db } from "../../lib/db";
import { getWhatsAppCampaignLaunchReadiness } from "../../lib/whatsapp/campaign-launch-readiness";
import { hasActiveWhatsAppMarketingEntitlement } from "../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../lib/whatsapp/rbac";

type SectionState = "ready" | "attention" | "empty";
type ReadinessStep = {
  title: string;
  description: string;
  href: string;
  ready: boolean;
  value: string;
};

const operationsLabels: Record<string, string> = {
  ready: "محرك الإرسال جاهز",
  worker_not_started: "محرك الإرسال لم يبدأ بعد",
  worker_failed: "محرك الإرسال يحتاج مراجعة",
  worker_stale: "آخر دورة تشغيل قديمة",
  database_clock_unavailable: "تعذر التحقق من ساعة التشغيل",
  web_release_unavailable: "تعذر إثبات إصدار الويب",
  worker_release_mismatch: "إصدار محرك الإرسال لا يطابق الويب",
};

export default async function WhatsAppMarketingPage() {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) {
    redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  }

  const [connection, contacts, templates, campaigns, automations, conversations, integrations, launchReadiness] = await Promise.all([
    db.whatsAppConnection.findFirst({
      where: { businessId: context.businessId, provider: "meta" },
      select: { status: true, disabledAt: true, displayPhoneNumber: true, verifiedName: true },
    }),
    db.whatsAppContact.count({ where: { businessId: context.businessId } }),
    db.whatsAppTemplate.count({ where: { businessId: context.businessId, provider: "meta", status: "approved" } }),
    db.whatsAppCampaign.count({ where: { businessId: context.businessId } }),
    db.whatsAppAutomation.count({ where: { businessId: context.businessId } }),
    db.whatsAppConversation.count({ where: { businessId: context.businessId } }),
    db.whatsAppCommerceIntegration.count({ where: { businessId: context.businessId } }),
    getWhatsAppCampaignLaunchReadiness(),
  ]);

  const connected = connection?.status === "connected" && !connection.disabledAt;
  const launchSteps: ReadinessStep[] = [
    {
      title: "ربط الرقم الرسمي",
      description: "اتصال Meta Cloud API الخاص بمنشأتك.",
      href: "/dashboard/whatsapp/setup",
      ready: connected,
      value: connected ? "متصل" : "مطلوب",
    },
    {
      title: "قالب معتمد",
      description: "قالب Meta صالح للإرسال خارج نافذة الخدمة.",
      href: "/dashboard/whatsapp/templates",
      ready: templates > 0,
      value: templates ? `${templates} معتمد` : "لا يوجد",
    },
    {
      title: "جمهور مؤهل",
      description: "جهات اتصال قابلة للتجهيز مع حدود الموافقة والانسحاب.",
      href: "/dashboard/whatsapp/contacts",
      ready: contacts > 0,
      value: contacts ? `${contacts} جهة` : "ابدأ الاستيراد",
    },
    {
      title: "جاهزية التشغيل",
      description: "محرك الإرسال يعمل حديثًا وعلى نفس إصدار الويب.",
      href: "/dashboard/whatsapp/campaigns",
      ready: launchReadiness.ready,
      value: operationsLabels[launchReadiness.code] ?? "غير جاهز",
    },
  ];
  const readyCount = launchSteps.filter((step) => step.ready).length;
  const launchReady = readyCount === launchSteps.length;
  const nextStep = launchSteps.find((step) => !step.ready);
  const primaryAction = nextStep ?? {
    title: "إنشاء حملة جديدة",
    description: "كل متطلبات الإطلاق الأساسية مكتملة.",
    href: "/dashboard/whatsapp/campaigns",
    ready: true,
    value: "جاهز",
  };

  const cards = [
    { href: "/dashboard/whatsapp/contacts", title: "جهات الاتصال والاستيراد", text: "استيراد CSV أو Excel حتى 10,000 صف مع توحيد الأرقام وإزالة التكرار وتوثيق الموافقة الصريحة.", icon:ContactRound, state: contacts ? "ready" : "empty", status: contacts ? `${contacts} جهة اتصال` : "ابدأ بالاستيراد" },
    { href: "/dashboard/whatsapp/templates", title: "قوالب Meta", text: "مزامنة القوالب الرسمية ومتابعة حالة الاعتماد قبل استخدامها في الإرسال.", icon:FileText, state: templates ? "ready" : connected ? "attention" : "empty", status: templates ? `${templates} قالب معتمد` : connected ? "تحتاج مزامنة" : "اربط الرقم أولًا" },
    { href: "/dashboard/whatsapp/campaigns", title: "الحملات الجماعية", text: "أنشئ حملة من جهات الاتصال المؤهلة، راجع الجمهور والقالب، ثم جدولة الإرسال أو تشغيله بأمان.", icon:Megaphone, state: connected && templates && contacts && launchReadiness.ready ? "ready" : "attention", status: connected && templates && contacts && launchReadiness.ready ? "جاهز للتجهيز" : "متطلبات ناقصة" },
    { href: "/dashboard/whatsapp/automations", title: "الأتمتة الذكية", text: "شغّل رسائل قالبية من أحداث موثوقة مع إعادة فحص الموافقة والانسحاب والاتصال قبل كل إرسال.", icon:Workflow, state: connected && templates ? "ready" : "attention", status: automations ? `${automations} أتمتة` : connected && templates ? "متاح للإنشاء" : "يتطلب ربطًا وقالبًا" },
    { href: "/dashboard/whatsapp/integrations", title: "تكاملات المتاجر", text: "اربط Shopify رسميًا لتحويل الطلبات والسلال إلى أحداث تستخدمها مسارات واتساب. سلة وزد تبقيان مغلقتين حتى اكتمال الربط الرسمي.", icon:ShoppingBag, state: integrations ? "ready" : "empty", status: integrations ? `${integrations} تكامل` : "لا توجد تكاملات" },
    { href: "/dashboard/whatsapp/inbox", title: "خدمة العملاء", text: "إدارة المحادثات والرد على العملاء ضمن نافذة الخدمة الرسمية من رقم منشأتك.", icon:MessageCircle, state: connected ? "ready" : "attention", status: connected ? `${conversations} محادثة` : "اربط الرقم أولًا" },
    { href: "/dashboard/whatsapp/setup", title: "ربط الرقم الرسمي", text: "اربط WABA ورقم WhatsApp Business الخاصين بالمنشأة عبر Embedded Signup الرسمي من Meta.", icon:Link2, state: connected ? "ready" : "attention", status:connected?"متصل رسميًا":"يتطلب ربط Meta" },
    { href: "/dashboard/whatsapp/audit", title: "الأمان والتدقيق", text: "راجع العمليات الحساسة لهذا النشاط دون عرض الرموز السرية أو محتوى الرسائل.", icon:ShieldCheck, state: "ready", status: "فعال" },
  ] as const;

  return (
    <div className="min-w-0 space-y-5 pb-5">
      <header className="relative min-w-0 overflow-hidden rounded-[28px] bg-[#061719] p-4 text-white shadow-[0_28px_80px_-48px_rgba(3,23,25,.85)] sm:p-7">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-[#00d8c6]/20 blur-3xl" />
        <div className="absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-[#118cff]/10 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#6eead8]" dir="ltr">
                <Radio className="h-3.5 w-3.5" aria-hidden="true" /> WHATSAPP COMMAND CENTER
              </span>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black sm:text-3xl">مركز قيادة واتساب</h1>
                <span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${launchReady ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-200"}`}>
                  {launchReady ? "جاهز للإطلاق" : `${readyCount} من ${launchSteps.length} جاهزة`}
                </span>
              </div>
              <p className="mt-3 max-w-3xl text-xs leading-7 text-slate-300">
                كل ما تحتاجه لتشغيل رقم منشأتك، تجهيز الجمهور، اعتماد الرسالة وإطلاق الحملات من مكان واحد. الحالات هنا مشتقة من بياناتك الفعلية ولا نفترض الجاهزية.
              </p>
            </div>

            <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:w-[410px]">
              <StatusPanel
                label="رقم المنشأة"
                value={connected ? "متصل رسميًا" : "غير متصل"}
                detail={connection?.verifiedName || connection?.displayPhoneNumber || "Embedded Signup مطلوب"}
                ready={connected}
              />
              <StatusPanel
                label="محرك الإرسال"
                value={launchReadiness.ready ? "جاهز" : "يحتاج انتباه"}
                detail={operationsLabels[launchReadiness.code] ?? "تعذر تحديد الحالة"}
                ready={launchReadiness.ready}
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="rounded-[22px] border border-white/10 bg-white/[.05] p-4">
              <div className="flex items-center gap-2 text-[9px] font-black text-[#6eead8]"><Zap className="h-4 w-4" /> الإجراء التالي</div>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <b className="block text-base">{primaryAction.title}</b>
                  <span className="mt-1 block text-[10px] leading-5 text-slate-400">{primaryAction.description}</span>
                </div>
                <Link href={primaryAction.href} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#35e4cb] px-4 text-[11px] font-black text-[#061719] transition hover:bg-[#65edda] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none">
                  {launchReady ? "فتح الحملات" : "إكمال المتطلب"}<ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <QuickLink href="/dashboard/whatsapp/campaigns" label="حملة جديدة" icon={<Rocket className="h-4 w-4" />} />
              <QuickLink href="/dashboard/whatsapp/contacts" label="استيراد جمهور" icon={<ContactRound className="h-4 w-4" />} />
              <QuickLink href="/dashboard/whatsapp/inbox" label="المحادثات" icon={<MessageCircle className="h-4 w-4" />} />
            </div>
          </div>
        </div>
      </header>

      <section aria-labelledby="launch-readiness-title" className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-[#008f87]" dir="ltr"><Gauge className="h-4 w-4" /> LAUNCH READINESS</span>
            <h2 id="launch-readiness-title" className="mt-1 text-lg font-black text-slate-900">خط جاهزية الإرسال</h2>
            <p className="mt-1 text-[10px] leading-5 text-slate-500">أربع نقاط فقط تفصل بين الحساب الجديد وحملة قابلة للإطلاق.</p>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-black ${launchReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
            {launchReady ? "كل المتطلبات مكتملة" : `متبقي ${launchSteps.length - readyCount}`}
          </span>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {launchSteps.map((step, index) => (
            <Link key={step.title} href={step.href} className={`group rounded-[20px] border p-4 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2 motion-reduce:transition-none ${step.ready ? "border-emerald-100 bg-emerald-50/45 hover:border-emerald-200" : "border-amber-100 bg-amber-50/55 hover:border-amber-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <span className={`grid h-9 w-9 place-items-center rounded-xl ${step.ready ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                  {step.ready ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                </span>
                <span className="text-[9px] font-black text-slate-400">0{index + 1}</span>
              </div>
              <b className="mt-3 block text-sm text-slate-900">{step.title}</b>
              <span className={`mt-1 block text-[10px] font-black ${step.ready ? "text-emerald-700" : "text-amber-700"}`}>{step.value}</span>
              <p className="mt-2 text-[9px] leading-5 text-slate-500">{step.description}</p>
            </Link>
          ))}
        </div>
      </section>

      <section aria-label="ملخص واتساب" className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
        <Metric label="جهات الاتصال" value={String(contacts)} helper="الجمهور المسجل" />
        <Metric label="قوالب معتمدة" value={String(templates)} helper="صالحة للاستخدام" />
        <Metric label="الحملات" value={String(campaigns)} helper="كل الحالات" />
        <Metric label="الأتمتة" value={String(automations)} helper="المسارات المنشأة" />
        <Metric label="المحادثات" value={String(conversations)} helper="سجل الخدمة" wide />
      </section>

      <section aria-label="أقسام تسويق واتساب">
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.14em] text-[#008f87]" dir="ltr"><Sparkles className="h-4 w-4" /> WORKSPACE</span>
            <h2 className="mt-1 text-lg font-black text-slate-900">أدوات واتساب</h2>
          </div>
          <span className="hidden text-[10px] text-slate-400 sm:block">كل أداة تعرض حالتها الفعلية قبل فتحها</span>
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ href, title, text, icon: Icon, state, status }) => (
            <Link key={href} href={href} className="group min-w-0 rounded-[24px] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#bdebe5] hover:shadow-[0_16px_38px_rgba(7,24,27,.07)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2 motion-reduce:transform-none motion-reduce:transition-none sm:p-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e9fbf8] text-[#008f87]"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <Status state={state} label={status} />
              </div>
              <h3 className="mt-4 break-words font-black text-slate-900">{title}</h3>
              <p className="mt-2 break-words text-[10px] leading-6 text-slate-500">{text}</p>
              <span className="mt-4 inline-flex min-h-8 items-center gap-1 text-[10px] font-black text-[#008f87]">فتح القسم <ArrowLeft className="h-3 w-3" aria-hidden="true" /></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function StatusPanel({ label, value, detail, ready }: { label: string; value: string; detail: string; ready: boolean }) {
  return (
    <div className={`min-w-0 rounded-2xl border px-4 py-3 ${ready ? "border-emerald-400/20 bg-emerald-400/10" : "border-amber-300/20 bg-amber-300/10"}`}>
      <span className="block text-[8px] font-bold text-slate-400">{label}</span>
      <b className={`mt-1 block text-sm ${ready ? "text-emerald-200" : "text-amber-200"}`}>{value}</b>
      <span className="mt-1 block break-words text-[9px] leading-5 text-slate-400">{detail}</span>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return <Link href={href} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[.06] px-3 text-[10px] font-black text-white transition hover:bg-white/[.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35e4cb] motion-reduce:transition-none">{icon}{label}</Link>;
}

function Metric({ label, value, helper, wide = false }: { label: string; value: string; helper: string; wide?: boolean }) {
  return (
    <article className={`min-w-0 rounded-[20px] border border-slate-200 bg-white p-3 sm:p-4 ${wide ? "col-span-2 lg:col-span-1" : ""}`}>
      <span className="block text-[9px] font-bold leading-4 text-slate-400">{label}</span>
      <b className="mt-1 block break-words text-xl font-black text-slate-900">{value}</b>
      <span className="mt-1 block text-[8px] text-slate-400">{helper}</span>
    </article>
  );
}

function Status({ state, label }: { state: SectionState; label: string }) {
  const classes = state === "ready" ? "bg-emerald-50 text-emerald-700" : state === "attention" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600";
  return <span className={`max-w-[65%] rounded-full px-2.5 py-1 text-center text-[9px] font-black leading-4 ${classes}`}>{label}</span>;
}
