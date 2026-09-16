import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarDays,
  CalendarOff,
  Building2,
  CheckCircle2,
  Clock3,
  Inbox,
  MoonStar,
  Plus,
  Power,
  SunMedium,
  Trash2,
  UsersRound,
} from "lucide-react";
import { db } from "../../lib/db";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import {
  deleteBookingAvailabilityOverrideAction,
  updateWorkingHoursAction,
  updateBookingSlotSettingsAction,
  upsertBookingAvailabilityOverrideAction,
} from "../../actions/working-hours";
import { updateBookingAvailabilityAction } from "../../actions/services";

const days = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
const timeClass = "h-11 min-w-0 rounded-xl border border-slate-200 bg-[#f8fbfb] px-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10";
const fieldClass = "h-11 min-w-0 rounded-xl border border-slate-200 bg-[#f8fbfb] px-3 text-sm font-semibold text-slate-800 outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10";

function riyadhDateKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function shiftDate(date: string, daysToAdd: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + daysToAdd);
  return value.toISOString().slice(0, 10);
}

function displayDate(date: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Riyadh",
  }).format(new Date(`${date}T12:00:00+03:00`));
}

export default async function DashboardWorkingHoursPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const saved = Array.isArray(params.saved) ? params.saved[0] : params.saved;
  const error = Array.isArray(params.error) ? params.error[0] : params.error;
  const activeBusiness = await getOwnedBusinessForRead();
  if (!activeBusiness) redirect("/onboarding");

  const today = riyadhDateKey();
  const business = await db.business.findFirst({
    where: { id: activeBusiness.id, ownerId: activeBusiness.ownerId, deletedAt: null },
    select: {
      id: true,
      bookingAvailable: true,
      bookingSlotMinutes: true,
      bookingCapacity: true,
      branches: {
        where: { isActive: true },
        orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }],
        select: { id: true, name: true, city: true, bookingEnabled: true, bookingSlotMinutes: true, bookingCapacity: true },
      },
      openingHours: { orderBy: { dayOfWeek: "asc" } },
      services: {
        where: { deletedAt: null, isActive: true, bookingEnabled: true },
        select: { id: true },
      },
      bookingAvailabilityOverrides: {
        where: { date: { gte: today } },
        orderBy: { date: "asc" },
        take: 30,
      },
    },
  });
  if (!business) redirect("/onboarding");

  const byDay = new Map(business.openingHours.map((item) => [item.dayOfWeek, item]));
  const configured = days.reduce((count, _day, index) => byDay.has(index) ? count + 1 : count, 0);
  const closedCount = days.reduce((count, _day, index) => (byDay.get(index)?.isClosed ?? (index === 4)) ? count + 1 : count, 0);
  const openCount = 7 - closedCount;
  const bookableCount = business.services.length;
  const ready = business.bookingAvailable && bookableCount > 0 && openCount > 0;

  const errorMessage =
    error === "time"
      ? "تعذر الحفظ. تأكد من إدخال وقت فتح وإغلاق صحيح لكل يوم غير مغلق."
      : error === "window"
        ? "تعذر الحفظ. أكمل الفترة الثانية عند استخدامها وتأكد من عدم تداخل الفترتين."
        : error === "override-date"
          ? "اختر تاريخًا صحيحًا من اليوم وحتى سنة قادمة."
          : error === "override-time"
            ? "أدخل وقت بداية ونهاية صحيحًا للتاريخ المتاح."
            : error === "override-window"
              ? "الفترات الخاصة بهذا التاريخ غير مكتملة أو متداخلة."
              : error === "slot-settings"
                ? "تعذر حفظ الفترات. اختر مدة بين 15 دقيقة و8 ساعات بخطوات ربع ساعة، وسعة بين 1 و500 عميل."
              : null;

  return <div className="space-y-4 pb-24 lg:pb-4">
    <section className="overflow-hidden rounded-[28px] border border-[#153438] bg-[#07181b] text-white shadow-[0_22px_70px_-46px_rgba(7,24,27,.78)]">
      <div className="grid lg:grid-cols-[1fr_340px]">
        <div className="relative p-5 sm:p-7">
          <div className="absolute -left-16 -top-20 h-52 w-52 rounded-full bg-[#00d8c6]/12 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 text-[8px] font-black tracking-[.15em] text-[#66e7d5]" dir="ltr"><CalendarCheck2 className="h-3.5 w-3.5" />INFRO APPOINTMENTS</span>
            <h1 className="mt-3 max-w-2xl text-[25px] font-black leading-tight tracking-tight sm:text-[30px]">المواعيد والحجوزات</h1>
            <p className="mt-2 max-w-xl text-[11px] leading-6 text-slate-400 sm:text-xs">فعّل استقبال المواعيد، اضبط أسبوعك المعتاد، ثم افتح أو أغلق تاريخًا بعينه عند الحاجة. ما تحدده هنا يظهر مباشرة لزائر صفحتك.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 border-t border-white/[.08] bg-white/[.025] lg:border-r lg:border-t-0">
          <HeroStat label="حالة الحجز" value={business.bookingAvailable ? "مفعّل" : "متوقف"} />
          <HeroStat label="خدمات قابلة للحجز" value={bookableCount} />
          <HeroStat label="تواريخ خاصة" value={business.bookingAvailabilityOverrides.length} />
        </div>
      </div>
    </section>

    {saved ? <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700"><CheckCircle2 className="h-4 w-4" />{saved === "override-deleted" ? "تم حذف إعداد التاريخ الخاص." : saved === "override" ? "تم حفظ توفر التاريخ المحدد." : saved === "slots" ? "تم حفظ مدة الفترات وسعة الحجز لكل فرع." : "تم حفظ جدول المواعيد الأسبوعي."}</div> : null}
    {errorMessage ? <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold leading-7 text-rose-700">{errorMessage}</div> : null}

    <section className="grid gap-4 xl:grid-cols-[1fr_1.15fr]">
      <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-48px_rgba(7,24,27,.5)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">BOOKING STATUS</span><h2 className="mt-1 text-base font-black text-slate-950">استقبال الحجوزات</h2><p className="mt-2 text-[10px] leading-5 text-slate-500">لن يظهر زر «حجز موعد» للزائر إلا بعد تفعيل الحجز ووجود خدمة قابلة للحجز ووقت متاح.</p></div>
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${ready ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}><Power className="h-4 w-4" /></span>
        </div>
        <form action={updateBookingAvailabilityAction} className="mt-5 grid gap-2 min-[420px]:grid-cols-[1fr_auto]">
          <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-[#f8fbfb] px-3 text-[11px] font-black text-slate-700"><span>{business.bookingAvailable ? "الحجز متاح للعملاء" : "الحجز متوقف"}</span><input type="checkbox" name="bookingAvailable" defaultChecked={business.bookingAvailable} className="h-5 w-5 accent-[#00a99d]" /></label>
          <button className="h-12 rounded-xl bg-[#07181b] px-5 text-[11px] font-black text-white">حفظ الحالة</button>
        </form>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[9px] font-black">
          <StatusItem done={business.bookingAvailable} label="التفعيل" />
          <StatusItem done={bookableCount > 0} label="الخدمات" />
          <StatusItem done={openCount > 0} label="الأوقات" />
        </div>
      </article>

      <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_18px_60px_-48px_rgba(7,24,27,.5)] sm:p-5">
        <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Inbox className="h-4 w-4" /></span><div><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">APPOINTMENT FLOW</span><h2 className="mt-1 text-base font-black text-slate-950">جهّز رحلة الحجز</h2><p className="mt-2 text-[10px] leading-5 text-slate-500">اختر الخدمات التي تستقبل مواعيد ومدتها، ثم تابع الطلبات المؤكدة والجديدة من صندوق واحد.</p></div></div>
        <div className="mt-5 grid grid-cols-2 gap-2">
          <Link href="/dashboard/services" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#bdebe5] bg-[#effbf9] px-3 text-[10px] font-black text-[#08756e]">إعداد الخدمات <ArrowLeft className="h-3.5 w-3.5" /></Link>
          <Link href="/dashboard/inbox" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-[10px] font-black text-slate-600">عرض الحجوزات <ArrowLeft className="h-3.5 w-3.5" /></Link>
        </div>
        {!bookableCount ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] font-bold leading-5 text-amber-800">لا توجد خدمة مفعّلة للحجز. فعّل «قابلة للحجز» وحدد مدة الخدمة.</p> : null}
      </article>
    </section>

    <form action={updateBookingSlotSettingsAction} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(7,24,27,.5)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#fbfdfd] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><UsersRound className="h-4 w-4" /></span><div><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">SMART CAPACITY</span><h2 className="mt-1 text-sm font-black text-slate-950">الفترات الذكية وسعة الفروع</h2></div></div>
        <p className="max-w-lg text-[9px] leading-5 text-slate-400">يُقسّم وقت العمل إلى فترات متتابعة. مثال: 8:00–10:00 ثم 10:00–12:00، وتغلق الفترة تلقائيًا عند اكتمال سعتها.</p>
      </div>
      <div className="grid gap-3 p-4 sm:p-5">
        <article className="grid gap-3 rounded-2xl border border-slate-200 bg-[#f8fbfb] p-4 md:grid-cols-[1fr_180px_180px] md:items-end">
          <div><b className="text-sm text-slate-900">الإعداد الافتراضي</b><p className="mt-1 text-[10px] leading-5 text-slate-500">يُستخدم للمنشأة إذا لم تكن هناك فروع، ويكون نقطة البداية لأي فرع جديد.</p></div>
          <SlotDurationField label="مدة الفترة" name="defaultSlotMinutes" value={business.bookingSlotMinutes} />
          <NumberField label="العملاء لكل فترة" name="defaultCapacity" value={business.bookingCapacity} min={1} max={500} />
        </article>
        {business.branches.length ? <div className="grid gap-3 lg:grid-cols-2">{business.branches.map((branch) => <article key={branch.id} className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Building2 className="h-4 w-4" /></span><div><b className="block text-xs text-slate-900">{branch.name}</b>{branch.city ? <span className="text-[9px] text-slate-400">{branch.city}</span> : null}</div></div><label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fbfb] px-3 text-[9px] font-black text-slate-600"><input type="checkbox" name={`enabled-${branch.id}`} defaultChecked={branch.bookingEnabled} className="h-4 w-4 accent-[#00a99d]" />يستقبل حجوزات</label></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><SlotDurationField label="مدة الفترة" name={`slot-${branch.id}`} value={branch.bookingSlotMinutes} /><NumberField label="سعة الفترة" name={`capacity-${branch.id}`} value={branch.bookingCapacity} min={1} max={500} /></div>
          <p className="mt-2 text-[9px] font-bold text-[#008f87]">كل فترة تستقبل حتى {branch.bookingCapacity} عميل · {branch.bookingSlotMinutes / 60 >= 1 ? `${branch.bookingSlotMinutes / 60} ساعة` : `${branch.bookingSlotMinutes} دقيقة`}</p>
        </article>)}</div> : <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-[10px] font-bold text-slate-500">لا توجد فروع بعد؛ سيُستخدم الإعداد الافتراضي للمنشأة.</p>}
      </div>
      <div className="flex justify-end border-t border-slate-100 bg-[#fbfdfd] px-4 py-3 sm:px-5"><button className="h-11 rounded-xl bg-[#07181b] px-5 text-[11px] font-black text-white">حفظ إعدادات الفترات والفروع</button></div>
    </form>

    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(7,24,27,.5)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#fbfdfd] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><CalendarDays className="h-4 w-4" /></span><div><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">DATE OVERRIDES</span><h2 className="mt-1 text-sm font-black text-slate-950">تاريخ محدد متاح أو مغلق</h2></div></div>
        <p className="max-w-md text-[9px] leading-5 text-slate-400">هذا الإعداد يتقدم على جدول الأسبوع؛ مناسب للإجازات، المناسبات أو فتح يوم إضافي.</p>
      </div>
      <form action={upsertBookingAvailabilityOverrideAction} aria-label="إضافة توفر لتاريخ محدد" className="grid gap-3 p-4 sm:p-5 lg:grid-cols-[170px_150px_1fr_1fr_auto] lg:items-end">
        <label className="grid gap-1.5 text-[9px] font-bold text-slate-500"><span>التاريخ</span><input type="date" name="date" min={today} max={shiftDate(today, 365)} required className={fieldClass} /></label>
        <label className="grid gap-1.5 text-[9px] font-bold text-slate-500"><span>حالة اليوم</span><select name="mode" defaultValue="open" className={fieldClass}><option value="open">متاح للحجز</option><option value="closed">مغلق بالكامل</option></select></label>
        <div className="grid grid-cols-2 gap-2"><TimeField label="من" name="opensAt" value="09:00" /><TimeField label="إلى" name="closesAt" value="17:00" /></div>
        <label className="grid gap-1.5 text-[9px] font-bold text-slate-500"><span>ملاحظة داخلية <span className="font-normal text-slate-400">(اختياري)</span></span><input name="note" maxLength={240} placeholder="مثال: إجازة رسمية" className={fieldClass} /></label>
        <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#35e4cb] px-5 text-[10px] font-black text-[#07181b]"><Plus className="h-4 w-4" />حفظ التاريخ</button>
        <div className="grid grid-cols-2 gap-2 lg:col-start-3"><TimeField label="فترة ثانية من (اختياري)" name="secondOpensAt" value="" /><TimeField label="فترة ثانية إلى" name="secondClosesAt" value="" /></div>
        <p className="text-[9px] leading-5 text-slate-400 lg:col-span-2">عند اختيار «مغلق بالكامل» سيتم تجاهل الأوقات. يمكنك إعادة اختيار التاريخ نفسه لتحديثه.</p>
      </form>
      {business.bookingAvailabilityOverrides.length ? <div className="border-t border-slate-100 p-3 sm:p-4">
        <h3 className="px-1 text-[10px] font-black text-slate-600">التواريخ الخاصة القادمة</h3>
        <div className="mt-3 grid gap-2 md:grid-cols-2">{business.bookingAvailabilityOverrides.map((item) => <article key={item.id} className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-[#fbfdfd] p-3">
          <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.isClosed ? "bg-rose-50 text-rose-500" : "bg-emerald-50 text-emerald-600"}`}>{item.isClosed ? <CalendarOff className="h-4 w-4" /> : <CalendarCheck2 className="h-4 w-4" />}</span>
          <div className="min-w-0 flex-1"><b className="block text-[11px] text-slate-800">{displayDate(item.date)}</b><span className="mt-1 block text-[9px] font-bold text-slate-500">{item.isClosed ? "مغلق بالكامل" : `${item.opensAt} – ${item.closesAt}${item.secondOpensAt && item.secondClosesAt ? ` · ${item.secondOpensAt} – ${item.secondClosesAt}` : ""}`}</span>{item.note ? <small className="mt-1 block truncate text-[8px] text-slate-400">{item.note}</small> : null}</div>
          <form action={deleteBookingAvailabilityOverrideAction}><input type="hidden" name="id" value={item.id} /><button aria-label={`حذف إعداد ${displayDate(item.date)}`} className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-400 hover:border-rose-200 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></form>
        </article>)}</div>
      </div> : <div className="border-t border-dashed border-slate-200 px-4 py-5 text-center text-[10px] font-bold text-slate-400">لا توجد تواريخ خاصة؛ سيُستخدم جدول الأسبوع تلقائيًا.</div>}
    </section>

    <form action={updateWorkingHoursAction} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_60px_-48px_rgba(7,24,27,.5)]">
      <div className="flex flex-col gap-3 border-b border-slate-100 bg-[#fbfdfd] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><Clock3 className="h-4 w-4" /></span><div><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">WEEKLY AVAILABILITY</span><h2 className="mt-1 text-sm font-black text-slate-950">الجدول الأسبوعي المعتاد</h2></div></div><p className="max-w-md text-[9px] leading-5 text-slate-400">حدد الأيام والأوقات المتكررة. الفترة الثانية اختيارية للدوام المنقسم.</p></div>
      <div className="divide-y divide-slate-100 bg-[#f8fbfb]/40 p-2 sm:p-3">{days.map((day, index) => {
        const row = byDay.get(index);
        const defaultClosed = row?.isClosed ?? (index === 4);
        return <article key={day} className="my-2 rounded-[20px] border border-slate-200 bg-white p-3.5 shadow-[0_8px_30px_-28px_rgba(7,24,27,.55)] sm:p-4 lg:grid lg:grid-cols-[170px_1fr_1fr] lg:items-center lg:gap-4 lg:p-4">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 lg:block lg:border-b-0 lg:pb-0"><div className="flex items-center gap-3"><span className={`grid h-10 w-10 place-items-center rounded-xl ${defaultClosed ? "bg-slate-100 text-slate-400" : "bg-[#e9fbf8] text-[#008f87]"}`}><Clock3 className="h-4 w-4" /></span><div><b className="block text-sm text-slate-900">{day}</b><span className={`mt-0.5 block text-[8px] font-black tracking-[.08em] ${defaultClosed ? "text-slate-400" : "text-emerald-600"}`}>{defaultClosed ? "مغلق" : "متاح"}</span></div></div><label className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fbfb] px-3 text-[10px] font-black text-slate-600 lg:mt-3 lg:w-fit"><input type="checkbox" name={`closed-${index}`} defaultChecked={defaultClosed} className="h-4 w-4 accent-[#00a99d]" />مغلق</label></div>
          <div className="mt-3 rounded-2xl border border-slate-100 bg-[#fbfdfd] p-3 lg:mt-0"><div className="mb-2 flex items-center gap-2 text-[9px] font-black text-slate-500"><SunMedium className="h-3.5 w-3.5 text-[#00a99d]" />الفترة الأساسية</div><div className="grid grid-cols-2 gap-2"><TimeField label="يفتح" name={`opens-${index}`} value={row?.opensAt ?? "09:00"} /><TimeField label="يغلق" name={`closes-${index}`} value={row?.closesAt ?? "17:00"} /></div></div>
          <div className="mt-3 rounded-2xl border border-dashed border-slate-200 bg-white p-3 lg:mt-0"><div className="mb-2 flex items-center gap-2 text-[9px] font-black text-slate-400"><MoonStar className="h-3.5 w-3.5" />الفترة الثانية <span className="font-medium">اختيارية</span></div><div className="grid grid-cols-2 gap-2"><TimeField label="من" name={`second-opens-${index}`} value={row?.secondOpensAt ?? ""} /><TimeField label="إلى" name={`second-closes-${index}`} value={row?.secondClosesAt ?? ""} /></div></div>
        </article>;
      })}</div>
      <div className="hidden items-center justify-between gap-3 border-t border-slate-100 bg-[#fbfdfd] px-5 py-4 lg:flex"><span className="text-[10px] font-bold text-slate-400">{configured} من 7 أيام مهيأة</span><button className="h-11 rounded-xl bg-[#07181b] px-5 text-[11px] font-black text-white">حفظ الجدول الأسبوعي</button></div>
      <div className="fixed inset-x-0 bottom-[calc(68px+env(safe-area-inset-bottom))] z-[18] border-t border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-18px_40px_-32px_rgba(7,24,27,.55)] backdrop-blur-xl lg:hidden"><div className="mx-auto flex max-w-md items-center gap-2"><Link href="/dashboard/inbox" className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-3 text-[10px] font-black text-slate-600">الحجوزات</Link><button className="h-11 flex-1 rounded-xl bg-[#07181b] px-5 text-[11px] font-black text-white">حفظ جدول الأسبوع</button></div></div>
    </form>
  </div>;
}

function TimeField({ label, name, value }: { label: string; name: string; value: string }) {
  return <label className="grid min-w-0 gap-1 text-[9px] font-bold text-slate-500"><span>{label}</span><input type="time" name={name} defaultValue={value} className={timeClass} /></label>;
}

function NumberField({ label, name, value, min, max, step = 1 }: { label: string; name: string; value: number; min: number; max: number; step?: number }) {
  return <label className="grid min-w-0 gap-1 text-[9px] font-bold text-slate-500"><span>{label}</span><input type="number" inputMode="numeric" name={name} defaultValue={value} min={min} max={max} step={step} required className={fieldClass} /></label>;
}

function SlotDurationField({ label, name, value }: { label: string; name: string; value: number }) {
  const listId = `slot-options-${name}`;
  return <label className="grid min-w-0 gap-1 text-[9px] font-bold text-slate-500"><span>{label}</span><input type="number" inputMode="numeric" name={name} defaultValue={value} min={15} max={480} step={15} list={listId} required className={fieldClass} aria-describedby={`${listId}-hint`} /><datalist id={listId}><option value="15" label="ربع ساعة" /><option value="30" label="نصف ساعة" /><option value="60" label="ساعة" /><option value="90" label="ساعة ونصف" /><option value="120" label="ساعتان" /><option value="180" label="3 ساعات" /><option value="240" label="4 ساعات" /></datalist><small id={`${listId}-hint`} className="text-[8px] font-medium text-slate-400">بالدقائق؛ مضاعفات 15</small></label>;
}

function StatusItem({ done, label }: { done: boolean; label: string }) {
  return <span className={`rounded-xl border px-2 py-2.5 ${done ? "border-emerald-100 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>{done ? "جاهز" : "مطلوب"} · {label}</span>;
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return <div className="flex min-h-[88px] flex-col justify-center border-l border-white/[.07] px-3 sm:min-h-[104px] sm:px-4"><b className="text-lg text-white">{value}</b><span className="mt-1 text-[8px] font-bold text-slate-500">{label}</span></div>;
}
