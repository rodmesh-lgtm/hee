import Link from "next/link";
import { Prisma } from "@prisma/client";
import { BadgeCheck, BriefcaseBusiness, Building2, ExternalLink, ShieldCheck, Users } from "lucide-react";
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

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#1f2552] sm:px-6">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-[#e7e4f0] bg-white p-5">
        <div><span className="text-2xl font-black tracking-[-.08em] text-[#6f3bd2]">HEE</span><h1 className="mt-2 text-xl font-black">إدارة المنصة</h1><p className="mt-1 text-sm text-slate-500">مركز تشغيل HEE: العملاء، المنشآت، النشر، التوثيق، الترقية والمعاملات.</p></div>
        <Link href="/dashboard" className="rounded-xl border border-[#e3dfed] px-4 py-2 text-xs font-black text-[#5d49cc]">لوحة العميل</Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric title="المستخدمون" value={userCount} icon={<Users className="h-4 w-4" />} />
        <Metric title="المنشآت" value={businessCount} icon={<Building2 className="h-4 w-4" />} />
        <Metric title="المنشورة" value={publishedCount} />
        <Metric title="الموثقة" value={verifiedCount} />
        <Metric title="طلبات معلقة" value={pendingCount} />
      </section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">العملاء والمنشآت</h2></div><p className="mt-1 text-xs text-slate-500">عرض إداري للمنصة فقط؛ لا يتم انتحال جلسة العميل.</p></div>
          <form className="flex gap-2" action="/admin"><input name="q" defaultValue={q} placeholder="اسم، رابط أو بريد العميل" className="h-10 min-w-0 rounded-xl border border-[#e4e0ec] px-3 text-sm outline-none sm:w-64" /><button className="h-10 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">بحث</button></form>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[980px] text-right text-xs">
            <thead><tr className="border-b border-[#ece9f3] text-slate-400"><th className="px-2 py-3">المنشأة</th><th className="px-2 py-3">المالك</th><th className="px-2 py-3">الحالة</th><th className="px-2 py-3">الخطة</th><th className="px-2 py-3">المحتوى</th><th className="px-2 py-3">المعاملات</th><th className="px-2 py-3">آخر تحديث</th><th className="px-2 py-3">إدارة</th></tr></thead>
            <tbody>{businesses.map((business) => <tr key={business.id} className="border-b border-[#f0edf5] align-top last:border-0">
              <td className="px-2 py-3"><b className="block text-sm text-[#24294f]">{business.name}</b><span className="mt-1 block text-slate-400">hee.sa/{business.slug}</span><span className="mt-1 block text-slate-500">{business.businessType}{business.city ? ` · ${business.city}` : ""}</span></td>
              <td className="px-2 py-3"><span className="block font-bold text-slate-700">{business.owner.name}</span><span className="mt-1 block text-slate-400">{business.owner.email}</span></td>
              <td className="px-2 py-3"><div className="flex flex-wrap gap-1"><Status active={business.isPublished} on="منشورة" off="غير منشورة" /><Status active={business.isVerified} on="موثقة" off="غير موثقة" /><Status active={business.onboardingCompleted} on="مكتملة" off="إعداد" /></div></td>
              <td className="px-2 py-3 font-black text-[#5d49cc]">{business.plan?.name ?? business.plan?.code ?? "Free"}</td>
              <td className="px-2 py-3 text-slate-600">{business._count.products} منتج · {business._count.services} خدمة · {business._count.customers} عميل</td>
              <td className="px-2 py-3 text-slate-600">{business._count.orders} طلب · {business._count.bookings} حجز</td>
              <td className="px-2 py-3 text-slate-500">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(business.updatedAt)}</td>
              <td className="px-2 py-3"><div className="flex items-center gap-2"><Link href={`/admin/businesses/${business.id}`} className="rounded-xl bg-[#f3efff] px-3 py-2 font-black text-[#5d49cc]">التفاصيل</Link><a href={`/${business.slug}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5e1ec] text-slate-500" aria-label={`فتح صفحة ${business.name}`}><ExternalLink className="h-4 w-4" /></a></div></td>
            </tr>)}{!businesses.length ? <tr><td colSpan={8} className="py-8 text-center text-slate-500">لا توجد نتائج مطابقة.</td></tr> : null}</tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{filteredCount} منشأة · صفحة {Math.min(page, totalPages)} من {totalPages}</span><div className="flex gap-2">{page > 1 ? <Link href={`/admin?page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="rounded-lg border px-3 py-1.5">السابق</Link> : null}{page < totalPages ? <Link href={`/admin?page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="rounded-lg border px-3 py-1.5">التالي</Link> : null}</div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-blue-600" /><h2 className="font-black">طلبات التوثيق</h2></div><Link href="/admin/requests?type=verification" className="text-[11px] font-black text-[#5d49cc]">عرض الكل</Link></div><div className="mt-4 space-y-2">{verification.length ? verification.map((event) => <article key={event.id} className="flex flex-col gap-3 rounded-2xl border border-[#ece9f3] p-4 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-sm">{event.business.name}</b><span className="mt-1 block text-xs text-slate-500">hee.sa/{event.business.slug} · {event.business.plan?.name ?? "Free"}</span></div><div className="flex items-center gap-2"><Link href={`/admin/businesses/${event.business.id}`} className="rounded-xl border border-[#e5e1ec] px-3 py-2 text-xs font-black">مراجعة</Link>{event.business.isVerified ? <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">موثق بالفعل</span> : <form action={approveVerificationAdminAction}><input type="hidden" name="eventId" value={event.id} /><button className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-black text-white">اعتماد</button></form>}</div></article>) : <Empty text="لا توجد طلبات توثيق معلقة." />}</div></div>
        <div className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">طلبات الترقية</h2></div><Link href="/admin/requests?type=upgrade" className="text-[11px] font-black text-[#5d49cc]">عرض الكل</Link></div><div className="mt-4 space-y-2">{upgrades.length ? upgrades.map((event) => { const requestedPlan = String(meta(event.metadata).requestedPlan ?? "BUSINESS").toUpperCase(); const planReady = activePlans.has(requestedPlan); return <article key={event.id} className="flex flex-col gap-3 rounded-2xl border border-[#ece9f3] p-4 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-sm">{event.business.name}</b><span className="mt-1 block text-xs text-slate-500">{event.business.plan?.code ?? "FREE"} ← {requestedPlan}</span>{!planReady ? <span className="mt-1 block text-[11px] font-bold text-rose-600">الباقة {requestedPlan} غير مهيأة.</span> : null}</div><div className="flex items-center gap-2"><Link href={`/admin/businesses/${event.business.id}`} className="rounded-xl border border-[#e5e1ec] px-3 py-2 text-xs font-black">مراجعة</Link>{manualPaidActivation ? <form action={approvePlanUpgradeAdminAction}><input type="hidden" name="eventId" value={event.id} /><button disabled={!planReady} className="h-9 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white disabled:bg-slate-300">اعتماد</button></form> : <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-600">يتطلب دفعًا موثقًا</span>}</div></article>; }) : <Empty text="لا توجد طلبات ترقية معلقة." />}</div></div>
      </section>

      {!manualPaidActivation && upgrades.length ? <section className="rounded-[20px] border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><p><b>حماية الباقات المدفوعة:</b> طلبات الترقية القديمة معروضة للمراجعة فقط. لا يمكن للإدارة منح BUSINESS أو PRO يدويًا في بيئة التشغيل؛ التفعيل يتم حصريًا بعد دفع موثق ومسجل في دفتر الفوترة.</p></section> : null}

      <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><b>حدود صلاحية الإدارة:</b> هذه اللوحة تعرض بيانات التشغيل وتنفذ إجراءات الإدارة الصريحة فقط. لا توجد جلسة انتحال للعميل في هذه الجولة، وأي ميزة دعم تدخل إلى حساب عميل مستقبلًا يجب أن تسجل من دخل ولماذا ومتى.</p></div></section>
    </div>
  </main>;
}

function Metric({ title, value, icon }: { title: string; value: number; icon?: React.ReactNode }) { return <article className="rounded-[20px] border border-[#e7e4f0] bg-white p-4"><span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400">{icon}{title}</span><b className="mt-1 block text-2xl font-black">{value}</b></article>; }
function Status({ active, on, off }: { active: boolean; on: string; off: string }) { return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{active ? on : off}</span>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl bg-[#faf9fd] px-4 py-6 text-center text-sm text-slate-500">{text}</div>; }
