import { Prisma } from "@prisma/client";
import { AlertTriangle, BellRing, CalendarClock, CheckCircle2, CirclePause, Clock3, Mail, MessageCircleMore, NotebookPen, Repeat2, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cancelSmartReminderAction, completeSmartReminderAction, pauseSmartReminderAction, rescheduleSmartReminderAction, resumeSmartReminderAction, snoozeSmartReminderAction, updateSmartReminderAction } from "../../actions/smart-reminders";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { reminderTemplateSupportsBodyParameter } from "../../lib/reminders/domain";
import { isSmartRemindersSchemaReady } from "../../lib/reminders/schema-readiness";
import { SmartReminderCreateForm } from "../../../components/dashboard/smart-reminder-create-form";

type ReminderRow = {
  id: string;
  title: string;
  body: string;
  timezone: string;
  scheduledAt: Date;
  nextOccurrenceAt: Date | null;
  recurrenceType: string;
  status: string;
  createdAt: Date;
  deliveryChannels: string[];
  deliveryStatus: string | null;
  deliveryChannel: string | null;
  sentAt: Date | null;
  failedAt: Date | null;
  businessNoteId: string | null;
  businessNoteTitle: string | null;
};

const statusLabel: Record<string, string> = { scheduled: "قادم", paused: "متوقف مؤقتًا", completed: "مكتمل", cancelled: "ملغى" };
const deliveryLabel: Record<string, string> = { queued: "بانتظار الإرسال", processing: "جارٍ الإرسال", retry_scheduled: "سيُعاد الإرسال", sent: "تم الإرسال", failed: "تعذر الإرسال", delivery_unknown: "حالة الإرسال غير مؤكدة", cancelled: "أُلغي الإرسال" };
const recurrenceLabel: Record<string, string> = { once: "مرة واحدة", daily: "يوميًا", weekly: "أسبوعيًا", monthly: "شهريًا" };
const channelLabel: Record<string, string> = { whatsapp: "واتساب", email: "البريد", in_app: "داخل INFRO" };

