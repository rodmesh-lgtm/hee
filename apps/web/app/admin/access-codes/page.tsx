import { KeyRound, ShieldCheck } from "lucide-react";
import { revokeSubscriptionAccessCodeAdminAction } from "../../actions/admin-access-code";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";
import { AccessCodeCreateForm } from "../../../components/admin/access-code-create-form";

function dateText(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(value);
}

export default async function AdminAccessCodesPage({ searchParams }: { searchParams: Promise<{ access?: string }> }) {
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
  const now = new Date();

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#1f2552] sm:px-6">
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="rounded-[24px] border border-[#e7e4f0] bg-white p-5">
        <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><KeyRound className="h-5 w-5" /></span><div><h1 className="text-xl font-black">أكواد تفعيل الاشتراكات</h1><p className="mt-1 text-sm text-slate-500">منح باقة بدون دفع مع إمكانية إلغاء الكود والمنح التابعة له من الإدارة.</p></div></div>
        {params.access === "revoked" ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-900">تم إلغاء الكود وسحب المنح النشطة المرتبطة به.</div> : null}
        {params.access === "invalid-code" ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">تعذر تحديد الكود المطلوب إلغاؤه.</div> : null}
      </header>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5">
        <div className="mb-4 flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#6543ce]" /><h2 className="font-black">إنشاء كود جديد</h2></div>
        <AccessCodeCreateForm plans={plans} />
      </section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5">
        <h2 className="font-black">الأكواد الأخيرة</h2>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-right text-xs"><thead><tr className="border-b border-[#ece9f3] text-slate-400"><th className="px-2 py-3">الوصف</th><th className="px-2 py-3">الباقة</th><th className="px-2 py-3">الحالة</th><th className="px-2 py-3">الاستخدام</th><th className="px-2 py-3">صلاحية الإدخال</th><th className="px-2 py-3">المنشئ</th><th className="px-2 py-3">الإجراء</th></tr></thead><tbody>{codes.map((code) => {
          const expired = Boolean(code.expiresAt && code.expiresAt <= now);
          const active = code.isActive && !code.revokedAt && !expired;
          return <tr key={code.id} className="border-b border-[#f0edf5] last:border-0"><td className="px-2 py-3 font-bold">{code.label || "بدون وصف"}</td><td className="px-2 py-3">{code.plan.name} <span className="text-slate-400">({code.plan.code})</span></td><td className="px-2 py-3"><span className={`rounded-lg px-2 py-1 font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{active ? "فعال للإدخال" : code.revokedAt ? "ملغى" : "انتهت صلاحية الإدخال"}</span></td><td className="px-2 py-3">{code.redemptionCount}{code.maxRedemptions ? ` / ${code.maxRedemptions}` : " / غير محدود"}<span className="mr-1 text-slate-400">· {code._count.grants} سجل</span></td><td className="px-2 py-3">{dateText(code.expiresAt)}</td><td className="px-2 py-3"><span className="block font-bold">{code.createdBy.name}</span><span className="text-slate-400">{code.createdBy.email}</span></td><td className="px-2 py-3">{code.isActive && !code.revokedAt ? <form action={revokeSubscriptionAccessCodeAdminAction}><input type="hidden" name="codeId" value={code.id} /><button className="rounded-xl border border-rose-200 px-3 py-2 font-black text-rose-700">إلغاء الكود والمنح</button></form> : <span className="text-slate-400">لا إجراء</span>}</td></tr>;
        })}{!codes.length ? <tr><td colSpan={7} className="py-8 text-center text-slate-500">لا توجد أكواد حتى الآن.</td></tr> : null}</tbody></table></div>
      </section>
    </div>
  </main>;
}
