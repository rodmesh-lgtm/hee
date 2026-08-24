import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/db";

function date(value: Date | null | undefined) { return value ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—"; }
function sar(halalas: number | null | undefined) { return halalas == null ? "—" : new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(halalas / 100); }

export default async function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const user = await db.user.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      passwordHash: true,
      createdAt: true,
      updatedAt: true,
      sessions: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, createdAt: true, expiresAt: true } },
      authIdentities: { orderBy: { createdAt: "asc" }, select: { id: true, provider: true, providerEmail: true, createdAt: true } },
      redeemedAccessGrants: {
        orderBy: { redeemedAt: "desc" },
        take: 20,
        select: { id: true, redeemedAt: true, revokedAt: true, business: { select: { id: true, name: true } }, plan: { select: { code: true, name: true } }, subscription: { select: { status: true, provider: true, endsAt: true } } },
      },
      businesses: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true, name: true, slug: true, createdAt: true, updatedAt: true, isPublished: true, isVerified: true, onboardingCompleted: true,
          plan: { select: { code: true, name: true, monthlyPrice: true } },
          subscriptions: { orderBy: { createdAt: "desc" }, take: 5, select: { id: true, status: true, provider: true, autoRenew: true, startsAt: true, endsAt: true } },
          _count: { select: { products: true, services: true, customers: true, orders: true, bookings: true, businessStoreOrders: true } },
        },
      },
    },
  });
  if (!user) notFound();

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-[#1f2552] sm:px-6"><div className="mx-auto max-w-6xl space-y-5">
    <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5"><Link href="/admin/customers" className="inline-flex items-center gap-2 text-xs font-black text-[#5d49cc]"><ArrowRight className="h-4 w-4" />العودة للعملاء</Link><div className="mt-4 flex items-center gap-2 text-[#6f3bd2]"><UserRound className="h-5 w-5" /><span className="text-xs font-black">حساب HEE</span></div><h1 className="mt-2 text-2xl font-black">{user.name}</h1><p className="mt-1 text-sm text-slate-500">{user.email}</p><div className="mt-3 flex flex-wrap gap-2"><Badge text={user.emailVerifiedAt ? "البريد موثق" : "البريد غير موثق"} good={Boolean(user.emailVerifiedAt)} /><Badge text={`${user.businesses.length} منشأة`} good /><Badge text={user.passwordHash ? "Local credential موجود" : "بدون Local credential"} good={Boolean(user.passwordHash)} /></div></header>

    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">ملكية الحساب</h2><dl className="mt-4 space-y-3 text-sm"><Row label="User ID" value={<Code>{user.id}</Code>} /><Row label="البريد" value={user.email} /><Row label="تم توثيق البريد" value={date(user.emailVerifiedAt)} /><Row label="إنشاء الحساب" value={date(user.createdAt)} /><Row label="آخر تحديث" value={date(user.updatedAt)} /></dl></article><article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#6f3bd2]" /><h2 className="font-black">طرق الدخول</h2></div><div className="mt-4 space-y-2">{user.authIdentities.map((identity) => <div key={identity.id} className="rounded-2xl bg-[#faf9fd] p-3 text-xs"><b>{identity.provider}</b><span className="mt-1 block text-slate-500">{identity.providerEmail ?? "بدون بريد مخزن"}</span><span className="mt-1 block text-slate-400">ربط: {date(identity.createdAt)}</span></div>)}{!user.authIdentities.length ? <div className="rounded-2xl bg-[#faf9fd] p-4 text-sm text-slate-500">لا توجد هوية OAuth مرتبطة؛ قد يكون الدخول محليًا فقط.</div> : null}</div><p className="mt-3 text-[11px] leading-5 text-slate-400">لا تُعرض password hashes أو tokens أو OAuth subjects في هذه الصفحة.</p></article></section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><div className="flex items-center gap-2"><Building2 className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">المنشآت المملوكة</h2></div><div className="mt-4 space-y-3">{user.businesses.map((business) => <article key={business.id} className="rounded-2xl border border-[#ece9f3] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><Link href={`/admin/businesses/${business.id}`} className="font-black text-[#5d49cc]">{business.name}</Link><span className="mt-1 block text-xs text-slate-400">hee.sa/{business.slug}</span></div><div className="flex gap-1"><Badge text={business.isPublished ? "منشورة" : "غير منشورة"} good={business.isPublished} /><Badge text={business.isVerified ? "موثقة" : "غير موثقة"} good={business.isVerified} /></div></div><div className="mt-3 grid gap-2 text-xs sm:grid-cols-3"><Info label="الخطة" value={`${business.plan?.name ?? business.plan?.code ?? "Free"}${business.plan ? ` · ${sar(business.plan.monthlyPrice)}` : ""}`} /><Info label="المحتوى" value={`${business._count.products} منتج · ${business._count.services} خدمة · ${business._count.customers} عميل`} /><Info label="النشاط" value={`${business._count.orders} طلب · ${business._count.bookings} حجز · ${business._count.businessStoreOrders} طلب متجر`} /></div><div className="mt-3 space-y-2">{business.subscriptions.map((subscription) => <div key={subscription.id} className="flex flex-wrap gap-2 rounded-xl bg-[#faf9fd] px-3 py-2 text-[10px] text-slate-500"><Code>{subscription.id}</Code><b className="text-slate-700">{subscription.status}</b><span>{subscription.provider ?? "internal"}</span><span>{subscription.autoRenew ? "autoRenew" : "no-renew"}</span><span>ينتهي {date(subscription.endsAt)}</span></div>)}</div></article>)}{!user.businesses.length ? <p className="rounded-2xl bg-[#faf9fd] p-5 text-center text-sm text-slate-500">لا يملك هذا الحساب منشأة نشطة.</p> : null}</div></section>

    <section className="grid gap-4 lg:grid-cols-2"><article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">منح Access Code</h2><div className="mt-4 space-y-2">{user.redeemedAccessGrants.map((grant) => <div key={grant.id} className="rounded-2xl bg-[#faf9fd] p-3 text-xs"><b>{grant.business.name} · {grant.plan.name}</b><span className="mt-1 block text-slate-500">{grant.revokedAt ? `ملغاة ${date(grant.revokedAt)}` : `نشطة · ${grant.subscription.status} · ${grant.subscription.provider}`}</span><span className="mt-1 block text-slate-400">استُخدمت {date(grant.redeemedAt)}</span></div>)}{!user.redeemedAccessGrants.length ? <p className="text-sm text-slate-500">لا توجد منح مستخدمة.</p> : null}</div></article><article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">الجلسات</h2><p className="mt-1 text-xs text-slate-400">Metadata فقط؛ لا تُعرض session tokens.</p><div className="mt-4 space-y-2">{user.sessions.map((session) => <div key={session.id} className="rounded-2xl bg-[#faf9fd] p-3 text-xs"><span>أُنشئت {date(session.createdAt)}</span><span className="mt-1 block text-slate-400">تنتهي {date(session.expiresAt)}</span></div>)}{!user.sessions.length ? <p className="text-sm text-slate-500">لا توجد جلسات مسجلة.</p> : null}</div></article></section>

    <section className="rounded-[20px] border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><b>وضع آمن Read-only:</b> لا يوجد حذف مستخدم، انتحال جلسة، تعديل emailVerifiedAt، تغيير ملكية منشأة أو تفعيل باقة مدفوعة من مركز الحسابات. العمليات الحساسة تبقى في domains المخصصة لها مع أدلةها وقواعدها.</p></div></section>
  </div></main>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) { return <div className="flex items-start justify-between gap-4 border-b border-[#f0edf5] pb-2 last:border-0"><dt className="text-slate-400">{label}</dt><dd className="max-w-[72%] text-left font-medium" dir="auto">{value}</dd></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#faf9fd] p-3"><span className="text-[10px] text-slate-400">{label}</span><b className="mt-1 block text-slate-700">{value}</b></div>; }
function Badge({ text, good }: { text: string; good: boolean }) { return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${good ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{text}</span>; }
function Code({ children }: { children: React.ReactNode }) { return <code dir="ltr" className="break-all font-mono text-[9px] text-slate-500">{children}</code>; }
