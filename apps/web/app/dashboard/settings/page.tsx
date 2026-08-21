import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CreditCard, Globe2, Mail, ShieldCheck, UserRound } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../lib/active-business";
import { EmailVerificationCard } from "../../../components/dashboard/email-verification-card";

export default async function DashboardSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessWithPlanForUser(user.id);

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-4 sm:p-5"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1edff] text-[#6543ce]"><UserRound className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#1f2552]">الحساب والباقات</h1><p className="mt-1 text-sm text-slate-500">بيانات حسابك وحالة اشتراكك.</p></div></div></section>

    <section className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><h2 className="font-black text-[#1f2552]">الحساب</h2><div className="mt-3 space-y-2"><div className="flex items-center gap-3 rounded-xl bg-[#faf9fd] p-3"><UserRound className="h-4 w-4 text-[#6543ce]" /><div className="min-w-0"><span className="block text-[10px] text-slate-400">الاسم</span><b className="block truncate text-sm text-[#252a4a]">{user.name}</b></div></div><div className="flex items-center gap-3 rounded-xl bg-[#faf9fd] p-3"><Mail className="h-4 w-4 text-[#6543ce]" /><div className="min-w-0"><span className="block text-[10px] text-slate-400">البريد الإلكتروني</span><b className="block truncate text-sm text-[#252a4a]">{user.email}</b></div></div></div><EmailVerificationCard verified={Boolean(user.emailVerifiedAt)} /></article>

      <article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><div className="flex items-center justify-between"><div><span className="text-[10px] font-bold text-slate-400">الباقة الحالية</span><h2 className="mt-1 text-xl font-black text-[#1f2552]">{business?.plan?.name || "Free"}</h2></div><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1edff] text-[#6543ce]"><CreditCard className="h-5 w-5" /></span></div><p className="mt-3 text-xs leading-6 text-slate-500">الباقات الأعلى ترفع حدود الفروع وفريق التواصل وتمنح أهلية طلب التوثيق. الثيمات الإضافية ستُطرح بعد اعتمادها بصريًا.</p><Link href="/dashboard/branding" className="mt-4 inline-flex h-10 items-center rounded-xl bg-[#5b3fd6] px-4 text-xs font-black text-white">المظهر والترقية</Link></article>
    </section>

    {business ? <section className="grid gap-2 sm:grid-cols-3"><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><Globe2 className="h-4 w-4 text-[#6543ce]" /><span className="mt-2 block text-[10px] text-slate-400">رابط الصفحة</span><b className="mt-1 block truncate text-xs text-[#252a4a]">hee.sa/{business.slug}</b></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><ShieldCheck className={`h-4 w-4 ${business.isPublished ? "text-emerald-600" : "text-amber-500"}`} /><span className="mt-2 block text-[10px] text-slate-400">النشر</span><b className="mt-1 block text-xs text-[#252a4a]">{business.isPublished ? "منشورة" : "غير منشورة"}</b></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><BadgeCheck className={`h-4 w-4 ${business.isVerified ? "text-blue-600" : "text-slate-400"}`} /><span className="mt-2 block text-[10px] text-slate-400">التوثيق</span><b className="mt-1 block text-xs text-[#252a4a]">{business.isVerified ? "موثق" : "غير موثق"}</b></article></section> : null}
  </div>;
}
