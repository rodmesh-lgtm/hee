import Link from "next/link";
import { ArrowLeft, Lock, Sparkles, WandSparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../lib/active-business";
import { getPlanEntitlements } from "../../lib/plan-entitlements";

export default async function DashboardToolsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessWithPlanForUser(user.id);
  const entitlements = getPlanEntitlements(business?.plan?.code);
  const designerAvailable = Boolean(business && entitlements.offerDesigner);

  return (
    <div className="space-y-5 pb-4">
      <section className="rounded-[28px] border border-[#e8e5f2] bg-[linear-gradient(135deg,#fff_0%,#faf8ff_58%,#f2ecff_100%)] p-5 sm:p-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#efeaff] px-3 py-1 text-[11px] font-black text-[#5b3fd6]"><Sparkles className="h-3.5 w-3.5" /> أدوات iR</span>
        <h1 className="mt-3 text-2xl font-black text-[#1f2552]">أدوات تدعم حضور نشاطك</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">أدوات مساندة مبنية حول هويتك الرقمية. نعرض فقط الأدوات الجاهزة للاستخدام، ونوضح المزايا المرتبطة بالباقة بدون واجهات وهمية.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-[24px] border border-[#e9e7f3] bg-white p-5 shadow-[0_12px_30px_-28px_rgba(58,35,75,.35)]">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]">{designerAvailable ? <WandSparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${designerAvailable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{designerAvailable ? "متاح" : "يتطلب Business"}</span>
          </div>
          <h2 className="mt-4 text-lg font-black text-[#1f2552]">مصمم العروض</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">أنشئ تصميم عرض مربع باستخدام اسم نشاطك وشعارك وألوان الهوية، ثم حمّله كصورة جاهزة للمشاركة.</p>
          {designerAvailable ? (
            <Link href="/dashboard/tools/offers" className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-sm font-black text-white transition hover:bg-[#5e31b8]">فتح مصمم العروض <ArrowLeft className="h-4 w-4" /></Link>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3"><Link href="/dashboard/settings" className="inline-flex h-11 items-center rounded-xl bg-[#6f3bd2] px-4 text-sm font-black text-white">عرض الباقات</Link><span className="text-xs text-slate-400">تتوفر الأداة عند تفعيل باقة مؤهلة.</span></div>
          )}
        </article>

        <article className="rounded-[24px] border border-dashed border-[#ddd7ea] bg-[#fbfaff] p-5">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#7a6d85] ring-1 ring-[#e9e4ef]"><Sparkles className="h-5 w-5" /></span>
          <h2 className="mt-4 text-lg font-black text-[#1f2552]">أدوات إضافية عند جاهزيتها</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500">لن نعرض أدوات غير مكتملة داخل حسابك. أي أداة جديدة ستظهر هنا فقط عندما تصبح قابلة للاستخدام فعليًا.</p>
        </article>
      </section>
    </div>
  );
}
