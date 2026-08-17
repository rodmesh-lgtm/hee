import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Building2, CheckCircle2, CircleDashed, ExternalLink, Eye, Palette, Rocket, Settings2, UserRound, UsersRound } from "lucide-react";
import { getCurrentUser } from "../lib/auth";
import { db } from "../lib/db";
import { getPublicBusinessUrlFromRequest } from "../lib/public-url";

export default async function DashboardHomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: {
      plan: true,
      services: { where: { isActive: true } },
      branches: { where: { isActive: true } },
      contactPersons: { where: { isActive: true } },
      galleryItems: { where: { isActive: true } },
    },
  });

  if (!business) {
    return (
      <section className="mx-auto max-w-3xl rounded-[28px] border border-[#e9e7f3] bg-white p-6 sm:p-8">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1edff] text-[#5b3fd6]"><Rocket className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-black text-[#1f2552]">ابدأ هويتك الرقمية</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">أنشئ بيانات نشاطك أولاً، وبعدها ستتمكن من تجهيز الصفحة واختيار المظهر ونشرها للعملاء.</p>
        <Link href="/onboarding" className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white">إنشاء النشاط</Link>
      </section>
    );
  }

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const checks = [
    { label: "بيانات النشاط", ready: Boolean(business.name && business.businessType && business.shortDescription), href: "/dashboard/my-page?edit=1", icon: UserRound },
    { label: "وسائل التواصل", ready: Boolean(business.phone || business.whatsapp), href: "/dashboard/my-page?edit=1", icon: Settings2 },
    { label: "الخدمات", ready: business.services.length > 0, href: "/dashboard/page-builder", icon: CircleDashed },
    { label: "الفروع", ready: business.branches.length > 0, href: "/dashboard/directory", icon: Building2 },
    { label: "فريق العمل", ready: business.contactPersons.length > 0, href: "/dashboard/directory", icon: UsersRound },
    { label: "المظهر", ready: Boolean(business.primaryColor), href: "/dashboard/branding", icon: Palette },
  ];
  const completed = checks.filter((item) => item.ready).length;
  const readiness = Math.round((completed / checks.length) * 100);
  const planName = business.plan?.name || "Free";

  return (
    <div className="space-y-5 pb-4">
      <section className="overflow-hidden rounded-[28px] border border-[#e7e5f2] bg-[linear-gradient(135deg,#ffffff_0%,#f8f5ff_68%,#f1ecff_100%)] p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#efeaff] px-3 py-1 text-[11px] font-black text-[#5b3fd6]">HEE · هوية أعمال رقمية</span><span className={`rounded-full px-3 py-1 text-[11px] font-black ${business.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{business.isPublished ? "منشورة" : "غير منشورة"}</span></div>
            <h1 className="mt-3 text-2xl font-black text-[#1f2552] sm:text-3xl">مرحباً، {business.name}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">هذه مساحة إدارة هويتك الرقمية. أكمل العناصر الأساسية، اختر المظهر المناسب، ثم شارك صفحتك مع عملائك.</p>
          </div>
          <div className="flex flex-wrap gap-2"><Link href="/dashboard/my-page?edit=1" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-sm font-black text-white"><Settings2 className="h-4 w-4" /> تعديل الصفحة</Link>{business.isPublished ? <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#ddd8f4] bg-white px-4 text-sm font-black text-[#4f43d9]"><Eye className="h-4 w-4" /> عرض الصفحة</a> : null}</div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="rounded-[24px] border border-[#e9e7f3] bg-white p-5">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-[#1f2552]">جاهزية الصفحة</h2><p className="mt-1 text-xs text-slate-500">أكمل الخطوات قبل دعوة العملاء.</p></div><div className="text-left"><div className="text-2xl font-black text-[#5b3fd6]">{readiness}%</div><div className="text-[10px] text-slate-400">{completed} من {checks.length}</div></div></div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#f0eef8]"><div className="h-full rounded-full bg-[#6f3bd2] transition-all" style={{ width: `${readiness}%` }} /></div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">{checks.map((item) => { const Icon = item.icon; return <Link key={item.label} href={item.href} className="flex items-center gap-3 rounded-2xl border border-[#efedf6] px-3 py-3 transition hover:bg-[#faf9ff]"><span className={`grid h-9 w-9 place-items-center rounded-xl ${item.ready ? "bg-emerald-50 text-emerald-600" : "bg-[#f4f1fb] text-[#6945cc]"}`}>{item.ready ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><b className="block text-sm text-[#252a4a]">{item.label}</b><span className="text-[10px] text-slate-400">{item.ready ? "مكتمل" : "يحتاج إكمال"}</span></div></Link>; })}</div>
        </div>

        <div className="space-y-4">
          <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">الباقة الحالية</p><h2 className="mt-1 text-xl font-black text-[#1f2552]">{planName}</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><Rocket className="h-5 w-5" /></span></div><p className="mt-3 text-xs leading-6 text-slate-500">الثيمات المميزة والتوثيق وحدود الفروع والفريق الأعلى متاحة عبر الباقات المدفوعة.</p><Link href="/dashboard/branding" className="mt-4 inline-flex items-center gap-2 text-sm font-black text-[#5b3fd6]">استعراض المظهر والباقات <ExternalLink className="h-4 w-4" /></Link></section>
          <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-5"><div className="flex items-center gap-3"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${business.isVerified ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"}`}><BadgeCheck className="h-5 w-5" /></span><div><h2 className="font-black text-[#1f2552]">توثيق HEE</h2><p className="text-xs text-slate-500">{business.isVerified ? "نشاطك موثق" : "غير موثق حاليًا"}</p></div></div>{!business.isVerified ? <><p className="mt-3 text-xs leading-6 text-slate-500">التوثيق متاح عبر الباقات المؤهلة وبعد مراجعة HEE واعتماد بيانات المنشأة.</p><Link href="/dashboard/branding" className="mt-3 inline-flex text-xs font-black text-[#6543ce]">التوثيق والباقات</Link></> : null}</section>
        </div>
      </section>
    </div>
  );
}
