import { Prisma } from "@prisma/client";
import { BellRing, CalendarClock, CheckCircle2, CirclePause, Clock3, MessageCircleMore, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cancelSmartReminderAction, completeSmartReminderAction, pauseSmartReminderAction, rescheduleSmartReminderAction, resumeSmartReminderAction, snoozeSmartReminderAction, updateSmartReminderAction } from "../../actions/smart-reminders";
import { db } from "../../lib/db";
import { reminderTemplateSupportsBodyParameter } from "../../lib/reminders/domain";
import { hasActiveWhatsAppMarketingEntitlement } from "../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../lib/whatsapp/rbac";
import { SmartReminderCreateForm } from "../../../components/dashboard/smart-reminder-create-form";

type ReminderRow = {
  id: string; title: string; body: string; timezone: string; scheduledAt: Date; nextOccurrenceAt: Date | null; status: string; createdAt: Date;
  deliveryStatus: string | null; sentAt: Date | null; failedAt: Date | null;
};

const statusLabel: Record<string, string> = { scheduled: "قادم", paused: "متوقف مؤقتًا", completed: "مكتمل", cancelled: "ملغى" };
const deliveryLabel: Record<string, string> = { queued: "بانتظار الإرسال", processing: "جارٍ الإرسال", retry_scheduled: "سيُعاد الإرسال", sent: "تم الإرسال", failed: "تعذر الإرسال", delivery_unknown: "حالة الإرسال غير مؤكدة", cancelled: "أُلغي الإرسال" };

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