function dateText(value: Date, timezone: string) {
  try { return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(value); }
  catch { return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(value); }
}
function dateKey(value: Date, timezone: string) {
  try { return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: timezone }).format(value); }
  catch { return ""; }
}
function localInput(value: Date, timezone: string) {
  try {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(value).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
  } catch { return ""; }
}
function masked(value: string | null) {
  if (!value) return "رقم النشاط المسجل";
  const digits = value.replace(/\D/g, "");
  return digits.length > 4 ? `•••• ${digits.slice(-4)}` : "رقم النشاط المسجل";
}
function emailMasked(value: string) {
  const [name, domain] = value.split("@");
  if (!domain) return "بريد الحساب";
  return `${name.slice(0, 2)}•••@${domain}`;
}
function Notice({ params }: { params: Record<string, string | undefined> }) {
  const values = Object.entries(params).filter(([, value]) => value);
  if (!values.length) return null;
  const success = values.some(([, value]) => value === "success");
  const busy = values.some(([, value]) => value === "busy");
  const invalidTime = values.some(([, value]) => value === "invalid-time");
  const channels = values.some(([, value]) => value === "channels-required");
  const waDenied = values.some(([, value]) => value === "whatsapp-access-denied");
  const text = success ? "تم تحديث التذكير بنجاح." : busy ? "الإشعار قيد الإرسال الآن؛ لم نغيّر التذكير حتى لا تحدث نتيجة مزدوجة." : invalidTime ? "الوقت المختار غير صالح في المنطقة الزمنية المحددة. اختر وقتًا آخر." : channels ? "اختر قناة تنبيه واحدة على الأقل." : waDenied ? "لا تملك صلاحية إرسال تذكيرات واتساب لهذا النشاط. يمكنك استخدام البريد أو إشعار INFRO." : "تعذر تنفيذ العملية. لم تُجرَ تغييرات غير مؤكدة.";
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-bold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{text}</div>;
}
function SchemaPending() {
  return <div dir="rtl" className="space-y-6 pb-10" data-reminder-schema="pending"><header className="rounded-[28px] bg-[#07181b] p-6 text-white"><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[#4ee7d4]"><BellRing className="h-4 w-4" />INFRO SMART REMINDERS</div><h1 className="text-2xl font-black">تذكيرات أعمالك الذكية</h1><p className="mt-2 text-sm text-slate-300">بيئة المعاينة لم تُحدّث بعد بمخطط التذكيرات متعدد القنوات.</p></header><section className="rounded-[26px] border border-amber-200 bg-amber-50 p-6 text-amber-950"><h2 className="font-black">التذكيرات متوقفة بأمان في هذه المعاينة</h2><p className="mt-2 text-sm leading-7">لم يتم فقد بيانات أو تنفيذ إرسال. بعد migration المعتمدة ستفتح الوظائف تلقائيًا.</p></section></div>;
}

export default async function SmartRemindersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/dashboard?business=required");
  const params = await searchParams;
  if (!await isSmartRemindersSchemaReady()) return <SchemaPending />;

  const [templates, reminders] = await Promise.all([
    db.whatsAppTemplate.findMany({ where: { businessId: business.id, provider: "meta", status: "approved", connection: { businessId: business.id, provider: "meta", status: "connected" } }, select: { id: true, components: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 50 }),
    db.$queryRaw<ReminderRow[]>(Prisma.sql`
      SELECT r."id", r."title", r."body", r."timezone", r."scheduledAt", r."nextOccurrenceAt", r."recurrenceType", r."status", r."createdAt", r."deliveryChannels",
        d."status" AS "deliveryStatus", d."channel" AS "deliveryChannel", d."sentAt", d."failedAt",
        r."businessNoteId", n."title" AS "businessNoteTitle"
      FROM "SmartReminder" r
      LEFT JOIN "BusinessNote" n ON n."id" = r."businessNoteId" AND n."businessId" = r."businessId"
      LEFT JOIN LATERAL (
        SELECT "status", "channel", "sentAt", "failedAt"
        FROM "SmartReminderDelivery"
        WHERE "businessId" = r."businessId" AND "reminderId" = r."id"
        ORDER BY "createdAt" DESC LIMIT 1
      ) d ON TRUE
      WHERE r."businessId" = ${business.id}
      ORDER BY COALESCE(r."nextOccurrenceAt", r."scheduledAt") ASC, r."createdAt" DESC
      LIMIT 200
    `),
  ]);

  const runnableTemplate = templates.find((template) => reminderTemplateSupportsBodyParameter(template.components)) ?? null;
  const whatsAppAvailable = Boolean(runnableTemplate && (business.whatsapp || business.phone));
  const now = new Date();
  const todayKeyByTimezone = new Map<string, string>();
  const occurrence = (reminder: ReminderRow) => reminder.nextOccurrenceAt ?? reminder.scheduledAt;
  const isToday = (reminder: ReminderRow) => {
    if (!todayKeyByTimezone.has(reminder.timezone)) todayKeyByTimezone.set(reminder.timezone, dateKey(now, reminder.timezone));
    return dateKey(occurrence(reminder), reminder.timezone) === todayKeyByTimezone.get(reminder.timezone);
  };
  const isOverdue = (reminder: ReminderRow) => reminder.status === "scheduled" && Boolean(reminder.nextOccurrenceAt) && occurrence(reminder).getTime() < now.getTime();
  const needsAttention = (reminder: ReminderRow) => ["failed", "delivery_unknown"].includes(reminder.deliveryStatus ?? "");
  const allowedTabs = ["today", "upcoming", "overdue", "paused", "attention", "completed", "cancelled"];
  const tab = allowedTabs.includes(params.tab ?? "") ? params.tab! : "upcoming";
  const filtered = reminders.filter((reminder) => {
    if (tab === "today") return ["scheduled", "paused"].includes(reminder.status) && isToday(reminder);
    if (tab === "overdue") return isOverdue(reminder);
    if (tab === "paused") return reminder.status === "paused";
    if (tab === "attention") return needsAttention(reminder);
    if (tab === "completed") return reminder.status === "completed";
    if (tab === "cancelled") return reminder.status === "cancelled";
    return reminder.status === "scheduled" && !isOverdue(reminder);
  });
  const counts = {
    today: reminders.filter((item) => ["scheduled", "paused"].includes(item.status) && isToday(item)).length,
    upcoming: reminders.filter((item) => item.status === "scheduled" && !isOverdue(item)).length,
    overdue: reminders.filter(isOverdue).length,
    paused: reminders.filter((item) => item.status === "paused").length,
    attention: reminders.filter(needsAttention).length,
    completed: reminders.filter((item) => item.status === "completed").length,
    cancelled: reminders.filter((item) => item.status === "cancelled").length,
  };
  const tabs = [["today", "اليوم"], ["upcoming", "القادمة"], ["overdue", "المتأخرة"], ["paused", "المتوقفة"], ["attention", "تحتاج إجراء"], ["completed", "المكتملة"], ["cancelled", "الملغاة"]] as const;

  return <div dir="rtl" className="space-y-6 pb-10">
    <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#07181b] p-6 text-white shadow-sm sm:p-7"><div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#00d8c6]/15 blur-3xl" /><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[#4ee7d4]"><BellRing className="h-4 w-4" />INFRO SMART REMINDERS</div><h1 className="text-2xl font-black sm:text-3xl">تذكيرات أعمالك الذكية</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">اعرف ما عليك اليوم، ما تأخر، وما يحتاج إجراء منك — ثم جدول التذكير بالقناة المناسبة.</p></div><div className="flex flex-wrap gap-2"><Link href="/dashboard/notifications" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-[#a8f2e8]">مركز الإشعارات</Link><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-[#a8f2e8]"><ShieldCheck className="h-4 w-4" />قنوات اختيارية لكل تذكير</div></div></div></header>
    <Notice params={params} />
    {counts.attention > 0 || counts.overdue > 0 ? <section className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-amber-950"><div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-black">NEXT ACTION</p><p className="mt-1 text-sm leading-7">لديك {counts.overdue} تذكير متأخر و{counts.attention} حالة إرسال تحتاج مراجعة. ابدأ من تبويب «تحتاج إجراء» ثم أعد الجدولة أو صحح قناة الإرسال قبل المحاولة التالية.</p></div></div></section> : null}
    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9fbf8] text-[#009d93]"><CalendarClock className="h-5 w-5" /></div><div><h2 className="font-black text-slate-900">إضافة تذكير</h2><p className="mt-1 text-xs text-slate-500">مرة واحدة أو متكرر، مع قنوات تنبيه تختارها بنفسك.</p></div></div><SmartReminderCreateForm templateId={runnableTemplate?.id} recipientLabel={masked(business.whatsapp ?? business.phone ?? null)} emailLabel={emailMasked(user.email)} whatsAppAvailable={whatsAppAvailable} />{!whatsAppAvailable ? <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-6 text-sky-900"><b>واتساب غير جاهز حاليًا، لكن التذكيرات لا تتوقف.</b> استخدم البريد أو إشعار INFRO الآن، ويمكن تفعيل واتساب لاحقًا. <Link href="/dashboard/whatsapp/setup" className="font-black underline">إعداد واتساب</Link></div> : null}</section>
    <section className="space-y-4"><nav aria-label="حالات التذكيرات" className="grid grid-cols-2 gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4 lg:grid-cols-7">{tabs.map(([key, label]) => <Link key={key} href={`/dashboard/reminders?tab=${key}`} className={`rounded-2xl px-3 py-3 text-center text-xs font-black ${tab === key ? "bg-[#07181b] text-white" : "text-slate-500 hover:bg-slate-50"}`}>{label}<span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] ${tab === key ? "bg-white/10" : "bg-slate-100"}`}>{counts[key]}</span></Link>)}</nav><div className="space-y-3">{filtered.map((reminder) => { const displayOccurrence = occurrence(reminder); const overdue = isOverdue(reminder); const attention = needsAttention(reminder); return <article key={reminder.id} className={`rounded-[24px] border bg-white p-5 shadow-sm ${attention ? "border-amber-300" : overdue ? "border-rose-200" : "border-slate-200"}`}><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-black text-slate-900">{reminder.title}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{overdue ? "متأخر" : statusLabel[reminder.status] ?? reminder.status}</span><span className="inline-flex items-center gap-1 rounded-full bg-[#edfafa] px-2.5 py-1 text-[10px] font-black text-[#007f78]"><Repeat2 className="h-3 w-3" />{recurrenceLabel[reminder.recurrenceType] ?? reminder.recurrenceType}</span>{reminder.deliveryChannels.map((channel) => <span key={channel} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700">{channelLabel[channel] ?? channel}</span>)}{reminder.deliveryStatus ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${attention ? "bg-amber-100 text-amber-900" : "bg-slate-50 text-slate-600"}`}>آخر حالة: {channelLabel[reminder.deliveryChannel ?? ""] ?? "الإشعار"} — {deliveryLabel[reminder.deliveryStatus] ?? reminder.deliveryStatus}</span> : null}</div><p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{reminder.body}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{reminder.nextOccurrenceAt ? "الموعد القادم: " : "الموعد: "}{dateText(displayOccurrence, reminder.timezone)}</span><span>{reminder.timezone}</span>{reminder.businessNoteId ? <Link href={`/dashboard/notes?q=${encodeURIComponent(reminder.businessNoteTitle ?? "")}`} className="inline-flex items-center gap-1.5 font-black text-[#008f87]"><NotebookPen className="h-3.5 w-3.5" />فتح المذكرة المرتبطة{reminder.businessNoteTitle ? `: ${reminder.businessNoteTitle}` : ""}</Link> : null}</div>{attention ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-950"><b>NEXT ACTION:</b> راجع القناة وحالة الاتصال ثم أعد الجدولة إذا لزم. لن يتم تجاوز ضوابط Meta أو الموافقة تلقائيًا.</div> : null}</div>{["scheduled", "paused"].includes(reminder.status) ? <div className="flex shrink-0 flex-wrap gap-2">{reminder.status === "scheduled" && reminder.nextOccurrenceAt ? <form action={pauseSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id} /><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600"><CirclePause className="h-3.5 w-3.5" />إيقاف</button></form> : null}{reminder.status === "paused" ? <form action={resumeSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id} /><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600"><RotateCcw className="h-3.5 w-3.5" />استئناف</button></form> : null}<form action={completeSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id} /><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-xs font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />إكمال</button></form><form action={cancelSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id} /><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-700"><XCircle className="h-3.5 w-3.5" />إلغاء</button></form></div> : null}</div>{["scheduled", "paused"].includes(reminder.status) ? <details className="mt-4 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-xs font-black text-[#008f87]">تعديل أو إعادة جدولة</summary><div className="mt-4 grid gap-4 lg:grid-cols-2"><form action={updateSmartReminderAction} className="space-y-3 rounded-2xl bg-slate-50 p-4"><input type="hidden" name="reminderId" value={reminder.id} /><input name="title" defaultValue={reminder.title} required maxLength={160} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><textarea name="body" defaultValue={reminder.body} required maxLength={2000} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><button className="rounded-xl bg-[#07181b] px-4 py-2 text-xs font-black text-white">حفظ التعديل</button></form><div className="space-y-3 rounded-2xl bg-slate-50 p-4"><form action={rescheduleSmartReminderAction} className="space-y-3"><input type="hidden" name="reminderId" value={reminder.id} /><input type="hidden" name="timezone" value={reminder.timezone} /><input type="datetime-local" name="scheduledLocal" required defaultValue={localInput(displayOccurrence, reminder.timezone)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><button className="rounded-xl bg-[#07181b] px-4 py-2 text-xs font-black text-white">إعادة الجدولة</button></form><div className="flex flex-wrap gap-2">{[[10, "10 دقائق"], [30, "30 دقيقة"], [60, "ساعة"], [1440, "غدًا"]].map(([minutes, label]) => <form action={snoozeSmartReminderAction} key={minutes}><input type="hidden" name="reminderId" value={reminder.id} /><input type="hidden" name="minutes" value={minutes} /><button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600">{label}</button></form>)}</div></div></div></details> : null}</article>; })}{!filtered.length ? <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><BellRing className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-black text-slate-700">لا توجد تذكيرات في هذه الحالة</p></div> : null}</div></section>
    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><MessageCircleMore className="h-5 w-5 text-[#009d93]" /><p className="mt-3 text-xs font-black">واتساب الرسمي</p><p className="mt-1 text-xs leading-6 text-slate-500">يبقى عبر Meta والقالب المعتمد والموافقة الخاصة بالتذكير.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><Mail className="h-5 w-5 text-[#009d93]" /><p className="mt-3 text-xs font-black">البريد</p><p className="mt-1 text-xs leading-6 text-slate-500">إلى بريد صاحب الحساب عبر مسار INFRO transactional.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><BellRing className="h-5 w-5 text-[#009d93]" /><p className="mt-3 text-xs font-black">داخل INFRO</p><p className="mt-1 text-xs leading-6 text-slate-500">إشعار دائم محفوظ في حساب العميل حتى تتم قراءته.</p></div></section>
  </div>;
}
