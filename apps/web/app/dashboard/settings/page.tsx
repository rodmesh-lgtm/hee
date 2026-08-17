import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CreditCard, Globe2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";

export default async function DashboardSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await db.business.findFirst({ where: { ownerId: user.id }, include: { plan: true } });

  return (
    <div className="space-y-5 pb-4">
      <section className="rounded-[28px] border border-[#e8e5f2] bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><UserRound className="h-5 w-5" /></span><div><h1 className="text-2xl font-black text-[#1f2552]">الحساب والاشتراك</h1><p className="mt-1 text-sm text-slate-500">بيانات حسابك وحالة صفحتك وباقتك في HEE.</p></div></div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[24px] border border-[#e9e7f3] bg-white p-5"><h2 className="font-black text-[#1f2552]">بيانات الحساب</h2><div className="mt-4 space-y-3"><div className="flex items-center gap-3 rounded-2xl bg-[#faf9fd] p-3"><UserRound className="h-4 w-4 text-[#6543ce]" /><div><span className="block text-[10px] text-slate-400">الاسم</span><b className="text-sm text-[#252a4a]">{user.name}</b></div></div><div className="flex items-center gap-3 rounded-2xl bg-[#faf9fd] p-3"><Mail className="h-4 w-4 text-[#6543ce]" /><div><span className="block text-[10px] text-slate-400">البريد الإلكتروني</span><b className="text-sm text-[#252a4a]">{user.email}</b></div></div></div></article>

        <article className="rounded-[24px] border border-[#e9e7f3] bg-white p-5"><div className="flex items-center justify-between"><div><span className="text-[10px] font-bold text-slate-400">الباقة الحالية</span><h2 className="mt-1 text-xl font-black text-[#1f2552]">{business?.plan?.name || "Free"}</h2></div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><CreditCard className="h-5 w-5" /></span></div><p className="mt-3 text-xs leading-6 text-slate-500">الترقية ستفتح مزايا إضافية مثل الثيمات المميزة، أهلية طلب التوثيق، وحدود أعلى للفروع وأعضاء الفريق.</p><Link href="/dashboard/branding" className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#5b3fd6] px-4 text-sm font-black text-white">عرض الباقات والمزايا</Link></article>
      </section>

      {business ? <section className="grid gap-3 md:grid-cols-3"><article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><Globe2 className="h-5 w-5 text-[#6543ce]" /><span className="mt-3 block text-[10px] text-slate-400">رابط الصفحة</span><b className="mt-1 block truncate text-sm text-[#252a4a]">hee.sa/{business.slug}</b></article><article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><ShieldCheck className={`h-5 w-5 ${business.isPublished ? "text-emerald-600" : "text-amber-500"}`} /><span className="mt-3 block text-[10px] text-slate-400">حالة النشر</span><b className="mt-1 block text-sm text-[#252a4a]">{business.isPublished ? "منشورة" : "غير منشورة"}</b></article><article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><BadgeCheck className={`h-5 w-5 ${business.isVerified ? "text-blue-600" : "text-slate-400"}`} /><span className="mt-3 block text-[10px] text-slate-400">توثيق HEE</span><b className="mt-1 block text-sm text-[#252a4a]">{business.isVerified ? "موثق" : "غير موثق"}</b></article></section> : null}

      <section className="rounded-[22px] border border-[#e9e7f3] bg-[#faf9fd] p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-[#6543ce]" /><div><h3 className="font-black text-[#1f2552]">سياسة التوثيق</h3><p className="mt-1 text-xs leading-6 text-slate-500">شراء باقة مؤهلة لا يفعّل الشارة تلقائيًا. يتم التحقق من بيانات المنشأة ومراجعتها من إدارة HEE قبل اعتماد التوثيق.</p></div></div></section>
    </div>
  );
}
