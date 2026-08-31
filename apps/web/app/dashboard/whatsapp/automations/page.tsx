import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Pause, Play, Workflow } from "lucide-react";
import { createWhatsAppAutomationAction, operateWhatsAppAutomationAction } from "../../../actions/whatsapp-marketing";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { db } from "../../../lib/db";
import { readAutomationTriggerConfig, readTemplateActionConfig, templateHasVariables, WHATSAPP_ABANDONED_CART_DELAY_MINUTES, WHATSAPP_APPOINTMENT_LEAD_MINUTES, WHATSAPP_AUTOMATION_TRIGGER_TYPES, WHATSAPP_CONFIGURABLE_TRIGGER_TYPES, WHATSAPP_INACTIVE_CUSTOMER_DAYS, WHATSAPP_ORDER_EVENT_STATUSES } from "../../../lib/whatsapp/automation-domain";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { AutomationApiKeyManager } from "./automation-api-key-manager";

const triggerLabels: Record<(typeof WHATSAPP_AUTOMATION_TRIGGER_TYPES)[number], string> = {
  welcome: "ترحيب بعد موافقة صريحة",
  appointment_reminder: "تذكير موعد",
  follow_up: "متابعة",
  order_update: "تحديث طلب",
  inactive_customer: "عميل غير نشط",
  abandoned_cart: "سلة متروكة",
  api_event: "حدث من نظامك عبر API",
};

const statusLabels: Record<string, string> = { draft: "مسودة", active: "نشطة", paused: "متوقفة مؤقتًا", archived: "مؤرشفة" };
const runStatusLabels: Record<string, string> = { completed: "اكتمل", skipped: "لم يحتج إلى إرسال", failed: "تعذر الإكمال", running: "قيد التنفيذ", pending: "بانتظار التنفيذ" };
const operationLabels: Record<string, string> = { activate: "تفعيل الأتمتة", pause: "إيقاف الأتمتة مؤقتًا", resume: "استئناف الأتمتة" };
const orderStatusLabels: Record<string, string> = { pending: "طلب جديد", confirmed: "تم التأكيد", processing: "قيد التنفيذ", completed: "مكتمل", cancelled: "ملغي" };
const leadLabels: Record<number, string> = { 30: "قبل 30 دقيقة", 60: "قبل ساعة", 180: "قبل 3 ساعات", 1440: "قبل يوم", 2880: "قبل يومين", 10080: "قبل أسبوع" };
const inactiveLabels: Record<number, string> = { 30: "بعد 30 يومًا", 60: "بعد 60 يومًا", 90: "بعد 90 يومًا", 180: "بعد 180 يومًا", 365: "بعد سنة" };
const cartDelayLabels: Record<number, string> = { 15: "بعد 15 دقيقة", 30: "بعد 30 دقيقة", 60: "بعد ساعة", 180: "بعد 3 ساعات", 360: "بعد 6 ساعات", 1440: "بعد يوم" };
const configurableTriggers = new Set<string>(WHATSAPP_CONFIGURABLE_TRIGGER_TYPES);

function templateIdFromConfig(value: unknown) {
  try { return readTemplateActionConfig(value).templateId; } catch { return null; }
}

function triggerDetail(triggerType: string, triggerConfig: unknown) {
  try {
    const config = readAutomationTriggerConfig(triggerConfig, triggerType);
    if (triggerType === "appointment_reminder" && "leadMinutes" in config && typeof config.leadMinutes === "number") return leadLabels[config.leadMinutes] || `قبل ${config.leadMinutes} دقيقة`;
    if (triggerType === "inactive_customer" && "inactiveDays" in config && typeof config.inactiveDays === "number") return inactiveLabels[config.inactiveDays] || `بعد ${config.inactiveDays} يومًا`;
    if (triggerType === "abandoned_cart" && "delayMinutes" in config && typeof config.delayMinutes === "number") return cartDelayLabels[config.delayMinutes] || `بعد ${config.delayMinutes} دقيقة`;
    if (triggerType === "api_event" && "eventName" in config && typeof config.eventName === "string") return config.eventName;
    if (triggerType !== "order_update") return null;
    return "orderStatuses" in config && Array.isArray(config.orderStatuses) ? config.orderStatuses.map((status) => orderStatusLabels[status] || status).join("، ") : null;
  } catch { return "إعداد الحدث يحتاج مراجعة"; }
}

