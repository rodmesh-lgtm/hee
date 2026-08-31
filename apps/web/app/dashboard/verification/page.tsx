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
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-[#6f3bd2]" /><h1 className="text-xl font-black text-[#20264f]">توثيق صفحة المنشأة</h1></div><p className="mt-2 text-sm leading-7 text-slate-500">اطلب مراجعة صفحة منشأتك للحصول على شارة توثيق iR. التوثيق منفصل عن تأكيد البريد ولا يُمنح تلقائيًا.</p></section>

    {params?.verification === "requested" || pending ? <div role="status" aria-live="polite" className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" />طلب التوثيق قيد مراجعة إدارة iR.</div> : null}

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-black text-[#20264f]">{business.name}</h2><p className="mt-1 text-xs text-slate-500">حالة التوثيق الحالية</p></div>{business.isVerified ? <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700"><CheckCircle2 className="h-4 w-4" />موثقة</span> : pending ? <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">قيد المراجعة</span> : <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">غير موثقة</span>}</div>
      {!business.isVerified && !pending ? <form action={requestVerificationAction} className="mt-5"><button className="min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b72dc] focus-visible:ring-offset-2">إرسال طلب التوثيق</button></form> : null}
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#6f3bd2]" /><div><h2 className="font-black text-[#20264f]">كيف يعمل التوثيق؟</h2><p className="mt-2 text-xs leading-6 text-slate-500">يمكن لكل عميل إرسال طلب توثيق صفحته إلى إدارة iR. بعد الإرسال تراجع الإدارة الطلب، ولا يستطيع العميل منح الشارة لنفسه. ويمكن للإدارة كذلك توثيق صفحة مباشرة عند اكتمال المراجعة الداخلية. تظهر الشارة على الصفحة العامة فقط عندما تكون حالة المنشأة موثقة.</p></div></div></section>
  </div>;
}
