import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { CalendarDays, Phone, Settings2 } from "lucide-react";
import { requirePaidSectionPage } from "../../../lib/paid-section-page";
import { getOwnedBusinessForRead } from "../../../lib/ownership";
import { db } from "../../../lib/db";
import { appointmentPage, appointmentSearch, appointmentStatus } from "../../../lib/appointment-board";
import { CALENDAR_STATUSES, calendarDate, calendarStatus, calendarWindow, riyadhCalendarDate, type CalendarView } from "../../../lib/appointment-calendar";
import { appointmentCalendarQueries, type CalendarRow, type CalendarCount } from "../../../lib/appointment-calendar-query";
import { BookingStatusAction } from "../../../../components/dashboard/booking-status-action";
import { WorkspaceRefresh } from "../../../../components/dashboard/workspace-refresh";
import "../appointments.css";

const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const fmt = (count: number) => new Intl.NumberFormat("ar-SA").format(count);
const dayLabel = (date: string) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00+03:00`));
const clock = (date: Date) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", hour: "numeric", minute: "2-digit" }).format(date);

export default async function AppointmentCalendar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requirePaidSectionPage("appointments");
  const business = await getOwnedBusinessForRead("appointments");
  if (!business) redirect("/onboarding");
  const params = await searchParams;
  const today = riyadhCalendarDate();
  const date = calendarDate(param(params.date), today);
  const view: CalendarView = param(params.view) === "day" ? "day" : "week";
  const window = calendarWindow(date, view);
  const branchId = param(params.branch) ?? "";
  const query = appointmentSearch(param(params.q));
  const status = calendarStatus(param(params.status));
  const page = view === "day" ? appointmentPage(param(params.page)) : 1;
  const branches = await db.branch.findMany({ where: { businessId: business.id }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  const validBranch = !branchId || branchId === "main" || branches.some(branch => branch.id === branchId);
  const queries = appointmentCalendarQueries({ businessId: business.id, date, view, branchId, validBranch, search: query, status, page });
  const data = await db.$transaction(async tx => {
    const counts = await tx.$queryRaw<CalendarCount[]>(queries.counts);
    const rows = await tx.$queryRaw<CalendarRow[]>(queries.rows);
    const [clock] = await tx.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS now`;
    return { counts, rows, now: clock.now };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  function href(values: Record<string, string | number>) {
    const next = new URLSearchParams({ date, view, ...(branchId ? { branch: branchId } : {}), ...(query ? { q: query } : {}), ...(status ? { status } : {}) });
    for (const [key, value] of Object.entries(values)) next.set(key, String(value));
    return `/dashboard/appointments/calendar?${next}`;
  }
  const total = data.counts.reduce((sum, day) => sum + day.count, 0);
  const pages = Math.max(1, Math.ceil(total / queries.limit));
  if (view === "day" && page > pages) redirect(href({ page: pages }));
  return <div className="appointment-board space-y-5">
    <section className="appointment-surface appointment-hero"><div><p className="appointment-eyebrow">جدول الزيارات</p><h1>تقويم المواعيد</h1><p>راجع يومك وأسبوعك حسب الفرع والحالة. جميع الأوقات بتوقيت السعودية، والأسبوع يبدأ يوم الأحد.</p></div><div className="appointment-actions"><Link href="/dashboard/appointments" className="appointment-button">قائمة المواعيد</Link><Link href="/dashboard/working-hours" className="appointment-button"><Settings2 size={17} aria-hidden="true"/>إعداد الحجز</Link></div></section>
    <WorkspaceRefresh observedAt={data.now.toISOString()} observedTime={clock(data.now)}/>
    <nav aria-label="فترة التقويم" className="appointment-calendar-toolbar appointment-surface"><div className="appointment-actions"><Link href={href({ view: "day", page: 1 })} aria-current={view === "day" ? "page" : undefined} className="appointment-button">يومي</Link><Link href={href({ view: "week", page: 1 })} aria-current={view === "week" ? "page" : undefined} className="appointment-button">أسبوعي</Link></div><div className="appointment-actions"><Link href={href({ date: window.previous, page: 1 })} className="appointment-button">{view === "week" ? "الأسبوع السابق" : "اليوم السابق"}</Link><Link href={href({ date: today, page: 1 })} className="appointment-button">اليوم</Link><Link href={href({ date: window.next, page: 1 })} className="appointment-button">{view === "week" ? "الأسبوع التالي" : "اليوم التالي"}</Link></div></nav>
    <form action="/dashboard/appointments/calendar" className="appointment-filters appointment-surface">
      <input type="hidden" name="view" value={view}/>
      <label><span>التاريخ</span><input type="date" name="date" defaultValue={date} min="2000-01-01" max="2099-12-31" required/></label>
      <label><span>الفرع</span><select name="branch" defaultValue={validBranch ? branchId : ""}><option value="">كل الفروع</option><option value="main">بدون فرع محدد</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label><span>حالة الحجز</span><select name="status" defaultValue={status}><option value="">كل الحالات</option>{CALENDAR_STATUSES.map(status => <option key={status} value={status}>{appointmentStatus(status)}</option>)}</select></label>
      <label><span>اسم العميل أو جواله</span><input type="search" name="q" defaultValue={query} maxLength={100}/></label>
      <button className="appointment-button">تطبيق</button>{branchId || query || status ? <Link href={`/dashboard/appointments/calendar?${new URLSearchParams({ date, view })}`} className="appointment-button">مسح الفلاتر</Link> : null}
    </form>
    {!validBranch ? <p className="appointment-notice" role="alert">الفرع المطلوب غير موجود ضمن منشأتك. اختر فرعًا من القائمة.</p> : null}
    <p className="appointment-muted">{view === "week" ? `${dayLabel(window.start)} — ${dayLabel(window.days[6])}` : dayLabel(date)}. {view === "week" ? "تظهر أول عشرة مواعيد لكل يوم؛ افتح اليوم لعرض بقيتها. الموعد الممتد بعد منتصف الليل يظهر في اليومين." : `${fmt(total)} موعدًا مطابقًا للفلاتر، بما فيها المواعيد الممتدة من اليوم السابق.`}</p>
    <section aria-label={view === "week" ? "التقويم الأسبوعي" : "التقويم اليومي"} className={`appointment-calendar appointment-calendar-${view}`}>
      {window.days.map(day => {
        const rows = data.rows.filter(row => row.day === day);
        const count = data.counts.find(row => row.day === day)?.count ?? 0;
        return <section key={day} className={`appointment-calendar-day appointment-surface${day === today ? " appointment-calendar-today" : ""}`} aria-label={dayLabel(day)}>
          <header><h2><Link href={href({ date: day, view: "day", page: 1 })}><time dateTime={day}>{dayLabel(day)}</time></Link></h2><span className="appointment-muted">{fmt(count)} موعدًا{day === today ? " · اليوم" : ""}</span></header>
          {rows.length ? rows.map(row => <article key={row.id} className="appointment-calendar-card" data-booking-id={row.id}>
            <p className="appointment-calendar-time"><CalendarDays size={16} aria-hidden="true"/><time dateTime={row.startsAt.toISOString()}>{clock(row.startsAt)}</time><span>—</span><time dateTime={row.endsAt.toISOString()}>{clock(row.endsAt)}</time></p>
            {row.bookingDate < day ? <p className="appointment-muted">ممتد من اليوم السابق</p> : row.endsAt.getTime() > new Date(`${day}T00:00:00+03:00`).getTime() + 86400000 ? <p className="appointment-muted">يمتد إلى اليوم التالي</p> : null}
            <h3>{row.customerName}</h3><a href={`tel:${row.customerPhone}`} className="appointment-calendar-phone" dir="ltr"><Phone size={14} aria-hidden="true"/>{row.customerPhone}</a>
            <p className="appointment-muted">{row.serviceName ?? "خدمة سابقة"} · {row.branchName ?? "المنشأة الرئيسية"}</p>
            <span className={`appointment-badge appointment-status-${row.status}`}>{appointmentStatus(row.status)}</span>
            <div className="appointment-actions">{row.status === "pending" && row.endsAt > data.now ? <BookingStatusAction id={row.id} status="confirmed" label="تأكيد الحجز"/> : null}{row.status === "confirmed" ? <><BookingStatusAction id={row.id} status="completed" label="تم الحضور"/><BookingStatusAction id={row.id} status="no_show" label="لم يحضر" confirm="هل تريد تسجيل العميل كـ «لم يحضر»؟"/></> : null}{["pending", "confirmed"].includes(row.status) ? <BookingStatusAction id={row.id} status="cancelled" label="إلغاء الحجز" danger confirm="هل تريد إلغاء هذا الموعد؟"/> : null}</div>
          </article>) : <p className="appointment-muted appointment-calendar-empty">لا توجد مواعيد مطابقة.</p>}
          {view === "week" && count > queries.limit ? <Link href={href({ date: day, view: "day", page: 1 })} className="appointment-button">عرض جميع مواعيد اليوم ({fmt(count)})</Link> : null}
        </section>;
      })}
    </section>
    {view === "day" ? <nav aria-label="صفحات التقويم اليومي" className="appointment-pagination"><span>صفحة {fmt(page)} من {fmt(pages)}</span><div>{page > 1 ? <Link href={href({ page: page - 1 })} className="appointment-button">السابق</Link> : null}{page < pages ? <Link href={href({ page: page + 1 })} className="appointment-button">التالي</Link> : null}</div></nav> : null}
  </div>;
}