export default async function WhatsAppAutomationsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("automation.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const [templates, automations, apiKeys] = await Promise.all([
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
    db.whatsAppAutomationApiKey.findMany({
      where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, name: true, keyPrefix: true, status: true, createdAt: true, lastUsedAt: true, revokedAt: true },
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
    <header className="rounded-[24px] border bg-white p-5"><div className="flex items-center gap-2"><Workflow className="h-5 w-5 text-[#6543ce]" /><h1 className="text-xl font-black text-[#20264f]">أتمتة واتساب</h1></div><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">أرسل رسائل تلقائية عند حدوث مواعيد أو طلبات أو سلال متروكة أو أحداث من نظامك. قبل كل إرسال نتحقق من صلاحية الرقم والقالب وموافقة العميل وعدم إلغائه الاشتراك.</p></header>
    {params.create || params.operation ? <p aria-live="polite" className={`rounded-2xl p-3 text-xs font-bold ${(params.create === "complete" || operationSucceeded) ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{params.create === "complete" ? "أُنشئت الأتمتة كمسودة. راجع إعدادها ثم فعّلها عندما تكون جاهزًا." : operationSucceeded ? `تم ${operationLabels[params.operation || ""] || "تحديث الأتمتة"} بنجاح.` : "تعذرت العملية؛ تحقق من القالب المعتمد والرقم المتصل والحالة الحالية."}</p> : null}
    <section className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
      <form action={createWhatsAppAutomationAction} className="rounded-[24px] border bg-white p-5"><h2 className="font-black text-[#20264f]">إنشاء أتمتة</h2><p className="mt-2 text-xs leading-6 text-slate-500">تُحفظ أولًا كمسودة، ولن يبدأ أي إرسال حتى تراجعها وتفعّلها بنفسك.</p><label className="mt-4 block text-xs font-bold">اسم الأتمتة<input name="name" required maxLength={120} className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="مثال: تذكير الموعد قبل يوم" /></label><label className="mt-3 block text-xs font-bold">نوع الحدث<select name="triggerType" required className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">اختر الحدث</option>{WHATSAPP_AUTOMATION_TRIGGER_TYPES.map((trigger) => <option key={trigger} value={trigger} disabled={!configurableTriggers.has(trigger)}>{triggerLabels[trigger]}{configurableTriggers.has(trigger) ? "" : " — غير متاح بعد"}</option>)}</select></label><label className="mt-3 block text-xs font-bold">اسم الحدث في نظامك (لأحداث API فقط)<input name="apiEventName" maxLength={64} pattern="[a-z][a-z0-9_.:-]{0,63}" dir="ltr" className="mt-1 h-11 w-full rounded-xl border px-3" placeholder="order.ready" /></label><label className="mt-3 block text-xs font-bold">حالة الطلب المستهدفة<select name="orderStatus" className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">لا ينطبق</option>{WHATSAPP_ORDER_EVENT_STATUSES.map((status) => <option key={status} value={status}>{orderStatusLabels[status]}</option>)}</select></label><label className="mt-3 block text-xs font-bold">وقت تذكير الموعد<select name="reminderLeadMinutes" defaultValue={1440} className="mt-1 h-11 w-full rounded-xl border px-3">{WHATSAPP_APPOINTMENT_LEAD_MINUTES.map((minutes) => <option key={minutes} value={minutes}>{leadLabels[minutes]}</option>)}</select></label><label className="mt-3 block text-xs font-bold">مدة عدم نشاط العميل<select name="inactiveDays" defaultValue={90} className="mt-1 h-11 w-full rounded-xl border px-3">{WHATSAPP_INACTIVE_CUSTOMER_DAYS.map((days) => <option key={days} value={days}>{inactiveLabels[days]}</option>)}</select></label><label className="mt-3 block text-xs font-bold">مهلة السلة المتروكة قبل الإرسال<select name="cartDelayMinutes" defaultValue={60} className="mt-1 h-11 w-full rounded-xl border px-3">{WHATSAPP_ABANDONED_CART_DELAY_MINUTES.map((minutes) => <option key={minutes} value={minutes}>{cartDelayLabels[minutes]}</option>)}</select></label><label className="mt-3 block text-xs font-bold">القالب المعتمد<select name="templateId" required className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">اختر القالب</option>{eligibleTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.language} · {template.connection.verifiedName || template.connection.displayPhoneNumber || "رقم واتساب"}</option>)}</select></label><label className="mt-3 block text-xs font-bold">المدة الدنيا قبل تكرار الرسالة للعميل نفسه (بالدقائق)<input name="cooldownMinutes" type="number" required min={0} max={525600} step={1} defaultValue={1440} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><button disabled={!eligibleTemplates.length} className="mt-4 min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-xs font-black text-white disabled:bg-slate-300">إنشاء كمسودة</button>{!eligibleTemplates.length ? <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">يلزم ربط رقم واتساب وقالب معتمد بلا متغيرات قبل إنشاء الأتمتة. <div className="mt-2 flex flex-wrap gap-2"><Link href="/dashboard/whatsapp/setup" className="rounded-lg border border-amber-200 bg-white px-2 py-1">ربط الرقم</Link><Link href="/dashboard/whatsapp/templates" className="rounded-lg border border-amber-200 bg-white px-2 py-1">مراجعة القوالب</Link></div></div> : null}</form>
      <aside className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-xs leading-7 text-amber-950"><b className="text-sm">كيف تعمل الأتمتة؟</b><p className="mt-2">بعد التفعيل تستجيب الأتمتة للأحداث الجديدة فقط. لا تنشئ موافقة للعميل من تلقاء نفسها ولا تعيد إرسال أحداث قديمة.</p><p className="mt-2">تذكير الموعد يعمل عند تأكيد الحجز، والمتابعة بعد اكتمال طلب أو حجز، والسلة المتروكة بعد مرور المهلة التي تحددها. إذا استعاد العميل سلته أو أكملها قبل الإرسال يُلغى التذكير تلقائيًا.</p><p className="mt-2 font-black">قد تترتب رسوم Meta فعلية عند إرسال رسالة مؤهلة. وجود رقم العميل أو طلب سابق لا يُعد موافقة تسويقية.</p></aside>
    </section>
    <AutomationApiKeyManager keys={apiKeys.map((key) => ({ ...key, createdAt: key.createdAt.toISOString(), lastUsedAt: key.lastUsedAt?.toISOString() ?? null, revokedAt: key.revokedAt?.toISOString() ?? null }))} />
    <section className="space-y-3">{automations.map((automation) => { const template = templatesById.get(templateIdFromConfig(automation.actionConfig) || ""); const lastRun = automation.runs[0]; const nextEvent = automation.events[0]; const detail = triggerDetail(automation.triggerType, automation.triggerConfig); return <article key={automation.id} className="rounded-[24px] border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><b className="text-[#20264f]">{automation.name}</b><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${automation.status === "active" ? "bg-emerald-50 text-emerald-700" : automation.status === "paused" ? "bg-amber-50 text-amber-700" : "bg-[#f2eeff] text-[#6543ce]"}`}>{statusLabels[automation.status] || "تحتاج مراجعة"}</span></div><span className="mt-1 block text-xs text-slate-400">{triggerLabels[automation.triggerType as keyof typeof triggerLabels] || "حدث مخصص"}{detail ? ` (${detail})` : ""} · {template ? `${template.name} · ${template.language}` : "القالب غير متاح"} · {automation.connection.verifiedName || automation.connection.displayPhoneNumber || "رقم واتساب"}</span></div><div className="flex flex-wrap gap-2">{automation.status === "draft" ? <AutomationButton id={automation.id} operation="activate" label="تفعيل" confirm /> : null}{automation.status === "active" ? <AutomationButton id={automation.id} operation="pause" label="إيقاف مؤقت" /> : null}{automation.status === "paused" ? <AutomationButton id={automation.id} operation="resume" label="استئناف" confirm /> : null}</div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5"><Mini label="منع التكرار" value={`${automation.cooldownMinutes} دقيقة`} /><Mini label="رسائل بانتظار موعدها" value={String(automation._count.events)} /><Mini label="الموعد التالي" value={nextEvent ? nextEvent.nextAttemptAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) : "لا يوجد"} /><Mini label="مرات التشغيل" value={String(automation._count.runs)} /><Mini label="محاولات الإرسال" value={String(automation._count.jobs)} /></div>{lastRun ? <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-[10px] text-slate-500">آخر تشغيل: {runStatusLabels[lastRun.status] || "تمت معالجته"} · {lastRun.createdAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}{lastRun.skipReason ? " · لم تُرسل رسالة لأن شروط الإرسال لم تكتمل" : ""}</p> : null}</article>; })}{!automations.length ? <div className="rounded-[24px] border border-dashed bg-white p-10 text-center text-sm text-slate-500"><Activity className="mx-auto mb-2 h-7 w-7 text-slate-300" /><b className="block text-[#303653]">لا توجد أتمتة بعد</b><p className="mx-auto mt-2 max-w-md text-xs leading-6">أنشئ أول أتمتة لتذكير العملاء أو متابعة الطلبات تلقائيًا. ستبقى مسودة حتى تفعّلها بنفسك.</p><Link href="#" className="mt-3 inline-block rounded-xl bg-[#6f3bd2] px-4 py-2 text-xs font-black text-white">ابدأ من النموذج أعلاه</Link></div> : null}</section>
  </div>;
}

function AutomationButton({ id, operation, label, confirm = false }: { id: string; operation: "activate" | "pause" | "resume"; label: string; confirm?: boolean }) {
  const className = `inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[10px] font-black ${operation === "pause" ? "bg-amber-50 text-amber-700" : "bg-[#f2eeff] text-[#6543ce]"}`;
  const icon = operation === "pause" ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />;
  return <form action={operateWhatsAppAutomationAction}><input type="hidden" name="automationId" value={id} /><input type="hidden" name="operation" value={operation} />{confirm ? <ConfirmSubmitButton label={label} showIcon={false} className={className} confirmMessage="التفعيل يسمح بإرسال قوالب Meta عند تحقق الشروط وقد تترتب رسوم Meta. هل تؤكد أن الإرسال سيقتصر على العملاء أصحاب الموافقة الصريحة؟" /> : <button className={className}>{icon}{label}</button>}</form>;
}

function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#faf9fd] p-2 text-center"><span className="block text-[9px] text-slate-400">{label}</span><b className="text-xs text-[#20264f]">{value}</b></div>; }
