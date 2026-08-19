import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, CheckCircle2, Crown, ImagePlus, LockKeyhole, Palette } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { getPlanEntitlements, normalizePlanCode } from "../../lib/plan-entitlements";
import { hasPendingVerificationRequest, requestVerificationAction } from "../../actions/verification";
import { requestPlanUpgradeAction } from "../../actions/subscription-request";
import { updateBrandingImagesFromDashboardAction } from "../../actions/branding-images";

export default async function DashboardBrandingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, include: { plan: true } });
  if (!business) redirect("/onboarding");

  const params = await searchParams;
  const verificationParam = Array.isArray(params?.verification) ? params.verification[0] : params?.verification;
  const upgradeParam = Array.isArray(params?.upgrade) ? params.upgrade[0] : params?.upgrade;
  const imagesParam = Array.isArray(params?.images) ? params.images[0] : params?.images;
  const entitlements = getPlanEntitlements(business.plan?.code);
  const currentPlan = normalizePlanCode(business.plan?.code);
  const verificationPending = !business.isVerified && await hasPendingVerificationRequest(business.id);

  return <div className="space-y-4 pb-4">
    {verificationParam === "requested" || verificationPending ? <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />طلب التوثيق قيد المراجعة.</div> : null}
    {verificationParam === "upgrade" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">التوثيق متاح ضمن الباقات المؤهلة.</div> : null}
    {upgradeParam === "unavailable" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">الباقة المطلوبة غير متاحة حاليًا. لم يتم إنشاء طلب ترقية.</div> : null}
    {upgradeParam === "pending" ? <div className="rounded-2xl border border-[#d9cff8] bg-[#f7f4ff] px-4 py-3 text-sm font-bold text-[#5638b8]">لديك طلب ترقية قيد المراجعة بالفعل. انتظر نتيجة الطلب الحالي قبل إنشاء طلب آخر.</div> : null}
    {upgradeParam && !["current", "unavailable", "pending"].includes(upgradeParam) ? <div className="rounded-2xl border border-[#d9cff8] bg-[#f7f4ff] px-4 py-3 text-sm font-bold text-[#5638b8]">تم تسجيل طلب الترقية إلى {upgradeParam.toUpperCase()}.</div> : null}
    {imagesParam === "saved" ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">تم تحديث صور الهوية.</div> : null}
    {imagesParam === "error" ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">تعذر تحديث الصور. تحقق من نوع الملف وحجمه ثم حاول مرة أخرى.</div> : null}

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Palette className="h-5 w-5 text-[#6f3bd2]" /><h1 className="text-xl font-black text-[#20264f]">المظهر</h1></div><p className="mt-1 text-sm text-slate-500">حافظنا على قالب HEE موحد حتى تبدو جميع الصفحات احترافية ومتناسقة.</p></div><Link href="/preview" target="_blank" className="inline-flex h-10 items-center rounded-xl border border-[#ded9f3] bg-[#f7f4ff] px-4 text-xs font-black text-[#5d49cc]">معاينة الصفحة</Link></div>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#f1edff] text-[#6543ce]"><ImagePlus className="h-5 w-5" /></span><div><h2 className="font-black text-[#20264f]">الشعار والغلاف</h2><p className="text-xs text-slate-500">ارفع صور الهوية؛ ستظهر في المعاينة مباشرة بعد الحفظ.</p></div></div>
      <div className="mt-4 grid gap-4 md:grid-cols-[120px_minmax(0,1fr)]">
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border border-[#e7e1ef] bg-[#faf8fd]">{business.logoUrl ? <img src={business.logoUrl} alt="شعار النشاط" className="h-full w-full object-cover" /> : <span className="text-[10px] text-slate-400">لا يوجد شعار</span>}</div>
        <div className="space-y-3"><div className="overflow-hidden rounded-2xl border border-[#e7e1ef] bg-[#faf8fd]">{business.coverUrl ? <img src={business.coverUrl} alt="صورة الغلاف" className="h-24 w-full object-cover" /> : <div className="grid h-24 place-items-center text-xs text-slate-400">لا توجد صورة غلاف</div>}</div><form action={updateBrandingImagesFromDashboardAction} className="grid gap-2 sm:grid-cols-2" encType="multipart/form-data"><input name="logoFile" type="file" accept="image/*" className="block w-full rounded-xl border border-[#ded8e8] bg-white px-3 py-2 text-xs" /><input name="coverFile" type="file" accept="image/*" className="block w-full rounded-xl border border-[#ded8e8] bg-white px-3 py-2 text-xs" /><button className="h-10 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white sm:col-span-2 sm:w-fit">حفظ الصور</button></form></div>
      </div>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-black text-[#20264f]">الثيم</h2><p className="mt-1 text-xs text-slate-500">قالب الإطلاق الحالي موحد لجميع العملاء.</p></div><span className="rounded-full bg-[#f1edff] px-3 py-1 text-[10px] font-black text-[#5d49cc]">HEE Light</span></div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#bfb2f2] bg-[#faf8ff] p-3"><div className="h-14 rounded-xl bg-[linear-gradient(135deg,#fff,#efeaff)]" /><b className="mt-2 block text-sm text-[#20264f]">HEE Light</b><span className="text-[10px] text-emerald-600">مطبق حاليًا</span></div>
        <div className="rounded-2xl border border-[#e9e7f3] bg-[#fbfbfd] p-3 opacity-70"><div className="h-14 rounded-xl bg-[linear-gradient(135deg,#fff,#e9ebf2)]" /><div className="mt-2 flex items-center justify-between"><b className="text-sm text-[#20264f]">Executive</b><LockKeyhole className="h-4 w-4 text-slate-400" /></div><span className="text-[10px] text-slate-400">قريبًا · Business</span></div>
        <div className="rounded-2xl border border-[#e9e7f3] bg-[#fbfbfd] p-3 opacity-70"><div className="h-14 rounded-xl bg-[linear-gradient(135deg,#fff,#ede3ff)]" /><div className="mt-2 flex items-center justify-between"><b className="text-sm text-[#20264f]">Signature</b><LockKeyhole className="h-4 w-4 text-slate-400" /></div><span className="text-[10px] text-slate-400">قريبًا · Pro</span></div>
      </div>
    </section>

    <section className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><Crown className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">باقتك: {business.plan?.name || "Free"}</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">الترقية ترفع حدود الفروع والفريق وتتيح طلب التوثيق، ثم تفتح الثيمات المدفوعة عند اعتمادها.</p><div className="mt-4 flex flex-wrap gap-2">{currentPlan === "FREE" ? <form action={requestPlanUpgradeAction}><input type="hidden" name="plan" value="BUSINESS" /><button className="h-10 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">طلب Business</button></form> : null}{currentPlan === "BUSINESS" ? <form action={requestPlanUpgradeAction}><input type="hidden" name="plan" value="PRO" /><button className="h-10 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">طلب Pro</button></form> : null}{currentPlan === "PRO" ? <span className="inline-flex h-10 items-center rounded-xl bg-emerald-50 px-4 text-xs font-black text-emerald-700">أعلى باقة مفعلة</span> : null}<Link href="/dashboard/settings" className="inline-flex h-10 items-center rounded-xl border border-[#e5e1f0] px-4 text-xs font-black text-slate-600">تفاصيل الحساب</Link></div></article>

      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><BadgeCheck className={`h-5 w-5 ${business.isVerified ? "text-blue-600" : "text-[#6f3bd2]"}`} /><h2 className="font-black text-[#20264f]">توثيق HEE</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">الشارة لا تظهر إلا بعد مراجعة المنشأة واعتمادها من HEE.</p>{business.isVerified ? <span className="mt-4 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700">موثق</span> : verificationPending ? <span className="mt-4 inline-flex rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">قيد المراجعة</span> : entitlements.verificationEligible ? <form action={requestVerificationAction} className="mt-4"><button className="h-10 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">طلب التوثيق</button></form> : <p className="mt-4 text-xs font-bold text-slate-400">متاح مع الباقات المؤهلة.</p>}</article>
    </section>
  </div>;
}
