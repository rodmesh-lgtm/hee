import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BadgeCheck, BarChart3, Building2, CalendarClock, CheckCircle2, Eye, FileText, Inbox, MailWarning, MousePointerClick, Palette, Rocket, ShoppingBag, Store, UserRound } from "lucide-react";
import { getCurrentUser } from "../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../lib/active-business";
import { db } from "../lib/db";
import { getPublicBusinessUrlFromRequest } from "../lib/public-url";

const actionableOrderStatuses = ["pending", "confirmed", "processing"] as const;
const actionableBookingStatuses = ["pending", "confirmed"] as const;
const interactionEvents = ["whatsapp_click", "phone_click", "share_click", "website_click", "map_click", "company_profile_click", "social_click"] as const;

function riyadhDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function metricNumber(value: number) { return new Intl.NumberFormat("ar-SA").format(value); }

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessWithPlanForUser(user.id);
  if (!business) return <section className="mx-auto max-w-2xl rounded-[26px] border border-[#e9e7f3] bg-white p-6 sm:p-8"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1edff] text-[#5b3fd6]"><Rocket className="h-5 w-5" /></span><h1 className="mt-4 text-2xl font-black text-[#1f2552]">ابدأ هويتك الرقمية</h1><p className="mt-2 text-sm leading-7 text-slate-500">أدخل بيانات نشاطك الأساسية، ثم ستنتقل مباشرة إلى صفحتك لإكمالها.</p><Link href="/onboarding" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white">إنشاء الصفحة</Link></section>;

  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const today = riyadhDateKey();
  const [actionableOrders, actionableBookings, pendingOrders, pendingBookings, services, branches, contacts, views7d, interactions7d, orders7d, bookings7d, nextBooking] = await Promise.all([
    db.order.count({ where: { businessId: business.id, status: { in: [...actionableOrderStatuses] } } }),
    db.booking.count({ where: { businessId: business.id, status: { in: [...actionableBookingStatuses] } } }),
    db.order.count({ where: { businessId: business.id, status: "pending" } }),
    db.booking.count({ where: { businessId: business.id, status: "pending" } }),
    db.service.count({ where: { businessId: business.id, isActive: true, deletedAt: null } }),
    db.branch.count({ where: { businessId: business.id, isActive: true } }),
    db.contactPerson.count({ where: { businessId: business.id, isActive: true } }),
    db.analyticsEvent.count({ where: { businessId: business.id, eventType: "page_view", createdAt: { gte: since7d } } }),
    db.analyticsEvent.count({ where: { businessId: business.id, eventType: { in: [...interactionEvents] }, createdAt: { gte: since7d } } }),
    db.order.count({ where: { businessId: business.id, createdAt: { gte: since7d } } }),
    db.booking.count({ where: { businessId: business.id, createdAt: { gte: since7d } } }),
    db.booking.findFirst({ where: { businessId: business.id, status: { in: [...actionableBookingStatuses] }, bookingDate: { gte: today } }, orderBy: [{ bookingDate: "asc" }, { bookingTime: "asc" }], select: { id: true, bookingDate: true, bookingTime: true, customer: { select: { name: true } }, service: { select: { name: true } } } }),
  ]);

  const actionableTransactions = actionableOrders + actionableBookings;
  const newTransactions = pendingOrders + pendingBookings;
  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const effectivelyPublished = Boolean(business.isPublished && user.emailVerifiedAt);
  const identityReady = Boolean(business.name && business.shortDescription && (business.phone || business.whatsapp));
  const tasks = [
    { label: "بيانات الصفحة", description: "الاسم، النبذة والتواصل", ready: identityReady, href: "/dashboard/my-page", icon: UserRound },
    { label: "الخدمات", description: services ? `${services} مضافة` : "أضف خدماتك", ready: services > 0, href: "/dashboard/services", icon: Store },
    { label: "الفروع والفريق", description: `${branches} فروع · ${contacts} فريق`, ready: branches > 0, href: "/dashboard/directory", icon: Building2 },
    { label: "الشعار والمظهر", description: business.logoUrl ? "الهوية جاهزة" : "أضف شعارك", ready: Boolean(business.logoUrl), href: "/dashboard/branding", icon: Palette },
    { label: "الملف التعريفي PDF", description: business.companyProfileUrl ? "مرفوع ويظهر في الصفحة" : "أضف ملف الشركة الرسمي", ready: Boolean(business.companyProfileUrl), href: "/dashboard/digital-identity#company-profile", icon: FileText },
  ];
  const completed = tasks.filter((task) => task.ready).length;
  const workspace = [
    { label: "الهوية الرقمية", description: business.companyProfileUrl ? "ملف الشركة وأصول الهوية جاهزة للإدارة" : "PDF، vCard، الحضور الرقمي وSEO", href: "/dashboard/digital-identity", icon: BadgeCheck },
    { label: "متجر الأعمال", description: "منتجات داعمة لهويتك وشعار منشأتك", href: "/dashboard/business-store", icon: ShoppingBag },
    { label: "الأداء", description: "راقب الزيارات والتفاعل مع صفحتك", href: "/dashboard/analytics", icon: BarChart3 },
  ];
  const pulse = [
    { label: "زيارات 7 أيام", value: views7d, icon: Eye, href: "/dashboard/analytics" },
    { label: "تفاعلات 7 أيام", value: interactions7d, icon: MousePointerClick, href: "/dashboard/analytics" },
    { label: "طلبات 7 أيام", value: orders7d, icon: ShoppingBag, href: "/dashboard/inbox" },
    { label: "حجوزات 7 أيام", value: bookings7d, icon: CalendarClock, href: "/dashboard/inbox" },
  ];

  return <div className="space-y-4 pb-4">
    <section className="rounded-[26px] border border-[#e7e5f2] bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_65%,#f2edff_100%)] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${effectivelyPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{effectivelyPublished ? "منشورة" : "غير منشورة"}</span>{business.isVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black text-blue-700"><BadgeCheck className="h-3.5 w-3.5" />موثق</span> : null}</div><h1 className="mt-3 text-2xl font-black text-[#1f2552]">{business.name}</h1><p className="mt-1 text-sm text-slate-500">أدر صفحتك وهويتك وأعمالك من مكان واحد.</p></div><div className="flex gap-2"><Link href="/dashboard/my-page" className="inline-flex h-10 items-center rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">تعديل الصفحة</Link><a href={effectivelyPublished ? publicUrl : "/preview"} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#ddd8f4] bg-white px-3 text-xs font-black text-[#5d49cc]"><Eye className="h-3.5 w-3.5" />{effectivelyPublished ? "فتح" : "معاينة"}</a></div></div></section>

    {!user.emailVerifiedAt ? <Link href="/dashboard/settings" className="flex items-center justify-between gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100/70"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-amber-700 shadow-sm"><MailWarning className="h-4 w-4" /></span><div><b className="block text-sm text-amber-900">أكد بريد حسابك قبل نشر الصفحة</b><span className="mt-0.5 block text-[10px] text-amber-700">يمكنك إكمال الإعداد الآن، ثم إرسال رابط التأكيد من الحساب والباقات.</span></div></div><span className="text-xs font-black text-amber-800">تأكيد</span></Link> : null}
    {actionableTransactions ? <Link href="/dashboard/inbox" className="flex items-center justify-between gap-3 rounded-[22px] border border-amber-200 bg-amber-50 p-4 transition hover:bg-amber-100/70"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-amber-700 shadow-sm"><Inbox className="h-4 w-4" /></span><div><b className="block text-sm text-amber-900">لديك {actionableTransactions} عنصر يحتاج المتابعة</b><span className="mt-0.5 block text-[10px] text-amber-700">{newTransactions ? `${newTransactions} جديد · ` : ""}{actionableOrders} طلب · {actionableBookings} حجز</span></div></div><span className="text-xs font-black text-amber-800">فتح</span></Link> : null}

    <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-[#6f3bd2]" /><div><h2 className="font-black text-[#1f2552]">نبض الأعمال</h2><p className="mt-1 text-xs text-slate-500">ملخص تشغيلي حقيقي لآخر 7 أيام.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{pulse.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className="rounded-2xl border border-[#eeecf5] p-4 transition hover:border-[#cec4f1] hover:bg-[#fcfbff]"><Icon className="h-4 w-4 text-[#6543ce]" /><b className="mt-2 block text-xl text-[#20264f]">{metricNumber(item.value)}</b><span className="mt-1 block text-[10px] text-slate-400">{item.label}</span></Link>; })}</div>{nextBooking ? <Link href="/dashboard/inbox" className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-[#e9e4f4] bg-[#faf8ff] p-3"><div className="min-w-0"><b className="block truncate text-xs text-[#30264d]">الموعد القادم: {nextBooking.customer.name}</b><span className="mt-1 block truncate text-[10px] text-slate-500">{nextBooking.bookingDate} · {nextBooking.bookingTime}{nextBooking.service?.name ? ` · ${nextBooking.service.name}` : ""}</span></div><span className="shrink-0 text-[10px] font-black text-[#6f3bd2]">فتح الحجوزات</span></Link> : null}</section>

    <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-[#1f2552]">جاهزية الصفحة</h2><p className="mt-1 text-xs text-slate-500">أكمل الأساسيات التي يراها عميلك ويعتمد عليها حضورك الرقمي.</p></div><span className="text-sm font-black text-[#6f3bd2]">{completed}/{tasks.length}</span></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{tasks.map((task) => { const Icon = task.icon; return <Link key={task.label} href={task.href} className="flex items-center gap-3 rounded-2xl border border-[#eeecf5] p-3 transition hover:border-[#cec4f1] hover:bg-[#fcfbff]"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${task.ready ? "bg-emerald-50 text-emerald-600" : "bg-[#f3efff] text-[#6543ce]"}`}>{task.ready ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><div className="min-w-0"><b className="block text-sm text-[#252a4a]">{task.label}</b><span className="mt-0.5 block truncate text-[10px] text-slate-400">{task.description}</span></div></Link>; })}</div></section>

    <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-4 sm:p-5"><div><h2 className="font-black text-[#1f2552]">مركز الأعمال</h2><p className="mt-1 text-xs text-slate-500">اختصارات للأدوات التي تدعم حضور المنشأة ونموها.</p></div><div className="mt-4 grid gap-2 md:grid-cols-3">{workspace.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className="group rounded-2xl border border-[#eeecf5] p-4 transition hover:border-[#cec4f1] hover:bg-[#fcfbff]"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f3efff] text-[#6543ce]"><Icon className="h-4 w-4" /></span><b className="mt-3 block text-sm text-[#252a4a]">{item.label}</b><span className="mt-1 block text-[10px] leading-5 text-slate-400">{item.description}</span><span className="mt-3 inline-block text-[10px] font-black text-[#6f3bd2]">فتح القسم ←</span></Link>; })}</div></section>

    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-[#e9e7f3] bg-white p-4"><div><span className="text-[10px] font-bold text-slate-400">الباقة الحالية</span><b className="mt-0.5 block text-sm text-[#1f2552]">{business.plan?.name || "Free"}</b></div><Link href="/dashboard/settings" className="text-xs font-black text-[#5d49cc]">الحساب والباقات</Link></section>
  </div>;
}
