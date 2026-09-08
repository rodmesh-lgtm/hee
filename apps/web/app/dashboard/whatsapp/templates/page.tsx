import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { AlertTriangle, CheckCircle2, FileText, RefreshCw, Search, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { syncWhatsAppTemplatesAction } from "../../../actions/whatsapp-marketing";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";

const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#07181b] px-4 text-[10px] font-black text-white transition hover:bg-[#0d2a2e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2";
const statusFilters = ["all", "campaign-ready", "approved", "pending", "rejected", "paused-disabled"] as const;
const categoryFilters = ["all", "marketing", "utility", "authentication"] as const;
const languageFilters = ["all", "ar", "en", "other"] as const;
type StatusFilter = (typeof statusFilters)[number];
type CategoryFilter = (typeof categoryFilters)[number];
type LanguageFilter = (typeof languageFilters)[number];

type TemplateRow = {
  id: string;
  connectionId: string;
  name: string;
  language: string;
  category: string;
  status: string;
  providerStatus: string;
  parameterFormat: string | null;
  qualityScore: string | null;
  rejectedReason: string | null;
  components: Prisma.JsonValue;
  lastSyncedAt: Date;
};

export default async function WhatsAppTemplatesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const query = String(params.q ?? "").trim().slice(0, 80);
  const requestedStatus = String(params.status ?? "all") as StatusFilter;
  const requestedCategory = String(params.category ?? "all") as CategoryFilter;
  const requestedLanguage = String(params.language ?? "all") as LanguageFilter;
  const statusFilter: StatusFilter = statusFilters.includes(requestedStatus) ? requestedStatus : "all";
  const categoryFilter: CategoryFilter = categoryFilters.includes(requestedCategory) ? requestedCategory : "all";
  const languageFilter: LanguageFilter = languageFilters.includes(requestedLanguage) ? requestedLanguage : "all";

  const [connection, templates] = await Promise.all([
    db.whatsAppConnection.findFirst({
      where: { businessId: context.businessId, provider: "meta" },
      select: { id: true, status: true, disabledAt: true, verifiedName: true, displayPhoneNumber: true },
    }),
    db.whatsAppTemplate.findMany({
      where: { businessId: context.businessId, provider: "meta" },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      take: 200,
      select: { id: true, connectionId: true, name: true, language: true, category: true, status: true, providerStatus: true, parameterFormat: true, qualityScore: true, rejectedReason: true, components: true, lastSyncedAt: true },
    }),
  ]);

  const connectionReady = connection?.status === "connected" && !connection.disabledAt;
  const isCampaignReady = (template: TemplateRow) => Boolean(
    connectionReady && connection && template.connectionId === connection.id && template.status === "approved" && template.category !== "unknown",
  );
  const approvedCount = templates.filter((item) => item.status === "approved").length;
  const pendingCount = templates.filter((item) => item.status === "pending").length;
  const rejectedCount = templates.filter((item) => item.status === "rejected").length;
  const inactiveCount = templates.filter((item) => item.status === "paused" || item.status === "disabled").length;
  const campaignReadyCount = templates.filter(isCampaignReady).length;
  const latestSync = templates.reduce<Date | null>((latest, item) => !latest || item.lastSyncedAt > latest ? item.lastSyncedAt : latest, null);
  const normalizedQuery = query.toLocaleLowerCase("ar");
  const filteredTemplates = templates.filter((template) => {
    if (statusFilter === "campaign-ready" && !isCampaignReady(template)) return false;
    if (statusFilter === "approved" && template.status !== "approved") return false;
    if (statusFilter === "pending" && template.status !== "pending") return false;
    if (statusFilter === "rejected" && template.status !== "rejected") return false;
    if (statusFilter === "paused-disabled" && !["paused", "disabled"].includes(template.status)) return false;
    if (categoryFilter !== "all" && template.category !== categoryFilter) return false;
    if (languageFilter !== "all" && languageBucket(template.language) !== languageFilter) return false;
    if (!normalizedQuery) return true;
    return [template.name, template.language, template.category, template.providerStatus]
      .some((value) => value.toLocaleLowerCase("ar").includes(normalizedQuery));
  });

  const nextAction = templateNextAction({ connectionReady, templates: templates.length, campaignReadyCount, pendingCount, rejectedCount, inactiveCount });

  return <div className="min-w-0 space-y-5 pb-5">
    <header className="relative overflow-hidden rounded-[30px] bg-[#07181b] p-5 text-white shadow-[0_30px_80px_-50px_rgba(3,23,25,.85)] sm:p-7">
      <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-[#00d8c6]/20 blur-3xl"/><div className="absolute -bottom-24 right-1/3 h-52 w-52 rounded-full bg-[#118cff]/10 blur-3xl"/>
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div><span className="text-[9px] font-black tracking-[.16em] text-[#6eead8]" dir="ltr">TEMPLATE OPERATIONS</span><div className="mt-3 flex items-center gap-2"><FileText className="h-5 w-5 text-[#35e4cb]"/><h1 className="text-2xl font-black">مركز عمليات القوالب</h1></div><p className="mt-3 max-w-3xl text-xs leading-7 text-slate-300">راقب اعتماد Meta، جودة القالب، عقد المتغيرات وجاهزيته للحملات من شاشة واحدة. INFRO لا يغيّر قرار الاعتماد؛ بل يعكس حالة Meta ويمنع استخدام غير الجاهز.</p></div>
        <div className="min-w-[220px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3"><span className="block text-[9px] text-slate-400">NEXT ACTION</span><b className="mt-1 block text-sm text-white">{nextAction.title}</b><span className="mt-1 block text-[9px] leading-5 text-slate-400">{nextAction.detail}</span></div>
      </div>
    </header>

    {!connectionReady && connection ? <p role="status" className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-bold text-amber-800"><AlertTriangle className="h-4 w-4"/>رقم واتساب المرتبط غير جاهز حاليًا. أعد تفعيل الاتصال أولًا؛ القالب المعتمد وحده لا يكفي للإرسال.</p> : null}
    {params.sync ? <p aria-live="polite" className={`flex items-center gap-2 rounded-2xl border p-3 text-[10px] font-bold ${params.sync === "complete" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{params.sync === "complete" ? <CheckCircle2 className="h-4 w-4"/> : <AlertTriangle className="h-4 w-4"/>}{params.sync === "complete" ? `تم تحديث القوالب بنجاح (${params.count ?? 0}).` : "تعذر تحديث القوالب. تحقق من اتصال الرقم ثم أعد المحاولة."}</p> : null}

    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <Kpi label="جاهزة للحملات" value={campaignReadyCount} helper="معتمد + رقم Meta المتصل" good icon={<ShieldCheck className="h-4 w-4"/>}/>
      <Kpi label="معتمدة من Meta" value={approvedCount} helper="قد تتطلب اتصالًا جاهزًا" icon={<CheckCircle2 className="h-4 w-4"/>}/>
      <Kpi label="قيد المراجعة" value={pendingCount} helper="قرار Meta لم يكتمل" icon={<RefreshCw className="h-4 w-4"/>}/>
      <Kpi label="تحتاج انتباهًا" value={rejectedCount + inactiveCount} helper={`${rejectedCount} مرفوض · ${inactiveCount} متوقف`} icon={<AlertTriangle className="h-4 w-4"/>}/>
    </section>

    <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><h2 className="font-black text-slate-900">مكتبة القوالب</h2><p className="mt-1 text-[9px] text-slate-400">حتى 200 قالب من نشاطك · لا يتم عرض raw payload</p></div><div className="flex flex-wrap gap-2">{connectionReady ? <form action={syncWhatsAppTemplatesAction}><input type="hidden" name="connectionId" value={connection!.id}/><button type="submit" className={actionClass}><RefreshCw className="h-3.5 w-3.5"/>تحديث من Meta</button></form> : <Link href="/dashboard/whatsapp/setup" className={actionClass}>ربط رقم واتساب</Link>}<Link href="/dashboard/whatsapp/campaigns" className="inline-flex min-h-11 items-center rounded-xl border border-[#bdebe5] bg-[#effbf9] px-4 text-[10px] font-black text-[#008f87]">Campaign Studio</Link></div></div>

        <form className="mt-5 grid gap-2 md:grid-cols-[minmax(180px,1fr)_auto_auto_auto_auto]">
          <label className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/><input name="q" defaultValue={query} maxLength={80} placeholder="ابحث باسم القالب أو اللغة" className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-9 pl-3 text-xs outline-none focus:border-[#8ddfd6]"/></label>
          <select name="status" defaultValue={statusFilter} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-[#8ddfd6]"><option value="all">كل الحالات</option><option value="campaign-ready">جاهز للحملة</option><option value="approved">معتمد</option><option value="pending">قيد المراجعة</option><option value="rejected">مرفوض</option><option value="paused-disabled">متوقف / معطل</option></select>
          <select name="category" defaultValue={categoryFilter} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-[#8ddfd6]"><option value="all">كل الأنواع</option><option value="marketing">تسويقي</option><option value="utility">خدمي</option><option value="authentication">مصادقة</option></select>
          <select name="language" defaultValue={languageFilter} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-bold outline-none focus:border-[#8ddfd6]"><option value="all">كل اللغات</option><option value="ar">العربية</option><option value="en">الإنجليزية</option><option value="other">أخرى</option></select>
          <button className="min-h-11 rounded-xl bg-[#07181b] px-4 text-[10px] font-black text-white">تطبيق</button>
        </form>

        {filteredTemplates.length ? <div className="mt-5 grid gap-3">{filteredTemplates.map((template) => <TemplateCard key={template.id} template={template} campaignReady={isCampaignReady(template)}/>)}</div> : <EmptyTemplates hasTemplates={templates.length > 0} connectionReady={connectionReady} connectionId={connection?.id}/>} 
      </div>

      <aside className="space-y-3">
        <div className="rounded-[24px] border border-slate-200 bg-white p-4"><span className="text-[9px] font-black text-[#008f87]">SYNC HEALTH</span><b className="mt-2 block text-sm text-slate-900">{latestSync ? syncAgeLabel(latestSync) : "لم تتم مزامنة قالب بعد"}</b><p className="mt-2 text-[9px] leading-5 text-slate-500">{connectionReady ? `الرقم: ${connection?.verifiedName || connection?.displayPhoneNumber || "متصل"}` : "اتصال Meta غير جاهز حاليًا."}</p></div>
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4"><Sparkles className="h-4 w-4 text-emerald-700"/><b className="mt-2 block text-xs text-slate-900">متى يصبح القالب جاهزًا؟</b><p className="mt-2 text-[9px] leading-5 text-slate-600">عندما يكون القالب Approved من Meta، نوعه معروف، ويرتبط باتصال Meta النشط لنشاطك. ويعاد فحص هذه الشروط عند إنشاء وإطلاق الحملة.</p></div>
        <div className="rounded-[24px] border border-amber-100 bg-amber-50/60 p-4"><WandSparkles className="h-4 w-4 text-amber-700"/><b className="mt-2 block text-xs text-slate-900">الإنشاء والاعتماد لدى Meta</b><p className="mt-2 text-[9px] leading-5 text-slate-600">أنشئ أو عدّل القالب في أدوات Meta الرسمية، ثم استخدم «تحديث من Meta» هنا. لا تعرض INFRO زر اعتماد وهميًا ولا تتجاوز مراجعة Meta.</p></div>
      </aside>
    </section>
  </div>;
}

function TemplateCard({ template, campaignReady }: { template: TemplateRow; campaignReady: boolean }) {
  const preview = templatePreview(template.components);
  return <article className="overflow-hidden rounded-[20px] border border-slate-200 bg-[#fbfdfd]">
    <div className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><b className="break-words text-sm text-slate-900">{template.name}</b>{campaignReady?<span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-black text-emerald-800">جاهز للحملة</span>:null}</div><span className="mt-1 block text-[10px] text-slate-400">{languageLabel(template.language)} · {categoryLabel(template.category)} · {template.parameterFormat || "صيغة افتراضية"}</span></div><TemplateStatus status={template.status}/></div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]"><div className="rounded-[16px] border border-slate-100 bg-white p-3"><span className="text-[9px] font-bold text-slate-400">معاينة الرسالة</span>{preview.header?<b className="mt-2 block text-[10px] text-slate-700">{preview.header}</b>:null}<p className="mt-2 whitespace-pre-wrap break-words text-[10px] leading-6 text-slate-600">{preview.body || "لا يحتوي هذا القالب على نص BODY قابل للمعاينة."}</p>{preview.footer?<span className="mt-2 block text-[9px] text-slate-400">{preview.footer}</span>:null}{preview.buttons.length?<div className="mt-3 flex flex-wrap gap-1.5">{preview.buttons.map((button)=><span key={button} className="rounded-lg border border-[#bdebe5] bg-[#effbf9] px-2 py-1 text-[9px] font-bold text-[#008f87]">{button}</span>)}</div>:null}</div><dl className="grid grid-cols-2 gap-2 text-[9px] lg:grid-cols-1"><MetaCell label="الجودة / ملاحظة Meta" value={template.qualityScore || template.rejectedReason || "لا توجد ملاحظة"}/><MetaCell label="آخر مزامنة" value={template.lastSyncedAt.toLocaleString("ar-SA")}/></dl></div>
    </div>
  </article>;
}

function EmptyTemplates({ hasTemplates, connectionReady, connectionId }: { hasTemplates: boolean; connectionReady: boolean; connectionId?: string }) {
  if (hasTemplates) return <div className="mt-5 rounded-[20px] border border-dashed border-slate-200 p-8 text-center"><Search className="mx-auto h-5 w-5 text-slate-300"/><b className="mt-3 block text-sm">لا توجد قوالب مطابقة</b><p className="mt-2 text-[10px] text-slate-500">غيّر البحث أو المرشحات لعرض قوالب أخرى.</p><Link href="/dashboard/whatsapp/templates" className="mt-4 inline-flex rounded-xl bg-[#effbf9] px-4 py-2 text-[10px] font-black text-[#008f87]">عرض كل القوالب</Link></div>;
  return <div className="mt-5 p-6 text-center sm:p-8"><div className="mx-auto max-w-md"><FileText className="mx-auto h-6 w-6 text-slate-300"/><p className="mt-3 font-black">ابدأ بمزامنة قوالب رقمك</p><p className="mt-2 text-[10px] leading-6 text-slate-500">{connectionReady ? "إذا أنشأت قالبًا في Meta ولم يظهر هنا بعد، حدّث القوالب لجلب حالته الحالية." : "اربط رقم واتساب التجاري أولًا، وبعد نجاح الربط ستظهر القوالب وحالات اعتمادها هنا."}</p><div className="mt-4 flex flex-wrap justify-center gap-2">{connectionReady && connectionId ? <form action={syncWhatsAppTemplatesAction}><input type="hidden" name="connectionId" value={connectionId}/><button type="submit" className={actionClass}>تحديث القوالب الآن</button></form> : <Link href="/dashboard/whatsapp/setup" className={actionClass}>إكمال ربط الرقم</Link>}</div></div></div>;
}

function templatePreview(value: Prisma.JsonValue) {
  const components = Array.isArray(value) ? value.filter((item): item is Prisma.JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  const findText = (type: string) => {
    const component = components.find((item) => String(item.type ?? "").toUpperCase() === type);
    return typeof component?.text === "string" ? component.text.slice(0, 4096) : null;
  };
  const buttonComponent = components.find((item) => String(item.type ?? "").toUpperCase() === "BUTTONS");
  const buttons = Array.isArray(buttonComponent?.buttons) ? buttonComponent.buttons.flatMap((item) => item && typeof item === "object" && !Array.isArray(item) && typeof item.text === "string" ? [item.text.slice(0, 80)] : []).slice(0, 3) : [];
  return { header: findText("HEADER"), body: findText("BODY"), footer: findText("FOOTER"), buttons };
}

function templateNextAction(input: { connectionReady: boolean; templates: number; campaignReadyCount: number; pendingCount: number; rejectedCount: number; inactiveCount: number }) {
  if (!input.connectionReady) return { title: "أكمل اتصال رقم Meta", detail: "بدون اتصال نشط لا يمكن اعتبار أي قالب جاهزًا للحملة." };
  if (input.templates === 0) return { title: "زامن قوالب Meta", detail: "أنشئ القالب في Meta ثم اجلب حالته إلى INFRO." };
  if (input.campaignReadyCount === 0 && input.pendingCount > 0) return { title: "انتظر مراجعة Meta", detail: `${input.pendingCount} قالب قيد المراجعة؛ لا يمكن الإرسال به حتى الاعتماد.` };
  if (input.campaignReadyCount === 0 && input.rejectedCount + input.inactiveCount > 0) return { title: "راجع القوالب غير الجاهزة", detail: "عالج سبب الرفض أو حالة الإيقاف داخل Meta ثم أعد المزامنة." };
  if (input.campaignReadyCount > 0) return { title: "ابدأ Campaign Studio", detail: `${input.campaignReadyCount} قالب جاهز للاستخدام مع اتصال النشاط الحالي.` };
  return { title: "حدّث القوالب", detail: "أعد المزامنة للحصول على أحدث حالات Meta." };
}

function Kpi({ label, value, helper, icon, good=false }: { label: string; value: number; helper: string; icon: React.ReactNode; good?: boolean }) { return <article className={`rounded-[20px] border p-4 ${good?"border-emerald-100 bg-emerald-50/50":"border-slate-200 bg-white"}`}><div className="flex items-center gap-2 text-[#008f87]">{icon}<span className="text-[9px] font-bold text-slate-400">{label}</span></div><b className="mt-2 block text-xl font-black text-slate-900">{value}</b><span className="mt-1 block text-[8px] leading-4 text-slate-400">{helper}</span></article>; }
function MetaCell({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-slate-100 bg-white p-3"><dt className="text-[8px] font-bold text-slate-400">{label}</dt><dd className="mt-1 break-words font-bold leading-5 text-slate-700">{value}</dd></div>; }
function TemplateStatus({ status }: { status: string }) { return <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black ${status === "approved" ? "bg-emerald-50 text-emerald-700" : status === "rejected" ? "bg-rose-50 text-rose-700" : status === "paused" || status === "disabled" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"}`}>{templateStatusLabel(status)}</span>; }
function templateStatusLabel(status: string) { if (status === "approved") return "معتمد"; if (status === "pending") return "قيد المراجعة"; if (status === "rejected") return "غير معتمد"; if (status === "paused") return "موقوف مؤقتًا"; if (status === "disabled") return "معطّل"; return "قيد التحديث"; }
function categoryLabel(category: string) { const normalized = category.toLowerCase(); if (normalized === "marketing") return "تسويقي"; if (normalized === "utility") return "خدمي"; if (normalized === "authentication") return "مصادقة"; return category || "—"; }
function languageLabel(language: string) { if (language === "ar" || language.startsWith("ar_")) return "العربية"; if (language === "en" || language.startsWith("en_")) return "الإنجليزية"; return language; }
function languageBucket(language: string): Exclude<LanguageFilter,"all"> { if (language === "ar" || language.startsWith("ar_")) return "ar"; if (language === "en" || language.startsWith("en_")) return "en"; return "other"; }
function syncAgeLabel(value: Date) { const minutes = Math.max(0, Math.floor((Date.now() - value.getTime()) / 60_000)); if (minutes < 1) return "تمت المزامنة للتو"; if (minutes < 60) return `آخر مزامنة قبل ${minutes} دقيقة`; const hours = Math.floor(minutes / 60); if (hours < 24) return `آخر مزامنة قبل ${hours} ساعة`; return `آخر مزامنة ${value.toLocaleDateString("ar-SA")}`; }
