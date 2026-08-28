import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Pause, Play, Workflow } from "lucide-react";
import { createWhatsAppAutomationAction, operateWhatsAppAutomationAction } from "../../../actions/whatsapp-marketing";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { db } from "../../../lib/db";
import { readAutomationTriggerConfig, readTemplateActionConfig, templateHasVariables, WHATSAPP_APPOINTMENT_LEAD_MINUTES, WHATSAPP_AUTOMATION_TRIGGER_TYPES, WHATSAPP_ORDER_EVENT_STATUSES } from "../../../lib/whatsapp/automation-domain";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";

const triggerLabels: Record<(typeof WHATSAPP_AUTOMATION_TRIGGER_TYPES)[number], string> = {
  welcome: "ترحيب بعد موافقة صريحة",
  appointment_reminder: "تذكير موعد",
  follow_up: "متابعة",
  order_update: "تحديث طلب",
  inactive_customer: "عميل غير نشط",
  abandoned_cart: "سلة متروكة",
  api_event: "حدث API موثوق",
};

const statusLabels: Record<string, string> = { draft: "مسودة", active: "نشطة", paused: "متوقفة مؤقتًا", archived: "مؤرشفة" };
const orderStatusLabels: Record<string, string> = { pending: "طلب جديد", confirmed: "تم التأكيد", processing: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
const leadLabels: Record<number, string> = { 30: "قبل 30 دقيقة", 60: "قبل ساعة", 180: "قبل 3 ساعات", 1440: "قبل يوم", 2880: "قبل يومين", 10080: "قبل أسبوع" };

function templateIdFromConfig(value: unknown) {
  try { return readTemplateActionConfig(value).templateId; } catch { return null; }
}

function triggerDetail(triggerType: string, triggerConfig: unknown) {
  try {
    const config = readAutomationTriggerConfig(triggerConfig, triggerType);
    if (triggerType === "appointment_reminder" && "leadMinutes" in config && typeof config.leadMinutes === "number") return leadLabels[config.leadMinutes] || `قبل ${config.leadMinutes} دقيقة`;
    if (triggerType !== "order_update") return null;
    return "orderStatuses" in config && Array.isArray(config.orderStatuses) ? config.orderStatuses.map((status) => orderStatusLabels[status] || status).join("، ") : null;
  } catch { return "إعداد الحدث غير صالح"; }
}

export default async function WhatsAppAutomationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("automation.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const [templates, automations] = await Promise.all([
    db.whatsAppTemplate.findMany({
      where: { businessId: context.businessId, provider: "meta" },
      orderBy: [{ name: "asc" }, { language: "asc" }],
      select: {
        id: true, name: true, language: true, category: true, status: true, components: true,
        connection: { select: { businessId: true, provider: true, status: true, verifiedName: true, displayPhoneNumber: true } },
      },
    }),
    db.whatsAppAutomation.findMany({
      where: { businessId: context.businessId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true, name: true, status: true, triggerType: true, triggerConfig: true, actionConfig: true, cooldownMinutes: true,
        createdAt: true, activatedAt: true, pausedAt: true,
        connection: { select: { verifiedName: true, displayPhoneNumber: true } },
        _count: { select: { runs: true, jobs: true, events: { where: { status: "pending" } } } },
        events: { where: { status: "pending" }, orderBy: { nextAttemptAt: "asc" }, take: 1, select: { nextAttemptAt: true } },
        runs: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, skipReason: true, createdAt: true } },
      },
    }),
  ]);
  const eligibleTemplates = templates.filter((template) => template.status === "approved"
    && template.connection.businessId === context.businessId
    && template.connection.provider === "meta"
    && template.connection.status === "connected"
    && !templateHasVariables(template.components));
  const templatesById = new Map(templates.map((template) => [template.id, template]));
  const operationSucceeded = ["activate", "pause", "resume"].includes(params.operation || "");

  return <div className="space-y-4 pb-5">
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-[24px] border bg-white p-5"><div><div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-[#6543ce]" /><h1 className="text-xl font-black text-[#20264f]">أتمتة واتساب</h1></div><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">حوّل الأحداث الموثوقة إلى رسائل قوالب Meta عبر Durable Queue وعامل مستقل. كل إرسال يعيد فحص الاشتراك والاتصال والموافقة وOpt-out قبل الاتصال بـMeta.</p></div><Link href="/dashboard/whatsapp" className="rounded-xl border px-3 py-2 text-xs font-black text-[#5d49cc]">مركز واتساب</Link></header>
    {params.create || params.operation ? <p aria-live="polite" className={`rounded-2xl p-3 text-xs font-bold ${(params.create === "complete" || operationSucceeded) ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{params.create === "complete" ? "أُنشئت الأتمتة كمسودة. راجع إعدادها ثم فعّلها صراحة." : operationSucceeded ? `تم تنفيذ ${params.operation} بأمان.` : "تعذرت العملية؛ تحقق من القالب المعتمد والرقم المتصل والحالة الحالية."}</p> : null}
    <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <form action={createWhatsAppAutomationAction} className="rounded-[24px] border bg-white p-5"><h2 className="font-black text-[#20264f]">إنشاء أتمتة</h2><p className="mt-2 text-xs leading-6 text-slate-500">تُنشأ كمسودة ولا تبدأ الإرسال حتى تفعيلها. الربط بالرقم يُشتق خادميًا من القالب ولا يؤخذ من المتصفح.</p><label className="mt-4 block text-xs font-bold">اسم الأتمتة<input name="name" required maxLength={120} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="مثال: تذكير الموعد قبل يوم" /></label><label className="mt-3 block text-xs font-bold">نوع الحدث<select name="triggerType" required className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">اختر الحدث</option>{WHATSAPP_AUTOMATION_TRIGGER_TYPES.map((trigger) => <option key={trigger} value={trigger}>{triggerLabels[trigger]}</option>)}</select></label><label className="mt-3 block text-xs font-bold">حالة الطلب المستهدفة (مطلوبة لتحديث الطلب)<select name="orderStatus" className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">لا ينطبق</option>{WHATSAPP_ORDER_EVENT_STATUSES.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></label><label className="mt-3 block text-xs font-bold">وقت تذكير الموعد (مطلوب لتذكير الموعد)<select name="reminderLeadMinutes" defaultValue={1440} className="mt-1 h-11 w-full rounded-xl border px-3">{WHATSAPP_APPOINTMENT_LEAD_MINUTES.map((minutes) => <option key={minutes} value={minutes}>{leadLabels[minutes]}</option>)}</select></label><label className="mt-3 block text-xs font-bold">قالب Meta المعتمد<select name="templateId" required className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">اختر القالب</option>{eligibleTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.language} · {template.connection.verifiedName || template.connection.displayPhoneNumber || "رقم Meta"}</option>)}</select></label><label className="mt-3 block text-xs font-bold">فترة منع التكرار بالدقائق<input name="cooldownMinutes" type="number" required min={0} max={525600} step={1} defaultValue={1440} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><button disabled={!eligibleTemplates.length} className="mt-4 min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-xs font-black text-white disabled:bg-slate-300">إنشاء كمسودة</button>{!eligibleTemplates.length ? <p className="mt-3 text-xs font-bold text-amber-700">يلزم رقم Meta متصل وقالب Approved بلا متغيرات. مزامنة القوالب متاحة من قسم قوالب Meta.</p> : null}</form>
      <aside className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-xs leading-7 text-amber-950"><b className="text-sm">حدود التشغيل الحالية</b><p className="mt-2">التفعيل يجعل الأتمتة تستقبل الأحداث الجديدة فقط؛ لا يُنشئ موافقات ولا يعيد إرسال أحداث قديمة تلقائيًا. الترحيب يعمل عند تسجيل موافقة صريحة جديدة في استيراد جهات الاتصال، والمتابعة تعمل بعد اكتمال طلب أو حجز.</p><p className="mt-2">تذكير الموعد يُجدول عند تأكيد الحجز فقط، ولا يُرسل إذا كان وقت التذكير قد فات. إلغاء الحجز أو إكماله أو تسجيل عدم الحضور يعطّل أحداث ووظائف التذكير غير المرسلة. هذه الواجهة تقبل القوالب بلا متغيرات حاليًا حتى يتوفر Workflow mapping صريح.</p><p className="mt-2 font-black">قد تترتب رسوم Meta فعلية عند وصول حدث مؤهل والعامل مفعل. وجود Customer أو Order أو Booking لا يُعد موافقة تسويقية.</p></aside>
    </section>
    <section className="space-y-3">{automations.map((automation) => { const template = templatesById.get(templateIdFromConfig(automation.actionConfig) || ""); const lastRun = automation.runs[0]; const nextEvent = automation.events[0]; const detail = triggerDetail(automation.triggerType, automation.triggerConfig); return <article key={automation.id} className="rounded-[24px] border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><b className="text-[#20264f]">{automation.name}</b><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${automation.status === "active" ? "bg-emerald-50 text-emerald-700" : automation.status === "paused" ? "bg-amber-50 text-amber-700" : "bg-[#f2eeff] text-[#6543ce]"}`}>{statusLabels[automation.status] || automation.status}</span></div><span className="mt-1 block text-xs text-slate-400">{triggerLabels[automation.triggerType as keyof typeof triggerLabels] || automation.triggerType}{detail ? ` (${detail})` : ""} · {template ? `${template.name} · ${template.language}` : "القالب غير متاح"} · {automation.connection.verifiedName || automation.connection.displayPhoneNumber || "رقم Meta"}</span></div><div className="flex flex-wrap gap-2">{automation.status === "draft" ? <AutomationButton id={automation.id} operation="activate" label="تفعيل" confirm /> : null}{automation.status === "active" ? <AutomationButton id={automation.id} operation="pause" label="إيقاف مؤقت" /> : null}{automation.status === "paused" ? <AutomationButton id={automation.id} operation="resume" label="استئناف" confirm /> : null}</div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"><Mini label="فترة المنع" value={`${automation.cooldownMinutes} دقيقة`} /><Mini label="أحداث مجدولة" value={String(automation._count.events)} /><Mini label="الموعد التالي" value={nextEvent ? nextEvent.nextAttemptAt.toLocaleString("ar-SA") : "لا يوجد"} /><Mini label="مرات التشغيل" value={String(automation._count.runs)} /><Mini label="وظائف الإرسال" value={String(automation._count.jobs)} /></div>{lastRun ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-500">آخر تشغيل: {lastRun.status} · {lastRun.createdAt.toLocaleString("ar-SA")}{lastRun.skipReason ? ` · ${lastRun.skipReason}` : ""}</p> : null}</article>; })}{!automations.length ? <div className="rounded-[24px] border border-dashed bg-white p-10 text-center text-sm text-slate-400"><Activity className="mx-auto mb-2 h-7 w-7" />لا توجد أتمتة بعد.</div> : null}</section>
  </div>;
}

function AutomationButton({ id, operation, label, confirm = false }: { id: string; operation: "activate" | "pause" | "resume"; label: string; confirm?: boolean }) {
  const className = `inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[10px] font-black ${operation === "pause" ? "bg-amber-50 text-amber-700" : "bg-[#f2eeff] text-[#6543ce]"}`;
  const icon = operation === "pause" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />;
  return <form action={operateWhatsAppAutomationAction}><input type="hidden" name="automationId" value={id} /><input type="hidden" name="operation" value={operation} />{confirm ? <ConfirmSubmitButton label={label} showIcon={false} className={className} confirmMessage="التفعيل يسمح بإدراج رسائل قالب Meta في الطابور عند وصول أحداث مؤهلة وقد تترتب رسوم Meta. هل تؤكد أن الإرسال سيقتصر على أصحاب الموافقة الصريحة؟" /> : <button className={className}>{icon}{label}</button>}</form>;
}

function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#faf9fd] p-2 text-center"><span className="block text-[9px] text-slate-400">{label}</span><b className="text-xs text-[#20264f]">{value}</b></div>; }
