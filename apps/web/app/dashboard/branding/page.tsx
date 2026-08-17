import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, Check, CheckCircle2, Crown, LockKeyhole, Palette, Send, Sparkles, UsersRound } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { formatPlanLimit, getPlanEntitlements, HEE_PLAN_ENTITLEMENTS } from "../../lib/plan-entitlements";
import { hasPendingVerificationRequest, requestVerificationAction } from "../../actions/verification";
import { applyBrandThemeAction } from "../../actions/branding-theme";

const themes = [
  { key: "HEE_LIGHT", name: "HEE Light", tone: "#6f3bd2", plan: "FREE", label: "مجاني", description: "الثيم الأساسي المعتمد لهوية HEE." },
  { key: "EXECUTIVE", name: "Executive", tone: "#1f2552", plan: "BUSINESS", label: "Business", description: "هوية أكثر رسمية للشركات والمكاتب المهنية." },
  { key: "SIGNATURE", name: "Signature", tone: "#7c3aed", plan: "PRO", label: "Pro", description: "مظهر مميز مع خيارات أوسع للألوان والتفاصيل." },
] as const;

export default async function DashboardBrandingPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const business = await db.business.findFirst({ where: { ownerId: user.id }, include: { plan: true, contactPersons: true, branches: true, services: true } });
  if (!business) redirect("/dashboard");

  const params = await searchParams;
  const verificationParam = Array.isArray(params?.verification) ? params?.verification[0] : params?.verification;
  const themeParam = Array.isArray(params?.theme) ? params?.theme[0] : params?.theme;
  const planCode = business.plan?.code || "FREE";
  const planRank: Record<string, number> = { FREE: 0, BUSINESS: 1, PRO: 2 };
  const currentRank = planRank[planCode] ?? 0;
  const entitlements = getPlanEntitlements(planCode);
  const verificationPending = !business.isVerified && await hasPendingVerificationRequest(business.id);

  return (
    <div className="space-y-5 pb-4">
      {verificationParam === "requested" || verificationPending ? <div className="flex items-start gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>تم استلام طلب التوثيق وهو قيد مراجعة HEE. لن تظهر الشارة إلا بعد الاعتماد.</span></div> : null}
      {verificationParam === "upgrade" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">طلب التوثيق يتطلب باقة مؤهلة.</div> : null}
      {themeParam && themeParam !== "upgrade" && themeParam !== "invalid" ? <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>تم تطبيق الثيم على هوية صفحتك.</span></div> : null}
      {themeParam === "upgrade" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">هذا الثيم يتطلب ترقية الباقة.</div> : null}

      <section className="rounded-[28px] border border-[#e8e5f2] bg-[linear-gradient(135deg,#fff_0%,#faf8ff_62%,#f1ebff_100%)] p-5 sm:p-6">
        <span className="inline-flex items-center gap-2 rounded-full bg-[#efeaff] px-3 py-1 text-[11px] font-black text-[#5b3fd6]"><Palette className="h-3.5 w-3.5" /> المظهر والباقات</span>
        <h1 className="mt-3 text-2xl font-black text-[#1f2552]">اجعل صفحتك تعكس هويتك</h1>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">اختر ثيمًا جاهزًا أو عدّل اللون الأساسي. البنية تبقى موحدة ومهنية في جميع صفحات HEE.</p>
        <div className="mt-4 flex flex-wrap gap-2"><Link href="/dashboard/my-page?edit=1" className="inline-flex h-11 items-center rounded-xl bg-[#6f3bd2] px-4 text-sm font-black text-white">تعديل اللون والمظهر</Link><Link href="/dashboard/my-page" className="inline-flex h-11 items-center rounded-xl border border-[#ddd8f4] bg-white px-4 text-sm font-black text-[#4f43d9]">معاينة صفحتي</Link></div>
      </section>

      <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-[#1f2552]">الثيمات</h2><p className="mt-1 text-xs text-slate-500">اختيار الثيم أصبح فعليًا ويُحفظ مباشرة في بيانات المنشأة.</p></div><span className="rounded-full bg-[#f4f1fb] px-3 py-1 text-xs font-black text-[#6543ce]">باقتك: {business.plan?.name || "Free"}</span></div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {themes.map((theme) => {
            const requiredRank = planRank[theme.plan] ?? 0;
            const unlocked = currentRank >= requiredRank;
            const active = business.primaryColor?.toLowerCase() === theme.tone.toLowerCase();
            return <article key={theme.key} className={`rounded-[22px] border p-4 ${active ? "border-[#a995ef] bg-[#faf8ff]" : unlocked ? "border-[#e5e1f0] bg-white" : "border-[#eeebf5] bg-[#faf9fc]"}`}><div className="h-24 rounded-[18px] border border-black/5" style={{ background: `linear-gradient(145deg,#ffffff 0%,${theme.tone}22 60%,${theme.tone}55 100%)` }} /><div className="mt-3 flex items-center justify-between gap-2"><div><h3 className="font-black text-[#252a4a]">{theme.name}</h3><span className="text-[10px] font-bold text-slate-400">{active ? "مطبق حاليًا" : theme.label}</span></div><span className={`grid h-9 w-9 place-items-center rounded-xl ${active || unlocked ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{active || unlocked ? <Check className="h-4 w-4" /> : <LockKeyhole className="h-4 w-4" />}</span></div><p className="mt-2 text-xs leading-6 text-slate-500">{theme.description}</p>{unlocked ? <form action={applyBrandThemeAction} className="mt-3"><input type="hidden" name="theme" value={theme.key} /><button disabled={active} className="inline-flex h-9 items-center rounded-xl bg-[#6f3bd2] px-3 text-[11px] font-black text-white disabled:cursor-default disabled:bg-[#ebe6f4] disabled:text-[#81778a]">{active ? "الثيم الحالي" : "تطبيق الثيم"}</button></form> : <Link href="/dashboard/settings" className="mt-3 inline-flex text-[11px] font-black text-[#6543ce]">يتطلب {theme.label}</Link>}</article>;
          })}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-3">
        {(["FREE", "BUSINESS", "PRO"] as const).map((code) => {
          const item = HEE_PLAN_ENTITLEMENTS[code];
          const active = code === planCode;
          return <article key={code} className={`rounded-[24px] border p-5 ${active ? "border-[#bdb0f5] bg-[#f8f5ff]" : "border-[#e9e7f3] bg-white"}`}><div className="flex items-center justify-between gap-2"><h3 className="font-black text-[#1f2552]">{item.label}</h3>{active ? <span className="rounded-full bg-[#6f3bd2] px-2.5 py-1 text-[10px] font-black text-white">باقتك الحالية</span> : null}</div><div className="mt-4 space-y-2 text-xs leading-6 text-slate-600"><p>الفروع: <b>{formatPlanLimit(item.branchLimit)}</b></p><p>الخدمات: <b>{formatPlanLimit(item.serviceLimit)}</b></p><p>فريق التواصل والمبيعات: <b>{formatPlanLimit(item.contactLimit)}</b></p><p>الأقسام: <b>{formatPlanLimit(item.departmentLimit)}</b></p><p>الثيمات المميزة: <b>{item.premiumThemes ? "متاحة" : "الثيم الأساسي"}</b></p><p>اللون الأساسي: <b>{item.customColors ? "قابل للتخصيص" : "ثابت"}</b></p><p>طلب التوثيق: <b>{item.verificationEligible ? "متاح" : "يتطلب ترقية"}</b></p></div></article>;
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-[24px] border border-[#e9e7f3] bg-white p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-50 text-blue-600"><BadgeCheck className="h-5 w-5" /></span><h3 className="mt-3 font-black text-[#1f2552]">توثيق HEE</h3><p className="mt-2 text-xs leading-6 text-slate-500">{business.isVerified ? "تم اعتماد المنشأة وتظهر شارة التوثيق في الصفحة العامة." : verificationPending ? "طلبك قيد المراجعة. ستظهر الشارة فقط بعد اعتماد HEE." : entitlements.verificationEligible ? "باقتك مؤهلة. أرسل طلب التوثيق وسيتم وضعه في قائمة المراجعة." : "التوثيق متاح في الباقات المدفوعة، وبعد الترقية يمكن تقديم الطلب للمراجعة."}</p>{!business.isVerified && entitlements.verificationEligible && !verificationPending ? <form action={requestVerificationAction} className="mt-4"><button className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-black text-white"><Send className="h-3.5 w-3.5" /> طلب التوثيق</button></form> : null}{!entitlements.verificationEligible ? <Link href="/dashboard/settings" className="mt-4 inline-flex text-xs font-black text-[#6543ce]">يتطلب ترقية الباقة</Link> : null}</article>
        <article className="rounded-[24px] border border-[#e9e7f3] bg-white p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><UsersRound className="h-5 w-5" /></span><h3 className="mt-3 font-black text-[#1f2552]">فريق المبيعات</h3><p className="mt-2 text-xs leading-6 text-slate-500">لديك حاليًا {business.contactPersons.length} من أصل {formatPlanLimit(entitlements.contactLimit)} جهة تواصل متاحة في باقتك.</p><Link href="/dashboard/directory" className="mt-4 inline-flex text-xs font-black text-[#6543ce]">إدارة الفريق والفروع</Link></article>
        <article className="rounded-[24px] border border-[#e9e7f3] bg-white p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-600"><Crown className="h-5 w-5" /></span><h3 className="mt-3 font-black text-[#1f2552]">مزايا Premium</h3><p className="mt-2 text-xs leading-6 text-slate-500">ثيمات مميزة، أهلية التوثيق، حدود أعلى للفروع والفريق، وتحليلات متقدمة.</p></article>
      </section>

      <section className="rounded-[24px] border border-[#e6e1fb] bg-[#f8f5ff] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#6642cf]" /><h2 className="font-black text-[#1f2552]">المظهر والصلاحيات في مكان واحد</h2></div><p className="mt-1 text-xs leading-6 text-slate-500">الثيمات تُفرض من السيرفر حسب الباقة، وطلب التوثيق أصبح مسارًا فعليًا محفوظًا للمراجعة.</p></div><Link href="/dashboard/settings" className="inline-flex h-10 items-center justify-center rounded-xl border border-[#dcd5f7] bg-white px-4 text-sm font-black text-[#5b3fd6]">تفاصيل الحساب</Link></div></section>
    </div>
  );
}
