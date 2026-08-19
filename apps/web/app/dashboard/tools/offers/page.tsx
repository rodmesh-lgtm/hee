import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { OfferDesigner } from "../../../../components/dashboard/offer-designer";
import { getCurrentUser } from "../../../lib/auth";
import { db } from "../../../lib/db";
import { getPlanEntitlements } from "../../../lib/plan-entitlements";
import { getPublicBusinessUrlFromRequest } from "../../../lib/public-url";

export default async function DashboardOffersDesignerPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, include: { plan: true } });

  if (!business) {
    return (
      <section className="space-y-3 rounded-[28px] border border-dashed border-[#ddd7ea] bg-white p-6">
        <h1 className="text-2xl font-black text-[#1f2552]">مصمم العروض</h1>
        <p className="text-sm text-slate-500">أنشئ نشاطك أولاً لتفعيل مصمم العروض.</p>
        <Link href="/onboarding" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#6f3bd2] px-5 text-sm font-bold text-white">إنشاء هويتي الرقمية</Link>
      </section>
    );
  }

  const entitlements = getPlanEntitlements(business.plan?.code);
  if (!entitlements.offerDesigner) {
    return (
      <section className="space-y-5 rounded-[28px] border border-[#e8e5f2] bg-white p-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600"><Lock className="h-5 w-5" /></div>
        <h1 className="text-2xl font-black text-[#1f2552]">مصمم العروض</h1>
        <p className="text-sm leading-7 text-slate-500">هذه الأداة مرتبطة بالباقة. عند تفعيل باقة مؤهلة ستتمكن من إنشاء التصاميم وتحميلها مباشرة.</p>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700"><Lock className="h-3.5 w-3.5" /> ميزة مدفوعة</div>
        <div className="flex flex-wrap gap-2"><Link href="/dashboard/branding" className="inline-flex h-11 items-center justify-center rounded-xl bg-[#6f3bd2] px-5 text-sm font-bold text-white">عرض الباقات</Link><Link href="/dashboard/tools" className="inline-flex h-11 items-center justify-center rounded-xl border border-[#ded8ec] bg-white px-5 text-sm font-bold text-slate-700">العودة للأدوات</Link></div>
      </section>
    );
  }

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-[28px] border border-[#e8e5f2] bg-[linear-gradient(135deg,#fff_0%,#faf8ff_100%)] p-6">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><Sparkles className="h-5 w-5" /></div>
        <h1 className="text-3xl font-black text-[#1f2552]">مصمم العروض</h1>
        <p className="text-sm text-slate-500">أنشئ عرضًا مربعًا 1080×1080 باستخدام هوية نشاطك ثم حمّله كصورة PNG.</p>
      </section>
      <OfferDesigner businessName={business.name} logoUrl={business.logoUrl} primaryColor={business.primaryColor} phone={business.phone} whatsapp={business.whatsapp} publicUrl={publicUrl} />
    </div>
  );
}
