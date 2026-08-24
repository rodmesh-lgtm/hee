import { KeyRound, ShieldCheck } from "lucide-react";
import { createSubscriptionAccessCodeAdminAction, revokeSubscriptionAccessCodeAdminAction } from "../../actions/admin-access-code";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";

function dateText(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(value);
}

export default async function AdminAccessCodesPage({ searchParams }: { searchParams: Promise<{ access?: string; newCode?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const [plans, codes] = await Promise.all([
    db.businessPlan.findMany({ where: { isActive: true, code: { not: "FREE" } }, orderBy: { monthlyPrice: "asc" }, select: { code: true, name: true } }),
    db.subscriptionAccessCode.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        label: true,
        isActive: true,
        redemptionCount: true,
        maxRedemptions: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        plan: { select: { code: true, name: true } },
        createdBy: { select: { name: true, email: true } },
        _count: { select: { grants: true } },
      },
    }),
  ]);

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#1f2552] sm:px-6">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[24px] border border-[#e7e4f0] bg-white p-5">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><KeyRound className="h-5 w-5" /></span><div><h1 className="text-xl font-black">أكواد تفعيل الاشتراكات</h1><p className="mt-1 text-sm text-slate-500">منح باقة بدون دفع مع إمكانية إلغاء الكود والمنح التابعة له من الإدارة.</p></div></div>
        {params.access === "created" && params.newCode ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><b className="block">تم إنشاء الكود. انسخه الآن؛ لن يمكن استعادته لاحقًا.</b><code dir="ltr" className="mt-2 block break-all rounded-xl bg-white px-3 py-2 font-mono text-sm font-black">{params.newCode}</code></div> : null}
        {params.access === "revoked" ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">تم إلغاء الكود وسحب المنح النشطة المرتبطة به.</div> : null}
        {["invalid-plan", "invalid-limit", "invalid-expiry", "invalid-code"].includes(String(params.access ?? "")) ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">تعذر تنفيذ العملية. راجع الباقة والحد والتاريخ ثم حاول مرة أخرى.</div> : null}
      </header>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5">
        <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#6543ce]" /><h2 className="font-black">إنشاء كود جديد</h2></div>
        <form action={createSubscriptionAccessCodeAdminAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <label className="text-xs font-bold text-slate-600">الباقة<select name="plan" required className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] bg-white px-3 text-sm"><option value="">اختر الباقة</option>{plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} ({plan.code})</option>)}</select></label>
          <label className="text-xs font-bold text-slate-600">وصف داخلي<input name="label" maxLength={120} placeholder="مثال: شريك إطلاق" className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">حد الاستخدامات<input name="maxRedemptions" inputMode="numeric" min={1} max={100000} placeholder="غير محدود" className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] px-3 text-sm" /></label>
          <label className="text-xs font-bold text-slate-600">ينتهي في<input name="expiresAt" type="datetime-local" className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] px-3 text-sm" /></label>
          <button className="h-11 rounded-xl bg-[#5b3fd6] px-5 text-xs font-black text-white md:col-span-4 md:justify-self-start">إنشاء كود آمن</button>
        </form>
      </section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5">
        <h2 className="font-black">الأكواد الأخيرة</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead><tr className="border-b border-[#ece9f3] text-slate-400"><th className="px-2 py-3">الوصف</th><th className="px-2 py-3">الباقة</th><th className="px-2 py-3">الحالة</th><th className="px-2 py-3">الاستخدام</th><th className="px-2 py-3">الانتهاء</th><th className="px-2 py-3">المنشئ</th><th className="px-2 py-3">الإجراء</th></tr></thead><tbody>{codes.map((code) => {
          const expired = Boolean(code.expiresAt && code.expiresAt <= new Date());
          const active = code.isActive && !code.revokedAt && !expired;
          return <tr key={code.id} className="border-b border-[#f0edf5] last:border-0"><td className="px-2 py-3 font-bold">{code.label || "بدون وصف"}</td><td className="px-2 py-3">{code.plan.name} <span className="text-slate-400">({code.plan.code})</span></td><td className="px-2 py-3"><span className={`rounded-lg px-2 py-1 font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{active ? "فعال" : code.revokedAt ? "ملغى" : "منتهي"}</span></td><td className="px-2 py-3">{code.redemptionCount}{code.maxRedemptions ? ` / ${code.maxRedemptions}` : " / غير محدود"}<span className="mr-1 text-slate-400">· {code._count.grants} سجل</span></td><td className="px-2 py-3">{dateText(code.expiresAt)}</td><td className="px-2 py-3"><span className="block font-bold">{code.createdBy.name}</span><span className="text-slate-400">{code.createdBy.email}</span></td><td className="px-2 py-3">{active ? <form action={revokeSubscriptionAccessCodeAdminAction}><input type="hidden" name="codeId" value={code.id} /><button className="rounded-xl border border-rose-200 px-3 py-2 font-black text-rose-700">إلغاء الكود</button></form> : <span className="text-slate-400">لا إجراء</span>}</td></tr>;
        })}{!codes.length ? <tr><td colSpan={7} className="py-8 text-center text-slate-500">لا توجد أكواد حتى الآن.</td></tr> : null}</tbody></table></div>
      </section>
    </div>
  </main>;
}
