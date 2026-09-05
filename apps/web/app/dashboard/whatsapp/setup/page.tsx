import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  CircleDot,
  FileText,
  Gauge,
  Link2,
  LockKeyhole,
  MessageCircle,
  Radio,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { getMetaEmbeddedSignupPublicConfig } from "../../../lib/whatsapp/meta-config";
import { EmbeddedSignupButton } from "./embedded-signup-button";

const connectionStatusLabel: Record<string, string> = {
  connected: "متصل",
  pending: "الربط غير مكتمل",
  disconnected: "غير متصل",
  failed: "يحتاج إعادة ربط",
};

export default async function WhatsAppSetupPage() {
  const context = await getWhatsAppReadContext("connection.manage");
  if (!context) redirect("/dashboard/whatsapp/inbox?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) {
    redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  }

  const [connection, latestSession, templateSummary, campaignCount, conversationCount] = await Promise.all([
    db.whatsAppConnection.findFirst({
      where: { businessId: context.businessId, provider: "meta" },
      select: {
        id: true,
        status: true,
        disabledAt: true,
        displayPhoneNumber: true,
        verifiedName: true,
        connectedAt: true,
        updatedAt: true,
        lastErrorCode: true,
        wabaId: true,
        phoneNumberId: true,
      },
    }),
    db.whatsAppEmbeddedSignupSession.findFirst({
      where: { businessId: context.businessId },
      orderBy: { createdAt: "desc" },
      select: { status: true, expiresAt: true, consumedAt: true, lastErrorCode: true, createdAt: true },
    }),
    db.whatsAppTemplate.groupBy({
      by: ["status"],
      where: { businessId: context.businessId, provider: "meta" },
      _count: { _all: true },
    }),
    db.whatsAppCampaign.count({ where: { businessId: context.businessId } }),
    db.whatsAppConversation.count({ where: { businessId: context.businessId } }),
  ]);

  const publicConfig = getMetaEmbeddedSignupPublicConfig();
  const connected = connection?.status === "connected" && !connection.disabledAt;
  const identityReady = Boolean(connected && connection?.verifiedName && connection?.displayPhoneNumber);
  const recentSignupProblem = Boolean(latestSession?.lastErrorCode);
  const approvedTemplates = templateSummary.find((item) => item.status === "approved")?._count._all ?? 0;
  const pendingTemplates = templateSummary.find((item) => item.status === "pending")?._count._all ?? 0;
  const rejectedTemplates = templateSummary.find((item) => item.status === "rejected")?._count._all ?? 0;
  const checks = [
    { label: "اتصال Meta", ready: connected, detail: connected ? "نشط" : "يحتاج ربط" },
    { label: "هوية الرقم", ready: identityReady, detail: identityReady ? "مكتملة" : "بانتظار بيانات Meta" },
    { label: "إعداد Embedded Signup", ready: Boolean(publicConfig), detail: publicConfig ? "متاح" : "غير متاح" },
    { label: "سلامة آخر ربط", ready: !recentSignupProblem, detail: recentSignupProblem ? "تحتاج إعادة محاولة" : "لا توجد مشكلة حديثة" },
  ];
  const readyChecks = checks.filter((item) => item.ready).length;
  const healthPercent = Math.round((readyChecks / checks.length) * 100);
  const nextAction = !publicConfig
    ? { title: "إكمال إعداد خدمة الربط", detail: "Embedded Signup غير متاح حاليًا، لذلك لن ننشئ اتصالًا ناقصًا.", href: "/dashboard/whatsapp/setup" }
    : !connected
      ? { title: "ربط رقم الشركة رسميًا", detail: "استخدم حساب Meta الذي يدير WABA ورقم WhatsApp Business الخاص بالشركة.", href: "#meta-connect" }
      : !identityReady
        ? { title: "تحديث بيانات الرقم", detail: "الاتصال موجود لكن الاسم أو الرقم لم يصلا بعد من Meta. أعد تفويض الربط بأمان.", href: "#meta-connect" }
        : approvedTemplates === 0
          ? { title: "تجهيز قالب للحملة", detail: "الرقم جاهز. الخطوة التالية هي مزامنة قالب معتمد من Meta.", href: "/dashboard/whatsapp/templates" }
          : { title: "الحساب جاهز للعمل", detail: "الرقم والقوالب الأساسية جاهزة؛ يمكنك الانتقال إلى الحملات أو المحادثات.", href: "/dashboard/whatsapp/campaigns" };

  return <div className="min-w-0 space-y-5 pb-5">
    <header className="relative overflow-hidden rounded-[30px] bg-[#061719] p-5 text-white shadow-[0_30px_80px_-50px_rgba(3,23,25,.9)] sm:p-7">
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#00d8c6]/20 blur-3xl" />
      <div className="absolute -bottom-24 right-1/3 h-52 w-52 rounded-full bg-[#118cff]/10 blur-3xl" />
      <div className="relative grid gap-6 xl:grid-cols-[1fr_360px] xl:items-start">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#6eead8]" dir="ltr"><Radio className="h-3.5 w-3.5" aria-hidden="true" />WHATSAPP ACCOUNT OPERATIONS</span>
          <div className="mt-3 flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black sm:text-3xl">مركز حساب واتساب</h1><span className={`rounded-full border px-2.5 py-1 text-[9px] font-black ${connected ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-200" : "border-amber-300/20 bg-amber-300/10 text-amber-200"}`}>{connected ? "متصل رسميًا" : "يتطلب ربط Meta"}</span></div>
          <p className="mt-3 max-w-3xl text-xs leading-7 text-slate-300">شاشة تشغيل واحدة لهوية رقم الشركة، حالة Meta، سلامة الربط وما أصبح متاحًا بعد الاتصال. لا QR ولا WhatsApp Web؛ الربط عبر Meta Cloud API وEmbedded Signup الرسمي فقط.</p>
          <div className="mt-5 rounded-[22px] border border-white/10 bg-white/[.05] p-4"><span className="text-[9px] font-black text-[#6eead8]">NEXT ACTION</span><div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><b className="block text-base">{nextAction.title}</b><span className="mt-1 block text-[10px] leading-5 text-slate-400">{nextAction.detail}</span></div><Link href={nextAction.href} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#35e4cb] px-4 text-[10px] font-black text-[#061719] transition hover:bg-[#65edda] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none">إكمال الخطوة<ArrowLeft className="h-3.5 w-3.5" /></Link></div></div>
        </div>
        <div className="rounded-[24px] border border-white/10 bg-white/[.05] p-4"><div className="flex items-end justify-between gap-3"><div><span className="text-[9px] text-slate-400">ACCOUNT HEALTH</span><b className="mt-1 block text-3xl font-black">{healthPercent}%</b></div><Gauge className="h-6 w-6 text-[#35e4cb]" /></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#35e4cb]" style={{ width: `${healthPercent}%` }} /></div><div className="mt-4 grid gap-2">{checks.map((check) => <div key={check.label} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/10 px-3 py-2"><span className="flex items-center gap-2 text-[9px] font-bold text-slate-300">{check.ready ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" /> : <CircleDot className="h-3.5 w-3.5 text-amber-300" />}{check.label}</span><span className="text-[8px] text-slate-400">{check.detail}</span></div>)}</div></div>
      </div>
    </header>

    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Kpi label="قوالب معتمدة" value={approvedTemplates} helper={pendingTemplates ? `${pendingTemplates} قيد المراجعة` : "جاهزة من Meta"} good={approvedTemplates > 0} />
      <Kpi label="قوالب تحتاج انتباهًا" value={rejectedTemplates} helper="مرفوضة من Meta" />
      <Kpi label="الحملات" value={campaignCount} helper="ضمن هذا النشاط" />
      <Kpi label="المحادثات" value={conversationCount} helper="على رقم المنشأة" />
    </section>

    <section className="grid min-w-0 gap-5 xl:grid-cols-[1.05fr_.95fr]">
      <article className="min-w-0 rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Link2 className="h-4 w-4" /></span><div><h2 className="font-black">هوية الرقم والاتصال</h2><p className="text-[9px] text-slate-400">BUSINESS NUMBER PASSPORT</p></div></div><span className={`rounded-full px-3 py-1.5 text-[9px] font-black ${connected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{connection ? connection.disabledAt ? "الربط متوقف" : connectionStatusLabel[connection.status] || "يحتاج مراجعة" : "لا يوجد اتصال"}</span></div>
        {connection ? <div className="mt-5 grid gap-3 sm:grid-cols-2"><InfoCell label="اسم النشاط في واتساب" value={connection.verifiedName || "لم يصل الاسم بعد"} /><InfoCell label="رقم واتساب" value={connection.displayPhoneNumber || "لم يصل الرقم بعد"} ltr /><InfoCell label="WABA ID" value={connection.wabaId} ltr technical /><InfoCell label="Phone Number ID" value={connection.phoneNumberId} ltr technical /><InfoCell label="آخر تحديث للاتصال" value={formatDate(connection.updatedAt)} /><InfoCell label="تاريخ الربط" value={connection.connectedAt ? formatDate(connection.connectedAt) : "لم يكتمل بعد"} /></div> : <div className="mt-5 rounded-[20px] border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center"><ShieldCheck className="mx-auto h-6 w-6 text-slate-300" /><b className="mt-3 block text-sm">لم يتم ربط رقم بعد</b><p className="mx-auto mt-2 max-w-md text-[10px] leading-6 text-slate-500">ابدأ الربط الرسمي من البطاقة المجاورة. لا تحفظ INFRO اتصالًا ناقصًا ولا تستخدم QR.</p></div>}
        {connection?.lastErrorCode ? <div role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold leading-6 text-amber-800"><AlertTriangle className="mb-1 h-4 w-4" />حالة الاتصال الحالية تحتاج مراجعة قبل الإرسال. لا نعرض تفاصيل داخلية حساسة هنا؛ استخدم إعادة الربط الرسمية.</div> : null}
      </article>

      <article id="meta-connect" className="relative min-w-0 overflow-hidden rounded-[26px] bg-[#07181b] p-4 text-white sm:p-6">
        <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-[#00d8c6]/15 blur-2xl" />
        <div className="relative flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#6eead8]">{connected ? <RefreshCw className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}</span><div><h2 className="font-black">{connected ? "تحديث التفويض الرسمي" : "بدء الربط الرسمي"}</h2><p className="text-[9px] text-slate-400">SECURE META AUTHORIZATION</p></div></div>
        <p className="relative mt-4 text-xs leading-7 text-slate-300">بعد موافقتك داخل Meta تتحقق INFRO من أن WABA والرقم يتبعان الأصول التي اخترتها قبل اعتماد الاتصال لنشاطك.</p>
        <div className="relative mt-4 grid gap-2 sm:grid-cols-3"><FlowStep number="01" title="Meta" text="تسجيل دخول رسمي" /><FlowStep number="02" title="الأصول" text="اختيار WABA والرقم" /><FlowStep number="03" title="INFRO" text="تحقق وربط بالنشاط" /></div>
        <div className="relative mt-5 rounded-[18px] border border-white/10 bg-white/[.05] p-3 sm:p-4">{publicConfig ? <EmbeddedSignupButton {...publicConfig} /> : <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-[10px] font-bold leading-6 text-amber-100"><b className="block">الربط غير متاح حاليًا</b><span className="mt-1 block font-medium text-amber-100/80">لن يتم حفظ اتصال ناقص أو محاولة إرسال رسالة حتى يكتمل إعداد خدمة الربط.</span></div>}</div>
        {latestSession ? <div className="relative mt-3 rounded-xl border border-white/10 bg-white/[.04] p-3 text-[9px] leading-5 text-slate-400"><div className="flex flex-wrap items-center justify-between gap-2"><span>آخر محاولة: {signupStatusLabel(latestSession.status)}</span><span>{formatDate(latestSession.createdAt)}</span></div>{latestSession.consumedAt ? <span className="mt-1 block text-emerald-300">تم استهلاك جلسة التفويض بأمان.</span> : latestSession.expiresAt < new Date() ? <span className="mt-1 block text-amber-300">انتهت صلاحية جلسة الربط السابقة؛ ابدأ جلسة جديدة.</span> : null}</div> : null}
        {recentSignupProblem ? <div aria-live="polite" className="relative mt-3 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-[10px] leading-6 text-amber-100"><b className="block">لم تكتمل آخر محاولة ربط</b><span>لم نعتمد رقمًا جديدًا. استخدم حساب Meta الذي يملك صلاحية إدارة رقم الشركة ثم أعد المحاولة.</span></div> : null}
      </article>
    </section>

    <section className="grid gap-3 md:grid-cols-3">
      <JourneyCard href="/dashboard/whatsapp/templates" icon={<FileText className="h-4 w-4" />} title="القوالب" value={`${approvedTemplates} معتمد`} detail="مزامنة حالة Meta ومعاينة جاهزية الحملة." ready={approvedTemplates > 0} />
      <JourneyCard href="/dashboard/whatsapp/campaigns" icon={<Sparkles className="h-4 w-4" />} title="الحملات" value={connected && approvedTemplates > 0 ? "متاحة للتجهيز" : "متطلبات ناقصة"} detail="الإنشاء لا يرسل تلقائيًا، والإطلاق يبقى محميًا." ready={connected && approvedTemplates > 0} />
      <JourneyCard href="/dashboard/whatsapp/inbox" icon={<MessageCircle className="h-4 w-4" />} title="المحادثات" value={connected ? `${conversationCount} محادثة` : "اربط الرقم أولًا"} detail="خدمة العملاء من رقم المنشأة الرسمي." ready={connected} />
    </section>

    <section className="rounded-[22px] border border-slate-200 bg-white p-4"><p className="flex items-start gap-2 text-[10px] leading-6 text-slate-500"><LockKeyhole className="mt-1 h-4 w-4 shrink-0 text-[#008f87]" /><span>بيانات اعتماد Meta والرموز السرية لا تظهر في لوحة العميل. المعروض هنا هو معرفات تشغيلية وحالة الربط فقط، وتستخدم INFRO الاعتماد المشفر لتنفيذ العمليات المصرح بها لنفس النشاط.</span></p></section>
  </div>;
}

function Kpi({ label, value, helper, good = false }: { label: string; value: number; helper: string; good?: boolean }) {
  return <article className={`rounded-[20px] border p-4 ${good ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200 bg-white"}`}><span className="text-[9px] text-slate-400">{label}</span><b className="mt-1 block text-xl font-black text-slate-900">{value}</b><span className="mt-1 block text-[8px] leading-4 text-slate-400">{helper}</span></article>;
}

function InfoCell({ label, value, ltr = false, technical = false }: { label: string; value: string; ltr?: boolean; technical?: boolean }) {
  return <div className="min-w-0 rounded-[16px] border border-slate-100 bg-slate-50/70 p-3"><dt className="text-[8px] font-bold text-slate-400">{label}</dt><dd dir={ltr ? "ltr" : undefined} className={`mt-1 break-all text-xs font-black text-slate-800 ${ltr ? "text-right" : ""} ${technical ? "font-mono text-[10px]" : ""}`}>{value}</dd></div>;
}

function FlowStep({ number, title, text }: { number: string; title: string; text: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/[.04] p-3"><span className="text-[8px] font-black text-[#6eead8]">{number}</span><b className="mt-1 block text-[10px]">{title}</b><span className="mt-1 block text-[8px] text-slate-400">{text}</span></div>;
}

function JourneyCard({ href, icon, title, value, detail, ready }: { href: string; icon: React.ReactNode; title: string; value: string; detail: string; ready: boolean }) {
  return <Link href={href} className="group rounded-[22px] border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#9fded6] hover:shadow-[0_18px_40px_-30px_rgba(4,105,101,.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] motion-reduce:transform-none motion-reduce:transition-none"><div className="flex items-center justify-between gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]">{icon}</span><span className={`rounded-full px-2.5 py-1 text-[8px] font-black ${ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{ready ? "جاهز" : "يحتاج إعداد"}</span></div><b className="mt-3 block text-sm text-slate-900">{title}</b><span className="mt-1 block text-[10px] font-black text-[#008f87]">{value}</span><p className="mt-2 text-[9px] leading-5 text-slate-500">{detail}</p></Link>;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(value);
}

function signupStatusLabel(status: string) {
  if (status === "created") return "جلسة بدأت";
  if (status === "authorized") return "تم التفويض";
  if (status === "completed") return "اكتمل الربط";
  if (status === "failed") return "لم تكتمل";
  if (status === "expired") return "انتهت الصلاحية";
  return "قيد المعالجة";
}
