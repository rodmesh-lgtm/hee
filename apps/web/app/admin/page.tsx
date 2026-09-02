import Link from "next/link";
import { Prisma } from "@prisma/client";
import { ArrowUpLeft, BadgeCheck, BriefcaseBusiness, Building2, ExternalLink, Search, ShieldCheck, Users } from "lucide-react";
import { approvePlanUpgradeAdminAction, approveVerificationAdminAction } from "../actions/admin";
import { requireAdmin } from "../lib/admin";
import { paidPlanActivationAllowed } from "../lib/billing";
import { db } from "../lib/db";

function meta(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

const pendingStatusSql = Prisma.sql`
  COALESCE(
    substring(e."metadata"::text from '"status"[[:space:]]*:[[:space:]]*"([^"]+)"'),
    'pending'
  ) = 'pending'
`;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = String(params.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const pageSize = 50;
  const manualPaidActivation = paidPlanActivationAllowed();
  const businessWhere = {
    deletedAt: null,
    ...(q ? {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { slug: { contains: q, mode: "insensitive" as const } },
        { owner: { email: { contains: q, mode: "insensitive" as const } } },
      ],
    } : {}),
  };

  const [events, plans, userCount, businessCount, publishedCount, verifiedCount, businesses, filteredCount, pendingCountRows] = await Promise.all([
    db.analyticsEvent.findMany({
      where: {
        eventType: { in: ["verification_requested", "plan_upgrade_requested"] },
        business: { deletedAt: null },
      },
      include: { business: { select: { id: true, name: true, slug: true, isVerified: true, plan: { select: { code: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.businessPlan.findMany({ where: { isActive: true }, select: { code: true } }),
    db.user.count({ where: { deletedAt: null } }),
    db.business.count({ where: { deletedAt: null } }),
    db.business.count({ where: { deletedAt: null, isPublished: true } }),
    db.business.count({ where: { deletedAt: null, isVerified: true } }),
    db.business.findMany({
      where: businessWhere,
      select: {
        id: true,
        name: true,
        slug: true,
        businessType: true,
        city: true,
        isPublished: true,
        isVerified: true,
        onboardingCompleted: true,
        updatedAt: true,
        owner: { select: { name: true, email: true } },
        plan: { select: { code: true, name: true } },
        _count: { select: { products: true, services: true, customers: true, orders: true, bookings: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.business.count({ where: businessWhere }),
    db.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint AS "count"
      FROM "AnalyticsEvent" e
      JOIN "Business" b ON b."id" = e."businessId"
      WHERE b."deletedAt" IS NULL
        AND e."eventType" IN ('verification_requested', 'plan_upgrade_requested')
        AND ${pendingStatusSql}
    `),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const pendingCount = Number(pendingCountRows[0]?.count ?? BigInt(0));
  const activePlans = new Set(plans.map((plan) => plan.code));
  const pending = events.filter((event) => String(meta(event.metadata).status ?? "pending") === "pending");
  const verification = pending.filter((event) => event.eventType === "verification_requested");
  const upgrades = pending.filter((event) => event.eventType === "plan_upgrade_requested");

  return <div dir="rtl" className="space-y-6">
    <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[10px] font-black tracking-[.14em] text-[#079b91]">INFRO OPERATIONS</p><h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">نظرة عامة على المنصة</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">مركز تشغيل موحد لمتابعة الحسابات والمنشآت والنشر والتوثيق والترقيات دون انتحال جلسات العملاء.</p></div>
      <div className="flex gap-2"><Link href="/admin/design" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 shadow-sm transition hover:border-[#9fe8df] hover:text-[#078f86]">تخصيص الهوية</Link><Link href="/dashboard" className="inline-flex items-center gap-2 rounded-xl bg-[#07181b] px-4 py-2.5 text-xs font-black text-white shadow-sm transition hover:bg-[#0d292d]">لوحة العميل<ArrowUpLeft className="h-4 w-4 text-[#38e5ce]"/></Link></div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric title="المستخدمون" value={userCount} icon={<Users className="h-4 w-4" />} tone="teal" />
      <Metric title="المنشآت" value={businessCount} icon={<Building2 className="h-4 w-4" />} tone="slate" />
      <Metric title="المنشورة" value={publishedCount} tone="emerald" />
      <Metric title="الموثقة" value={verifiedCount} tone="blue" />
      <Metric title="طلبات معلقة" value={pendingCount} tone={pendingCount ? "amber" : "slate"} />
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,.02)]">
      <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div><div className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#079b91]"/><h2 className="text-sm font-black text-slate-900">العملاء والمنشآت</h2></div><p className="mt-1 text-[11px] leading-5 text-slate-400">عرض تشغيلي آمن للحسابات النشطة ومحتواها وحالتها.</p></div>
        <form className="flex min-w-0 gap-2" action="/admin"><div className="relative min-w-0"><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300"/><input name="q" defaultValue={q} placeholder="ابحث بالاسم، الرابط أو البريد" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/60 pr-9 pl-3 text-xs outline-none transition placeholder:text-slate-300 focus:border-[#16b9ab] focus:bg-white focus:ring-4 focus:ring-[#16b9ab]/10 sm:w-72"/></div><button className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition hover:bg-slate-800">بحث</button></form>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-right text-xs">
          <thead className="bg-slate-50/70"><tr className="text-[10px] font-black text-slate-400"><th className="px-5 py-3">المنشأة</th><th className="px-3 py-3">المالك</th><th className="px-3 py-3">الحالة</th><th className="px-3 py-3">الخطة</th><th className="px-3 py-3">المحتوى</th><th className="px-3 py-3">المعاملات</th><th className="px-3 py-3">آخر تحديث</th><th className="px-5 py-3">إدارة</th></tr></thead>
          <tbody>{businesses.map((business) => <tr key={business.id} className="border-t border-slate-100 align-middle transition hover:bg-slate-50/45">
            <td className="px-5 py-4"><div className="flex items-center gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#edfafa] text-xs font-black text-[#078f86]">{business.name.slice(0,2)}</div><div><b className="block text-[13px] text-slate-900">{business.name}</b><span className="mt-1 block text-[10px] text-slate-400">ir.sa/{business.slug}</span><span className="mt-0.5 block text-[10px] text-slate-500">{business.businessType}{business.city ? ` · ${business.city}` : ""}</span></div></div></td>
            <td className="px-3 py-4"><span className="block font-bold text-slate-700">{business.owner.name}</span><span className="mt-1 block text-[10px] text-slate-400">{business.owner.email}</span></td>
            <td className="px-3 py-4"><div className="flex flex-wrap gap-1"><Status active={business.isPublished} on="منشورة" off="غير منشورة"/><Status active={business.isVerified} on="موثقة" off="غير موثقة"/><Status active={business.onboardingCompleted} on="مكتملة" off="إعداد"/></div></td>
            <td className="px-3 py-4"><span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-[10px] font-black text-slate-700">{business.plan?.name ?? business.plan?.code ?? "Free"}</span></td>
            <td className="px-3 py-4 text-[10px] leading-5 text-slate-500">{business._count.products} منتج · {business._count.services} خدمة<br/>{business._count.customers} عميل</td>
            <td className="px-3 py-4 text-[10px] leading-5 text-slate-500">{business._count.orders} طلب<br/>{business._count.bookings} حجز</td>
            <td className="px-3 py-4 text-[10px] text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(business.updatedAt)}</td>
            <td className="px-5 py-4"><div className="flex items-center gap-2"><Link href={`/admin/businesses/${business.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-700 shadow-sm transition hover:border-slate-300">التفاصيل</Link><a href={`/${business.slug}`} target="_blank" rel="noreferrer" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label={`فتح صفحة ${business.name}`}><ExternalLink className="h-3.5 w-3.5"/></a></div></td>
          </tr>)}{!businesses.length?<tr><td colSpan={8} className="py-12 text-center text-sm text-slate-400">لا توجد نتائج مطابقة.</td></tr>:null}</tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400"><span>{filteredCount} منشأة · صفحة {Math.min(page,totalPages)} من {totalPages}</span><div className="flex gap-2">{page>1?<Link href={`/admin?page=${page-1}${q?`&q=${encodeURIComponent(q)}`:""}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600">السابق</Link>:null}{page<totalPages?<Link href={`/admin?page=${page+1}${q?`&q=${encodeURIComponent(q)}`:""}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-600">التالي</Link>:null}</div></div>
    </section>

    <section className="grid gap-4 xl:grid-cols-2">
      <QueueCard title="طلبات التوثيق" icon={<BadgeCheck className="h-4 w-4"/>} href="/admin/requests?type=verification" count={verification.length}>{verification.length?verification.map((event)=><article key={event.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-xs text-slate-800">{event.business.name}</b><span className="mt-1 block text-[10px] text-slate-400">ir.sa/{event.business.slug} · {event.business.plan?.name??"Free"}</span></div><div className="flex items-center gap-2"><Link href={`/admin/businesses/${event.business.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black">مراجعة</Link>{event.business.isVerified?<span className="rounded-lg bg-blue-50 px-3 py-2 text-[10px] font-black text-blue-700">موثق بالفعل</span>:<form action={approveVerificationAdminAction}><input type="hidden" name="eventId" value={event.id}/><button className="h-8 rounded-lg bg-blue-600 px-3 text-[10px] font-black text-white">اعتماد</button></form>}</div></article>):<Empty text="لا توجد طلبات توثيق معلقة."/>}</QueueCard>

      <QueueCard title="طلبات الترقية" icon={<BriefcaseBusiness className="h-4 w-4"/>} href="/admin/requests?type=upgrade" count={upgrades.length}>{upgrades.length?upgrades.map((event)=>{const requestedPlan=String(meta(event.metadata).requestedPlan??"BUSINESS").toUpperCase();const planReady=activePlans.has(requestedPlan);return <article key={event.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-xs text-slate-800">{event.business.name}</b><span className="mt-1 block text-[10px] text-slate-400">{event.business.plan?.code??"FREE"} ← {requestedPlan}</span>{!planReady?<span className="mt-1 block text-[10px] font-bold text-rose-600">الباقة {requestedPlan} غير مهيأة.</span>:null}</div><div className="flex items-center gap-2"><Link href={`/admin/businesses/${event.business.id}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black">مراجعة</Link>{manualPaidActivation?<form action={approvePlanUpgradeAdminAction}><input type="hidden" name="eventId" value={event.id}/><button disabled={!planReady} className="h-8 rounded-lg bg-[#07181b] px-3 text-[10px] font-black text-white disabled:bg-slate-300">اعتماد</button></form>:<span className="rounded-lg bg-slate-100 px-3 py-2 text-[10px] font-black text-slate-600">يتطلب دفعًا موثقًا</span>}</div></article>}):<Empty text="لا توجد طلبات ترقية معلقة."/>}</QueueCard>
    </section>

    {!manualPaidActivation&&upgrades.length?<section className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-[11px] leading-6 text-blue-900"><b>حماية الباقات المدفوعة:</b> طلبات الترقية القديمة معروضة للمراجعة فقط. لا يمكن للإدارة منح BUSINESS أو PRO يدويًا في بيئة التشغيل؛ التفعيل يتم حصريًا بعد دفع موثق ومسجل في دفتر الفوترة.</section>:null}
    <section className="rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-[11px] leading-6 text-amber-900"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><p><b>حدود صلاحية الإدارة:</b> هذه اللوحة تعرض بيانات التشغيل وتنفذ إجراءات الإدارة الصريحة فقط. لا توجد جلسة انتحال للعميل، وأي ميزة دعم تدخل إلى حساب عميل مستقبلًا يجب أن تسجل من دخل ولماذا ومتى.</p></div></section>
  </div>;
}

function Metric({title,value,icon,tone="slate"}:{title:string;value:number;icon?:React.ReactNode;tone?:"teal"|"emerald"|"blue"|"amber"|"slate"}){const tones={teal:"bg-[#edfafa] text-[#078f86]",emerald:"bg-emerald-50 text-emerald-700",blue:"bg-blue-50 text-blue-700",amber:"bg-amber-50 text-amber-700",slate:"bg-slate-100 text-slate-600"};return <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.02)]"><div className={`mb-4 grid h-8 w-8 place-items-center rounded-xl ${tones[tone]}`}>{icon??<span className="h-1.5 w-1.5 rounded-full bg-current"/>}</div><b className="block text-2xl font-black tracking-tight text-slate-950">{value}</b><span className="mt-1 block text-[10px] font-bold text-slate-400">{title}</span></article>}
function Status({active,on,off}:{active:boolean;on:string;off:string}){return <span className={`rounded-full px-2 py-1 text-[9px] font-black ${active?"bg-emerald-50 text-emerald-700":"bg-slate-100 text-slate-500"}`}>{active?on:off}</span>}
function Empty({text}:{text:string}){return <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs text-slate-400">{text}</div>}
function QueueCard({title,icon,href,count,children}:{title:string;icon:React.ReactNode;href:string;count:number;children:React.ReactNode}){return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,.02)] sm:p-5"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-slate-800"><span className="text-[#079b91]">{icon}</span><h2 className="text-sm font-black">{title}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">{count}</span></div><Link href={href} className="text-[10px] font-black text-[#078f86]">عرض الكل</Link></div><div className="mt-4 space-y-2">{children}</div></div>}
