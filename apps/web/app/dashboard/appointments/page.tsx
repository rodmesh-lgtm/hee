import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { Building2, CalendarDays, CalendarCheck2, Clock3, Settings2, Search, Phone, ArrowLeft, MapPin } from "lucide-react";
import { db } from "../../lib/db";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import { updateBookingStatusAction } from "../../actions/transactions";
import { appointmentPage, appointmentSearch, appointmentSearchPattern, appointmentStatus, appointmentTab } from "../../lib/appointment-board";
import { ConfirmSubmitButton } from "../../../components/dashboard/confirm-submit-button";
import { WorkspaceRefresh } from "../../../components/dashboard/workspace-refresh";
import "./appointments.css";

const PAGE_SIZE = 25;
const fmt = (n: number) => new Intl.NumberFormat("ar-SA").format(n);
const dateTime = (value: Date) => new Intl.DateTimeFormat("ar-SA-u-ca-gregory", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }).format(value);
const visitTime = (date: string, time: string) => dateTime(new Date(`${date}T${time}:00+03:00`));
const param = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;

function BookingAction({ id, status, label, danger = false, confirm }: { id: string; status: string; label: string; danger?: boolean; confirm?: string }) {
  return <form action={updateBookingStatusAction}><input type="hidden" name="id" value={id}/><input type="hidden" name="status" value={status}/>{confirm ? <ConfirmSubmitButton label={label} confirmMessage={confirm} showIcon={false} className={`appointment-button ${danger ? "appointment-button-danger" : ""}`}/> : <button className="appointment-button">{label}</button>}</form>;
}