function Notice({ params }: { params: Record<string, string | undefined> }) {
  const values = Object.entries(params).filter(([, value]) => value);
  if (!values.length) return null;
  const success = values.some(([, value]) => value === "success");
  const busy = values.some(([, value]) => value === "busy");
  const invalidTime = values.some(([, value]) => value === "invalid-time");
  const text = success ? "تم تحديث التذكير بنجاح." : busy ? "الإشعار قيد الإرسال الآن؛ لم نغيّر التذكير حتى لا تحدث نتيجة مزدوجة." : invalidTime ? "الوقت المختار غير صالح في المنطقة الزمنية المحددة. اختر وقتًا آخر." : "تعذر تنفيذ العملية. لم تُجرَ تغييرات غير مؤكدة.";
  return <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-bold ${success ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-900"}`}>{text}</div>;
}

export default async function SmartRemindersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("automation.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  const entitled = await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId });
  if (!entitled) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;

  const [business, templates, reminders] = await Promise.all([
    db.business.findFirst({ where: { id: context.businessId, deletedAt: null }, select: { whatsapp: true, phone: true } }),
    db.whatsAppTemplate.findMany({
      where: { businessId: context.businessId, provider: "meta", status: "approved", connection: { businessId: context.businessId, provider: "meta", status: "connected" } },
      select: { id: true, components: true, updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 50,
    }),
    db.$queryRaw<ReminderRow[]>(Prisma.sql`
      SELECT r."id", r."title", r."body", r."timezone", r."scheduledAt", r."nextOccurrenceAt", r."status", r."createdAt",
             d."status" AS "deliveryStatus", d."sentAt", d."failedAt"
      FROM "SmartReminder" r
      LEFT JOIN LATERAL (
        SELECT "status", "sentAt", "failedAt" FROM "SmartReminderDelivery"
        WHERE "businessId" = r."businessId" AND "reminderId" = r."id"
        ORDER BY "createdAt" DESC LIMIT 1
      ) d ON TRUE
      WHERE r."businessId" = ${context.businessId}
      ORDER BY COALESCE(r."nextOccurrenceAt", r."scheduledAt") ASC, r."createdAt" DESC
      LIMIT 200
    `),
  ]);

  const runnableTemplate = templates.find((template) => reminderTemplateSupportsBodyParameter(template.components)) ?? null;
  const todayKeyByTimezone = new Map<string, string>();
  const isToday = (reminder: ReminderRow) => {
    if (!todayKeyByTimezone.has(reminder.timezone)) todayKeyByTimezone.set(reminder.timezone, dateKey(new Date(), reminder.timezone));
    return dateKey(reminder.scheduledAt, reminder.timezone) === todayKeyByTimezone.get(reminder.timezone);
  };
  const tab = ["today", "upcoming", "completed", "cancelled"].includes(params.tab ?? "") ? params.tab! : "upcoming";
  const filtered = reminders.filter((reminder) => {
    if (tab === "today") return ["scheduled", "paused"].includes(reminder.status) && isToday(reminder);
    if (tab === "completed") return reminder.status === "completed";
    if (tab === "cancelled") return reminder.status === "cancelled";
    return ["scheduled", "paused"].includes(reminder.status);
  });
  const counts = {
    today: reminders.filter((item) => ["scheduled", "paused"].includes(item.status) && isToday(item)).length,
    upcoming: reminders.filter((item) => ["scheduled", "paused"].includes(item.status)).length,
    completed: reminders.filter((item) => item.status === "completed").length,
    cancelled: reminders.filter((item) => item.status === "cancelled").length,
  };

  return <div dir="rtl" className="space-y-6 pb-10">
    <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[#07181b] p-6 text-white shadow-sm sm:p-7">
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#00d8c6]/15 blur-3xl" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><div className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-[.16em] text-[#4ee7d4]"><BellRing className="h-4 w-4"/>INFRO SMART REMINDERS</div><h1 className="text-2xl font-black sm:text-3xl">تذكيرات أعمالك الذكية</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">اكتب ما تريد تذكّره وحدد الموعد. INFRO يتولى جدولة الإشعار وإرساله عبر واتساب المرتبط بحسابك مع سجل حالة واضح.</p></div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold text-[#a8f2e8]"><ShieldCheck className="h-4 w-4"/>مخصص لتنبيه حسابك فقط</div>
      </div>
    </header>

    <Notice params={params} />

    <section className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9fbf8] text-[#009d93]"><CalendarClock className="h-5 w-5"/></div><div><h2 className="font-black text-slate-900">إضافة تذكير</h2><p className="mt-1 text-xs text-slate-500">الإصدار الحالي يدعم التذكير لمرة واحدة بأمان. التكرار الدوري سيظهر بعد اكتمال محرك التكرار الزمني.</p></div></div>
      {runnableTemplate ? <SmartReminderCreateForm templateId={runnableTemplate.id} recipientLabel={masked(business?.whatsapp ?? business?.phone ?? null)} /> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><p className="font-black">يلزم قالب إشعار معتمد قبل إنشاء أول تذكير.</p><p className="mt-1 text-xs">لا نرسل نصوصًا خارج المسار الرسمي. أنشئ أو مزامن قالب إشعار يحتوي على متغير نص واحد، ثم ستصبح الإضافة متاحة تلقائيًا.</p><Link href="/dashboard/whatsapp/templates" className="mt-3 inline-flex rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-black">إدارة قوالب واتساب</Link></div>}
    </section>

    <section className="space-y-4">
      <nav aria-label="حالات التذكيرات" className="grid grid-cols-2 gap-2 rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm sm:grid-cols-4">
        {([['today','اليوم'],['upcoming','القادمة'],['completed','المكتملة'],['cancelled','الملغاة']] as const).map(([key,label]) => <Link key={key} href={`/dashboard/reminders?tab=${key}`} className={`rounded-2xl px-3 py-3 text-center text-xs font-black transition ${tab === key ? "bg-[#07181b] text-white" : "text-slate-500 hover:bg-slate-50"}`}>{label}<span className={`mr-2 rounded-full px-2 py-0.5 text-[10px] ${tab === key ? "bg-white/10" : "bg-slate-100"}`}>{counts[key]}</span></Link>)}
      </nav>

      <div className="space-y-3">
        {filtered.map((reminder) => <article key={reminder.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-black text-slate-900">{reminder.title}</h3><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{statusLabel[reminder.status] ?? reminder.status}</span>{reminder.deliveryStatus ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${reminder.deliveryStatus === "sent" ? "bg-emerald-50 text-emerald-700" : reminder.deliveryStatus === "failed" || reminder.deliveryStatus === "delivery_unknown" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}>{deliveryLabel[reminder.deliveryStatus] ?? "حالة الإشعار"}</span> : null}</div><p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-slate-600">{reminder.body}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>{dateText(reminder.scheduledAt, reminder.timezone)}</span><span>{reminder.timezone}</span></div></div>
            {["scheduled","paused"].includes(reminder.status) ? <div className="flex shrink-0 flex-wrap gap-2">
              {reminder.status === "scheduled" && reminder.nextOccurrenceAt ? <form action={pauseSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id}/><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600"><CirclePause className="h-3.5 w-3.5"/>إيقاف</button></form> : null}
              {reminder.status === "paused" ? <form action={resumeSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id}/><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600"><RotateCcw className="h-3.5 w-3.5"/>استئناف</button></form> : null}
              <form action={completeSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id}/><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-emerald-200 px-3 text-xs font-black text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5"/>إكمال</button></form>
              <form action={cancelSmartReminderAction}><input type="hidden" name="reminderId" value={reminder.id}/><button className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-rose-200 px-3 text-xs font-black text-rose-700"><XCircle className="h-3.5 w-3.5"/>إلغاء</button></form>
            </div> : null}
          </div>

          {["scheduled","paused"].includes(reminder.status) ? <details className="mt-4 border-t border-slate-100 pt-4"><summary className="cursor-pointer text-xs font-black text-[#008f87]">تعديل أو إعادة جدولة</summary><div className="mt-4 grid gap-4 lg:grid-cols-2">
            <form action={updateSmartReminderAction} className="space-y-3 rounded-2xl bg-slate-50 p-4"><input type="hidden" name="reminderId" value={reminder.id}/><p className="text-xs font-black text-slate-700">تعديل المحتوى</p><input name="title" defaultValue={reminder.title} required maxLength={160} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"/><textarea name="body" defaultValue={reminder.body} required maxLength={2000} rows={3} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"/><button className="rounded-xl bg-[#07181b] px-4 py-2 text-xs font-black text-white">حفظ التعديل</button></form>
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4"><form action={rescheduleSmartReminderAction} className="space-y-3"><input type="hidden" name="reminderId" value={reminder.id}/><input type="hidden" name="timezone" value={reminder.timezone}/><p className="text-xs font-black text-slate-700">موعد جديد</p><input type="datetime-local" name="scheduledLocal" required defaultValue={localInput(reminder.scheduledAt, reminder.timezone)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"/><button className="rounded-xl bg-[#07181b] px-4 py-2 text-xs font-black text-white">إعادة الجدولة</button></form><div className="border-t border-slate-200 pt-3"><p className="mb-2 text-[10px] font-black text-slate-400">غفوة سريعة</p><div className="flex flex-wrap gap-2">{[[10,"10 دقائق"],[30,"30 دقيقة"],[60,"ساعة"],[1440,"غدًا"]].map(([minutes,label]) => <form action={snoozeSmartReminderAction} key={minutes}><input type="hidden" name="reminderId" value={reminder.id}/><input type="hidden" name="minutes" value={minutes}/><button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600">{label}</button></form>)}</div></div></div>
          </div></details> : null}
        </article>)}
        {!filtered.length ? <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-5 py-12 text-center"><BellRing className="mx-auto h-7 w-7 text-slate-300"/><p className="mt-3 text-sm font-black text-slate-700">لا توجد تذكيرات في هذه الحالة</p><p className="mt-1 text-xs text-slate-400">عند إضافة تذكير سيظهر هنا مع حالته وسجل إرساله.</p></div> : null}
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4"><MessageCircleMore className="h-5 w-5 text-[#009d93]"/><p className="mt-3 text-xs font-black text-slate-800">قناة رسمية</p><p className="mt-1 text-xs leading-6 text-slate-500">الإرسال يمر عبر اتصال واتساب الرسمي والقالب المعتمد.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><ShieldCheck className="h-5 w-5 text-[#009d93]"/><p className="mt-3 text-xs font-black text-slate-800">بدون إرسال عشوائي</p><p className="mt-1 text-xs leading-6 text-slate-500">المستلم مقيد برقم النشاط المسجل ويعاد التحقق منه وقت الإرسال.</p></div><div className="rounded-2xl border border-slate-200 bg-white p-4"><Clock3 className="h-5 w-5 text-[#009d93]"/><p className="mt-3 text-xs font-black text-slate-800">وقت موثوق</p><p className="mt-1 text-xs leading-6 text-slate-500">كل تذكير يحتفظ بمنطقته الزمنية ويُخزن موعد الإرسال بصورة مستقلة عن السيرفر.</p></div></section>
  </div>;
}
