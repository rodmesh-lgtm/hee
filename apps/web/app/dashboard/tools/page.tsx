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
      <section className="rounded-[28px] border border-[#dbe8e6] bg-[linear-gradient(135deg,#effbf9,#fff)] p-5 dark:border-[#164443] dark:bg-[linear-gradient(135deg,#082d2e,#061c1f)] sm:p-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#e7f8f5] px-3 py-1 text-[11px] font-black text-[#007f76] dark:bg-[#0a3b3b] dark:text-[#43dfd0]"><Sparkles className="h-3.5 w-3.5" /> INFRO TOOLKIT</span>
        <h1 className="mt-3 text-2xl font-black text-[#0a2426] dark:text-[#f4fffd]">أدوات تنقل هويتك من الحضور إلى الإنجاز</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-300">مساحة أدوات عملية مرتبطة بهويتك وبيانات منشأتك. ستجد هنا فقط ما يعمل فعلًا، مع توضيح جاهزية كل أداة ومتطلبات استخدامها.</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="أدوات INFRO">
        <article className="rounded-[24px] border border-[#dbe8e6] bg-white p-5 shadow-[0_18px_50px_-38px_rgba(7,24,27,.35)] dark:border-[#164443] dark:bg-[#092426] dark:shadow-none">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e7f8f5] text-[#008f87] dark:bg-[#0a3b3b] dark:text-[#43dfd0]">{designerAvailable ? <WandSparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}</span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black ${designerAvailable ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"}`}>{designerAvailable ? "جاهز للاستخدام" : "متاح مع Business"}</span>
          </div>
          <p className="mt-5 text-[10px] font-black tracking-[.16em] text-[#008f87] dark:text-[#43dfd0]">OFFER STUDIO</p>
          <h2 className="mt-2 text-lg font-black text-[#0a2426] dark:text-[#f4fffd]">مصمم العروض</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">حوّل اسم نشاطك وشعارك وألوان هويتك إلى عرض مربع جاهز للمشاركة، دون إعادة إدخال بيانات منشأتك.</p>
          {designerAvailable ? (
            <Link href="/dashboard/tools/offers" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#07181b] px-4 text-sm font-black text-white transition hover:bg-[#0d292d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16b9ab] focus-visible:ring-offset-2 dark:bg-[#24d4c5] dark:text-[#031615] dark:hover:bg-[#43dfd0] dark:focus-visible:ring-offset-[#092426]">فتح الاستوديو <ArrowLeft className="h-4 w-4" /></Link>
          ) : (
            <div className="mt-5 flex flex-wrap items-center gap-3"><Link href="/dashboard/settings" className="inline-flex min-h-11 items-center rounded-xl bg-[#07181b] px-4 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16b9ab] focus-visible:ring-offset-2 dark:bg-[#24d4c5] dark:text-[#031615] dark:focus-visible:ring-offset-[#092426]">عرض الباقات</Link><span className="text-xs text-slate-400 dark:text-slate-400">فعّل باقة مؤهلة لفتح الأداة.</span></div>
          )}
        </article>

        <article className="rounded-[24px] border border-dashed border-[#bdebe5] bg-[#f8fdfc] p-5 dark:border-[#1d5a56] dark:bg-[#082426]">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#008f87] ring-1 ring-[#dbe8e6] dark:bg-[#0a3b3b] dark:text-[#43dfd0] dark:ring-[#1d5a56]"><Sparkles className="h-5 w-5" /></span>
          <p className="mt-5 text-[10px] font-black tracking-[.16em] text-[#008f87] dark:text-[#43dfd0]">QUALITY PROMISE</p>
          <h2 className="mt-2 text-lg font-black text-[#0a2426] dark:text-[#f4fffd]">لا مكان لأدوات تجريبية داخل عملك</h2>
          <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-300">أي أداة جديدة ستظهر هنا بعد اكتمال وظيفتها واختبارها فقط، لتبقى مساحة عملك واضحة وموثوقة.</p>
        </article>
      </section>
    </div>
  );
}