export default async function AppointmentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const business = await getOwnedBusinessForRead();
  if (!business) redirect("/onboarding");
  const params = await searchParams;
  const tab = appointmentTab(param(params.tab));
  const page = appointmentPage(param(params.page));
  const query = appointmentSearch(param(params.q));
  const branches = await db.branch.findMany({ where: { businessId: business.id }, orderBy: [{ isMain: "desc" }, { sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, city: true, district: true, isActive: true, bookingEnabled: true, bookingCapacity: true, bookingSlotMinutes: true, isMain: true } });
  const branchId = param(params.branch) ?? "";
  const validBranch = !branchId || branchId === "main" || branches.some(branch => branch.id === branchId);
  const branchFilter = tab === "branches" ? Prisma.empty : !validBranch ? Prisma.sql`AND false` : branchId === "main" ? Prisma.sql`AND b."branchId" IS NULL` : branchId ? Prisma.sql`AND b."branchId" = ${branchId}` : Prisma.empty;
  const searchFilter = query && tab !== "branches" ? Prisma.sql`AND (c."name" ILIKE ${appointmentSearchPattern(query)} OR c."phone" ILIKE ${appointmentSearchPattern(query)})` : Prisma.empty;
  // Use the persisted duration snapshot and database clock, including appointments
  // spanning midnight. A pending historical booking must not displace tomorrow's visit.
  const base = Prisma.sql`WITH appointments AS (
    SELECT b."id", b."status", b."bookingDate", b."bookingTime", b."createdAt", b."branchId",
      ((b."bookingDate" || ' ' || b."bookingTime")::timestamp AT TIME ZONE 'Asia/Riyadh')
        + make_interval(mins => COALESCE(snapshot."durationMinutes", CASE WHEN s."durationMinutes" BETWEEN 5 AND 1440 THEN s."durationMinutes" ELSE 30 END)) AS "endsAt"
    FROM "Booking" b
    JOIN "Customer" c ON c."id" = b."customerId" AND c."businessId" = b."businessId"
    LEFT JOIN "Service" s ON s."id" = b."serviceId" AND s."businessId" = b."businessId"
    LEFT JOIN "BookingDurationSnapshot" snapshot ON snapshot."bookingId" = b."id"
    WHERE b."businessId" = ${business.id} ${branchFilter} ${searchFilter}
  )`;
  const open = Prisma.sql`"status" IN ('pending', 'confirmed') AND "endsAt" > CURRENT_TIMESTAMP`;
  const predicate = tab === "history" ? Prisma.sql`NOT (${open})` : tab === "new" ? Prisma.sql`"status" = 'pending' AND "endsAt" > CURRENT_TIMESTAMP` : open;
  const order = tab === "new" ? Prisma.sql`"createdAt" DESC, "id" DESC` : tab === "history" ? Prisma.sql`"bookingDate" DESC, "bookingTime" DESC, "createdAt" DESC, "id" DESC` : Prisma.sql`"bookingDate" ASC, "bookingTime" ASC, "createdAt" DESC, "id" ASC`;
  const data = await db.$transaction(async tx => {
    const [counts] = await tx.$queryRaw<Array<{ upcoming: number; pending: number; history: number; observedAt: Date }>>(Prisma.sql`${base} SELECT COUNT(*) FILTER (WHERE ${open})::int AS upcoming, COUNT(*) FILTER (WHERE "status" = 'pending' AND "endsAt" > CURRENT_TIMESTAMP)::int AS pending, COUNT(*) FILTER (WHERE NOT (${open}))::int AS history, CURRENT_TIMESTAMP AS "observedAt" FROM appointments`);
    const rows = tab === "branches" ? [] : await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`${base} SELECT "id" FROM appointments WHERE ${predicate} ORDER BY ${order} LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`);
    const bookings = rows.length ? await tx.booking.findMany({ where: { businessId: business.id, id: { in: rows.map(row => row.id) } }, include: { customer: { select: { name: true, phone: true } }, service: { select: { name: true } }, branch: { select: { name: true } } } }) : [];
    const ordered = new Map(bookings.map(booking => [booking.id, booking]));
    const branchCounts = await tx.$queryRaw<Array<{ branchId: string | null; count: number }>>(Prisma.sql`${base} SELECT "branchId", COUNT(*)::int AS count FROM appointments WHERE ${open} GROUP BY "branchId"`);
    return { counts, bookings: rows.flatMap(row => ordered.get(row.id) ? [ordered.get(row.id)!] : []), branchCounts };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
  const count = tab === "new" ? data.counts.pending : tab === "history" ? data.counts.history : data.counts.upcoming;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  if (page > pages) { const canonical = new URLSearchParams({ tab, page: String(pages), ...(branchId ? { branch: branchId } : {}), ...(query ? { q: query } : {}) }); redirect(`/dashboard/appointments?${canonical}`); }
  function href(values: Record<string, string | number>) {
    const next = new URLSearchParams({ tab, ...(branchId ? { branch: branchId } : {}), ...(query ? { q: query } : {}) });
    for (const [key, value] of Object.entries(values)) next.set(key, String(value));
    return `/dashboard/appointments?${next}`;
  }
  const tabs = [{ key: "upcoming", label: "المواعيد القادمة", count: data.counts.upcoming }, { key: "new", label: "بانتظار التأكيد", count: data.counts.pending }, { key: "history", label: "سجل المواعيد", count: data.counts.history }, { key: "branches", label: "فروع المواعيد", count: branches.length }];
  return <div className="appointment-board space-y-5">
    <section className="appointment-surface appointment-hero"><div><p className="appointment-eyebrow">إدارة الزيارات والفروع</p><h1>المواعيد والحجوزات</h1><p>القادم حسب وقت الزيارة، والجديد حسب وقت استقباله. الحجوزات السابقة لها سجل مستقل.</p></div><Link href="/dashboard/working-hours" className="appointment-button"><Settings2 aria-hidden="true" size={17}/>إعدادات الحجز وساعات العمل</Link></section>
    <WorkspaceRefresh observedAt={data.counts.observedAt.toISOString()} observedTime={dateTime(data.counts.observedAt)}/>
    <div className="appointment-stats"><Stat icon={<CalendarDays size={20}/>} title="مواعيد قادمة" count={data.counts.upcoming}/><Stat icon={<Clock3 size={20}/>} title="بانتظار تأكيدك" count={data.counts.pending}/><Stat icon={<CalendarCheck2 size={20}/>} title="في السجل" count={data.counts.history}/></div>
    <nav aria-label="عرض المواعيد" className="appointment-tabs">{tabs.map(item => <Link key={item.key} href={href({ tab: item.key, page: 1 })} aria-current={tab === item.key ? "page" : undefined}>{item.label}<span>{fmt(item.count)}</span></Link>)}</nav>
    {!validBranch ? <p role="alert" className="appointment-notice">الفرع المطلوب غير موجود ضمن منشأتك. اختر فرعًا من القائمة.</p> : null}
    {tab === "branches" ? <section className="appointment-branches" aria-label="فروع المواعيد">{branches.length ? branches.map(branch => <article key={branch.id} className="appointment-surface"><div className="appointment-branch-title"><Building2 size={22} aria-hidden="true"/><h2>{branch.name}</h2>{branch.isMain ? <span className="appointment-badge">رئيسي</span> : null}</div><p className="appointment-muted"><MapPin size={15} aria-hidden="true"/>{[branch.city, branch.district].filter(Boolean).join("، ") || "لم يحدد الموقع"}</p><dl className="appointment-branch-facts"><div><dt>مدة الفترة</dt><dd>{fmt(branch.bookingSlotMinutes)} دقيقة</dd></div><div><dt>سعة الفترة</dt><dd>{fmt(branch.bookingCapacity)} زائر</dd></div><div><dt>المواعيد القادمة</dt><dd>{fmt(data.branchCounts.find(item => item.branchId === branch.id)?.count ?? 0)}</dd></div></dl><p className="appointment-muted">{branch.isActive && branch.bookingEnabled ? "يستقبل مواعيد" : "الحجز متوقف في هذا الفرع"}</p><div className="appointment-actions"><Link href={href({ tab: "upcoming", branch: branch.id, page: 1 })} className="appointment-button">عرض مواعيد الفرع<ArrowLeft size={15}/></Link><Link href="/dashboard/working-hours#booking-branch-settings" className="appointment-button">تعديل السعة والفترات</Link></div></article>) : <div className="appointment-surface"><h2>المواعيد تستخدم إعدادات المنشأة الرئيسية</h2><p className="appointment-muted">أضف فرعًا لعرض مواعيده وسعته بشكل مستقل.</p><Link href="/dashboard/directory" className="appointment-button">إدارة الفروع</Link></div>}</section> : <>
      <form className="appointment-filters appointment-surface" action="/dashboard/appointments"><input type="hidden" name="tab" value={tab}/><label><span>البحث عن العميل</span><div className="appointment-search"><Search size={17} aria-hidden="true"/><input name="q" type="search" defaultValue={query} placeholder="الاسم أو رقم الجوال" maxLength={100}/></div></label><label><span>الفرع</span><select name="branch" defaultValue={branchId}><option value="">كل الفروع</option><option value="main">بدون فرع محدد</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}{!branch.isActive ? " — غير نشط" : ""}</option>)}</select></label><button className="appointment-button">تطبيق</button>{query || branchId ? <Link className="appointment-button" href={`/dashboard/appointments?tab=${tab}`}>مسح الفلاتر</Link> : null}</form>
      <p className="appointment-muted">{tab === "new" ? "الأحدث استقبالًا أولًا؛ تشمل المواعيد التي لم ينته وقتها فقط." : tab === "history" ? "الأحدث حسب وقت الزيارة أولًا؛ يشمل المنتهية والملغاة والمكتملة." : "الأقرب زيارةً أولًا؛ يشمل الجاري الآن والقادم فقط."} {fmt(count)} موعدًا{query || branchId ? " مطابقًا للفلاتر" : ""}.</p>
      <section aria-label="قائمة المواعيد" className="appointment-list">{data.bookings.length ? data.bookings.map(booking => <article key={booking.id} className="appointment-surface appointment-row" data-booking-id={booking.id}><div className="appointment-visit"><CalendarDays size={20} aria-hidden="true"/><strong>{visitTime(booking.bookingDate, booking.bookingTime)}</strong><span>{booking.slotEndTime ? `تنتهي الفترة ${booking.slotEndTime}` : "وقت الزيارة"}</span></div><div className="appointment-customer"><h2>{booking.customer.name}</h2><a href={`tel:${booking.customer.phone}`} dir="ltr"><Phone size={14} aria-hidden="true"/>{booking.customer.phone}</a><p>{booking.service?.name ?? "خدمة سابقة"} · {booking.branch?.name ?? "المنشأة الرئيسية"}</p></div><div className="appointment-status"><span className={`appointment-badge appointment-status-${booking.status}`}>{appointmentStatus(booking.status)}</span><span>استقبل {dateTime(booking.createdAt)}</span><span>مرجع {booking.id.replaceAll("-", "").slice(0, 8).toUpperCase()}</span></div><div className="appointment-actions">{booking.status === "pending" && tab !== "history" ? <BookingAction id={booking.id} status="confirmed" label="تأكيد الحجز"/> : null}{booking.status === "confirmed" ? <><BookingAction id={booking.id} status="completed" label="تم الحضور"/><BookingAction id={booking.id} status="no_show" label="لم يحضر" confirm="هل تريد تسجيل العميل كـ «لم يحضر»؟"/></> : null}{["pending", "confirmed"].includes(booking.status) ? <BookingAction id={booking.id} status="cancelled" label="إلغاء الحجز" danger confirm="هل تريد إلغاء هذا الموعد؟"/> : null}</div>{booking.notes ? <details className="appointment-notes"><summary>تفاصيل الحجز</summary><p>{booking.notes}</p></details> : null}</article>) : <div className="appointment-surface appointment-empty"><CalendarDays size={28} aria-hidden="true"/><h2>{tab === "history" ? "لا توجد مواعيد في السجل" : tab === "new" ? "لا توجد مواعيد بانتظار التأكيد" : "لا توجد مواعيد قادمة"}</h2><p>{query || branchId ? "جرّب مسح الفلاتر أو اختيار فرع آخر." : "ستظهر الحجوزات الفعلية هنا عند استقبالها."}</p></div>}</section>
      <nav aria-label="صفحات المواعيد" className="appointment-pagination"><span>صفحة {fmt(page)} من {fmt(pages)}</span><div>{page > 1 ? <Link href={href({ page: page - 1 })} className="appointment-button">السابق</Link> : null}{page < pages ? <Link href={href({ page: page + 1 })} className="appointment-button">التالي</Link> : null}</div></nav>
    </>}
    <div className="appointment-surface appointment-footer"><Building2 size={20} aria-hidden="true"/><p>السعة والفترات وساعات العمل تتحكم في المواعيد المتاحة للزائر. تغيير حالة الحجز يحدّث الصفحة والإحصاءات.</p><Link href="/dashboard/working-hours" className="appointment-button">إدارة إعدادات الحجز</Link></div>
  </div>;
}
function Stat({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) { return <div className="appointment-surface appointment-stat"><span aria-hidden="true">{icon}</span><div><p>{title}</p><strong>{fmt(count)}</strong></div></div>; }
