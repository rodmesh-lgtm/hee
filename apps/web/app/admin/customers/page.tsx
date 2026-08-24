import Link from "next/link";
import { Search, UserRound, ShieldCheck } from "lucide-react";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";

const PAGE_SIZE = 40;

function clean(value: unknown, max = 160) { return String(value ?? "").trim().slice(0, max); }
function date(value: Date | null | undefined) { return value ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—"; }

export default async function AdminCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; verification?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = clean(params.q);
  const verification = params.verification === "verified" || params.verification === "unverified" ? params.verification : "";
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  const where = {
    deletedAt: null,
    ...(verification === "verified" ? { emailVerifiedAt: { not: null } } : {}),
    ...(verification === "unverified" ? { emailVerifiedAt: null } : {}),
    ...(q ? { OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { email: { contains: q, mode: "insensitive" as const } },
      { businesses: { some: { deletedAt: null, OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { slug: { contains: q, mode: "insensitive" as const } },
      ] } } },
    ] } : {}),
  };

  const [users, count, verifiedCount, unverifiedCount] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        authIdentities: { select: { provider: true } },
        businesses: {
          where: { deletedAt: null },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            name: true,
            slug: true,
            isPublished: true,
            isVerified: true,
            plan: { select: { code: true, name: true } },
            subscriptions: {
              where: { status: { in: ["active", "past_due"] } },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { status: true, provider: true, endsAt: true },
            },
            _count: { select: { products: true, services: true, orders: true, bookings: true } },
          },
        },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.user.count({ where }),
    db.user.count({ where: { deletedAt: null, emailVerifiedAt: { not: null } } }),
    db.user.count({ where: { deletedAt: null, emailVerifiedAt: null } }),
  ]);

  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-[#1f2552] sm:px-6"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5"><div className="flex items-center gap-2 text-[#6f3bd2]"><UserRound className="h-5 w-5" /><span className="text-xs font-black">إدارة HEE المركزية</span></div><h1 className="mt-2 text-2xl font-black">العملاء والحسابات</h1><p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">قراءة تشغيلية لحسابات ملاك المنشآت وملكية البريد والمنشآت والخطط الحالية. لا يوجد انتحال جلسة، ولا حذف حساب، ولا تعديل اشتراك من هذه الصفحة.</p></header>

    <section className="grid gap-3 sm:grid-cols-3"><Metric label="الحسابات المطابقة" value={count} /><Metric label="البريد الموثق" value={verifiedCount} /><Metric label="البريد غير الموثق" value={unverifiedCount} /></section>

    <form className="grid gap-3 rounded-[22px] border border-[#e7e4f0] bg-white p-4 md:grid-cols-[1fr_210px_auto]" action="/admin/customers">
      <label className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={q} placeholder="اسم، بريد، منشأة أو slug" className="min-h-10 w-full rounded-xl border border-[#e4e0ec] pr-10 pl-3 text-sm" /></label>
      <select name="verification" defaultValue={verification} className="min-h-10 rounded-xl border border-[#e4e0ec] px-3 text-sm"><option value="">كل حالات البريد</option><option value="verified">موثق</option><option value="unverified">غير موثق</option></select>
      <button className="min-h-10 rounded-xl bg-[#20264f] px-5 text-xs font-black text-white">تطبيق</button>
    </form>

    <section className="overflow-hidden rounded-[24px] border border-[#e7e4f0] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1180px] text-right text-xs"><thead className="bg-[#fbfbfd] text-slate-400"><tr><th className="p-3">صاحب الحساب</th><th>البريد</th><th>الدخول</th><th>المنشآت</th><th>الحالة التجارية</th><th>المحتوى والمعاملات</th><th>التسجيل</th><th>التفاصيل</th></tr></thead><tbody>{users.map((user) => {
      const providers = [...new Set(user.authIdentities.map((identity) => identity.provider))];
      const primary = user.businesses[0];
      const entitlement = primary?.subscriptions[0];
      const totals = user.businesses.reduce((acc, business) => ({ products: acc.products + business._count.products, services: acc.services + business._count.services, transactions: acc.transactions + business._count.orders + business._count.bookings }), { products: 0, services: 0, transactions: 0 });
      return <tr key={user.id} className="border-t border-[#f0edf5] align-top"><td className="p-3"><b className="block text-sm">{user.name}</b><code className="mt-1 block text-[9px] text-slate-400" dir="ltr">{user.id}</code></td><td><span className="font-medium">{user.email}</span><span className={`mt-1 block text-[10px] font-black ${user.emailVerifiedAt ? "text-emerald-700" : "text-amber-700"}`}>{user.emailVerifiedAt ? "موثق" : "غير موثق"}</span></td><td><span>{providers.length ? providers.join(" · ") : "password/local"}</span><span className="mt-1 block text-[10px] text-slate-400">{user._count.sessions} جلسة حالية/مسجلة</span></td><td><b>{user.businesses.length}</b>{primary ? <span className="mt-1 block text-[10px] text-slate-400">{primary.name}</span> : <span className="mt-1 block text-[10px] text-slate-400">لا توجد منشأة</span>}</td><td>{primary ? <><span className="font-black text-[#5d49cc]">{primary.plan?.name ?? primary.plan?.code ?? "Free"}</span><span className="mt-1 block text-[10px] text-slate-400">{entitlement ? `${entitlement.status} · ${entitlement.provider ?? "internal"}` : "لا اشتراك حالي"}</span><span className="mt-1 block text-[10px] text-slate-400">{primary.isPublished ? "منشورة" : "غير منشورة"} · {primary.isVerified ? "موثقة" : "غير موثقة"}</span></> : "—"}</td><td>{totals.products} منتج · {totals.services} خدمة<span className="mt-1 block text-[10px] text-slate-400">{totals.transactions} طلب/حجز</span></td><td>{date(user.createdAt)}</td><td><Link href={`/admin/customers/${user.id}`} className="rounded-xl bg-[#f3efff] px-3 py-2 font-black text-[#5d49cc]">فتح الحساب</Link></td></tr>;
    })}{!users.length ? <tr><td colSpan={8} className="p-10 text-center text-slate-400">لا توجد حسابات مطابقة.</td></tr> : null}</tbody></table></div></section>

    {pages > 1 ? <nav className="flex items-center justify-between text-xs"><span>الصفحة {page} من {pages}</span><div className="flex gap-2">{page > 1 ? <Link className="rounded-xl border bg-white px-4 py-2 font-black" href={{ pathname: "/admin/customers", query: { q, verification, page: page - 1 } }}>السابق</Link> : null}{page < pages ? <Link className="rounded-xl border bg-white px-4 py-2 font-black" href={{ pathname: "/admin/customers", query: { q, verification, page: page + 1 } }}>التالي</Link> : null}</div></nav> : null}

    <section className="rounded-[20px] border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><b>حد الأمان:</b> حالة البريد هنا دليل ملكية فقط. هذه الجولة لا تضيف زرًا لتزوير emailVerifiedAt ولا مسار حذف/انتحال/تفعيل باقة مدفوعة.</p></div></section>
  </div></main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-[#e7e4f0] bg-white p-4"><span className="text-xs text-slate-400">{label}</span><b className="mt-1 block text-xl">{value}</b></div>; }
