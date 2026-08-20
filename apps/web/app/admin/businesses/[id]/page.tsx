import Link from "next/link";
import { ExternalLink, Mail, MapPin, Phone, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/db";

export default async function AdminBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const business = await db.business.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      name: true,
      nameEn: true,
      slug: true,
      businessType: true,
      businessCategory: true,
      description: true,
      city: true,
      district: true,
      address: true,
      phone: true,
      whatsapp: true,
      email: true,
      website: true,
      isPublished: true,
      isVerified: true,
      onboardingCompleted: true,
      onboardingStep: true,
      createdAt: true,
      updatedAt: true,
      publishedAt: true,
      owner: { select: { id: true, name: true, email: true, createdAt: true } },
      plan: { select: { code: true, name: true, monthlyPrice: true } },
      _count: { select: { products: true, services: true, customers: true, orders: true, bookings: true, branches: true, contactPersons: true, galleryItems: true } },
    },
  });
  if (!business) notFound();

  const [recentOrders, recentBookings] = await Promise.all([
    db.order.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, status: true, orderType: true, total: true, createdAt: true, customer: { select: { name: true, phone: true } } } }),
    db.booking.findMany({ where: { businessId: business.id }, orderBy: { createdAt: "desc" }, take: 8, select: { id: true, status: true, bookingDate: true, bookingTime: true, createdAt: true, customer: { select: { name: true, phone: true } }, service: { select: { name: true } } } }),
  ]);

  const date = (value: Date | null) => value ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#1f2552] sm:px-6">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><Link href="/admin" className="text-xs font-black text-[#6f3bd2]">← إدارة المنصة</Link><h1 className="mt-3 text-2xl font-black">{business.name}</h1><p className="mt-1 text-sm text-slate-500">hee.sa/{business.slug} · {business.businessType}</p></div><div className="flex gap-2"><a href={`/${business.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">فتح الصفحة العامة<ExternalLink className="h-4 w-4" /></a></div></div>
        <div className="mt-4 flex flex-wrap gap-2"><Status active={business.isPublished} on="منشورة" off="غير منشورة" /><Status active={business.isVerified} on="موثقة" off="غير موثقة" /><Status active={business.onboardingCompleted} on="الإعداد مكتمل" off={`الإعداد: ${business.onboardingStep ?? "غير مكتمل"}`} /><span className="rounded-full bg-[#f3efff] px-3 py-1 text-[11px] font-black text-[#5d49cc]">{business.plan?.name ?? "Free"}</span></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric title="المنتجات" value={business._count.products} /><Metric title="الخدمات" value={business._count.services} /><Metric title="العملاء" value={business._count.customers} /><Metric title="الطلبات والحجوزات" value={business._count.orders + business._count.bookings} /></section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">بيانات المالك</h2><div className="mt-4 space-y-3 text-sm"><Row label="الاسم" value={business.owner.name} /><Row label="البريد" value={business.owner.email} /><Row label="تاريخ الحساب" value={date(business.owner.createdAt)} /><Row label="معرّف المستخدم" value={business.owner.id} mono /></div></article>
        <article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">بيانات المنشأة</h2><div className="mt-4 space-y-3 text-sm"><Row label="التصنيف" value={business.businessCategory ?? business.businessType} /><Row label="الخطة" value={`${business.plan?.name ?? "Free"}${business.plan ? ` · ${business.plan.monthlyPrice} ر.س` : ""}`} /><Row label="أُنشئت" value={date(business.createdAt)} /><Row label="آخر تحديث" value={date(business.updatedAt)} /><Row label="آخر نشر" value={date(business.publishedAt)} /></div></article>
      </section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">التواصل والموقع</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Contact icon={<Mail className="h-4 w-4" />} label="البريد" value={business.email} /><Contact icon={<Phone className="h-4 w-4" />} label="الهاتف" value={business.phone} /><Contact icon={<Phone className="h-4 w-4" />} label="واتساب" value={business.whatsapp} /><Contact icon={<MapPin className="h-4 w-4" />} label="الموقع" value={[business.city, business.district, business.address].filter(Boolean).join(" · ") || null} /></div>{business.description ? <p className="mt-4 rounded-2xl bg-[#faf9fd] p-4 text-sm leading-7 text-slate-600">{business.description}</p> : null}</section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">آخر الطلبات</h2><div className="mt-4 space-y-2">{recentOrders.length ? recentOrders.map((order) => <div key={order.id} className="rounded-2xl border border-[#eeebf4] p-3 text-xs"><div className="flex items-center justify-between gap-3"><b>{order.customer.name}</b><Status active={order.status === "confirmed" || order.status === "completed"} on={order.status} off={order.status} /></div><span className="mt-1 block text-slate-500">{order.customer.phone} · {order.orderType} · {order.total} ر.س</span><span className="mt-1 block text-slate-400">{date(order.createdAt)}</span></div>) : <Empty text="لا توجد طلبات." />}</div></article>
        <article className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">آخر الحجوزات</h2><div className="mt-4 space-y-2">{recentBookings.length ? recentBookings.map((booking) => <div key={booking.id} className="rounded-2xl border border-[#eeebf4] p-3 text-xs"><div className="flex items-center justify-between gap-3"><b>{booking.customer.name}</b><Status active={booking.status === "confirmed" || booking.status === "completed"} on={booking.status} off={booking.status} /></div><span className="mt-1 block text-slate-500">{booking.service?.name ?? "خدمة"} · {booking.bookingDate} {booking.bookingTime}</span><span className="mt-1 block text-slate-400">{booking.customer.phone}</span></div>) : <Empty text="لا توجد حجوزات." />}</div></article>
      </section>

      <section className="rounded-[20px] border border-blue-200 bg-blue-50 p-4 text-xs leading-6 text-blue-900"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><b>وضع الإدارة الحالي Read-only للعميل:</b> تستطيع الإدارة مراجعة المنشأة وصفحتها ومعاملاتها، لكن لا تدخل جلسة العميل ولا تعدل صفحته باسمه. إذا أضفنا دعمًا مباشرًا لاحقًا فسيكون بتفويض مؤقت وسجل تدقيق واضح.</p></div></section>
    </div>
  </main>;
}

function Metric({ title, value }: { title: string; value: number }) { return <article className="rounded-[20px] border border-[#e7e4f0] bg-white p-4"><span className="text-[10px] font-bold text-slate-400">{title}</span><b className="mt-1 block text-2xl font-black">{value}</b></article>; }
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="flex items-start justify-between gap-4 border-b border-[#f0edf5] pb-2 last:border-0"><span className="text-slate-400">{label}</span><span className={`text-left font-bold text-slate-700 ${mono ? "font-mono text-[11px]" : ""}`}>{value}</span></div>; }
function Contact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null }) { return <div className="rounded-2xl bg-[#faf9fd] p-3"><span className="flex items-center gap-2 text-[10px] font-bold text-slate-400">{icon}{label}</span><b className="mt-1 block break-words text-xs text-slate-700">{value || "—"}</b></div>; }
function Status({ active, on, off }: { active: boolean; on: string; off: string }) { return <span className={`rounded-full px-2 py-1 text-[10px] font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{active ? on : off}</span>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl bg-[#faf9fd] px-4 py-6 text-center text-sm text-slate-500">{text}</div>; }
