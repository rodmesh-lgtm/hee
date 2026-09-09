import { BadgeCheck, CheckCircle2, Clock3, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../lib/active-business";
import { hasPendingVerificationRequest, requestVerificationAction } from "../../actions/verification";

export default async function VerificationPage({ searchParams }: { searchParams?: Promise<{ verification?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessWithPlanForUser(user.id);
  if (!business) redirect("/onboarding");
  const params = await searchParams;
  const pending = !business.isVerified && await hasPendingVerificationRequest();

  return <div className="space-y-4 pb-6">
    <section className="rounded-[28px] border border-[#dbe8e6] bg-[linear-gradient(135deg,#effbf9,#fff)] p-5 dark:border-[#164443] dark:bg-[linear-gradient(135deg,#082d2e,#061c1f)] sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e7f8f5] text-[#008f87] dark:bg-[#0a3b3b] dark:text-[#43dfd0]"><BadgeCheck className="h-5 w-5" /></span>
        <div><p className="text-[10px] font-black tracking-[.16em] text-[#008f87] dark:text-[#43dfd0]">INFRO TRUST LAYER</p><h1 className="mt-2 text-2xl font-black text-[#07181b] dark:text-[#f4fffd]">توثيق صفحة المنشأة</h1><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-300">اطلب مراجعة صفحة منشأتك للحصول على شارة توثيق INFRO. التوثيق منفصل عن تأكيد البريد ولا يُمنح تلقائيًا.</p></div>
      </div>
    </section>

    {params?.verification === "requested" || pending ? <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-2xl border border-[#bdebe5] bg-[#effbf9] px-4 py-3 text-sm font-bold text-[#006f69] dark:border-[#1d5a56] dark:bg-[#0a3434] dark:text-[#7cecdf]"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />طلب التوثيق قيد مراجعة فريق INFRO.</div> : null}

    <section className="rounded-[24px] border border-[#dbe8e6] bg-white p-5 dark:border-[#164443] dark:bg-[#092426]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-[10px] font-black tracking-[.14em] text-[#008f87] dark:text-[#43dfd0]">CURRENT STATUS</p><h2 className="mt-2 font-black text-[#07181b] dark:text-[#f4fffd]">{business.name}</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-300">حالة التوثيق الحالية</p></div>
        {business.isVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"><CheckCircle2 className="h-4 w-4" />موثقة</span> : pending ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">قيد المراجعة</span> : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-200">غير موثقة</span>}
      </div>
      {!business.isVerified && !pending ? <form action={requestVerificationAction} className="mt-5"><button className="min-h-11 rounded-xl bg-[#07181b] px-5 text-sm font-black text-white transition hover:bg-[#0d292d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#16b9ab] focus-visible:ring-offset-2 dark:bg-[#24d4c5] dark:text-[#031615] dark:hover:bg-[#43dfd0] dark:focus-visible:ring-offset-[#092426]">إرسال طلب التوثيق</button></form> : null}
    </section>

    <section className="rounded-[24px] border border-[#dbe8e6] bg-white p-5 dark:border-[#164443] dark:bg-[#092426]">
      <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e7f8f5] text-[#008f87] dark:bg-[#0a3b3b] dark:text-[#43dfd0]"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-black text-[#07181b] dark:text-[#f4fffd]">مراجعة بشرية قبل منح الثقة</h2><p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-300">يمكن لكل عميل إرسال طلب توثيق صفحته إلى إدارة INFRO. يراجع الفريق الطلب وبيانات المنشأة، ولا يستطيع العميل منح الشارة لنفسه. تظهر الشارة على الصفحة العامة فقط بعد اكتمال المراجعة واعتماد المنشأة.</p></div></div>
    </section>
  </div>;
}
