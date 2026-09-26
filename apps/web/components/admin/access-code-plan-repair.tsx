import { db } from "../../app/lib/db";
import { repairAccessCodePlanAdminAction } from "../../app/actions/admin-access-code-repair";

export async function AccessCodePlanRepair() {
  const [codes, plans] = await Promise.all([
    db.subscriptionAccessCode.findMany({
      where: { isActive: true, revokedAt: null, plan: { code: { notIn: ["FREE", "BUSINESS", "PRO"] } } },
      take: 100,
      orderBy: { createdAt: "desc" },
      select: { id: true, label: true, plan: { select: { name: true } }, grants: { where: { revokedAt: null }, select: { business: { select: { name: true, slug: true } } } } },
    }),
    db.businessPlan.findMany({ where: { isActive: true, code: { in: ["BUSINESS", "PRO"] } }, select: { code: true, name: true }, orderBy: { monthlyPrice: "asc" } }),
  ]);
  if (!codes.length) return null;
  return <section className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
    <h2 className="text-lg font-black">تصحيح منح الباقات غير المعرّفة</h2>
    <p className="text-sm leading-7">هذه الأكواد مرتبطة بباقات لا تملك تعريفًا للميزات. اختر باقة معتمدة لتحديث الكود ومنحه النشطة معًا، دون خصم مالي أو تغيير مدة الوصول. يظهر أدناه جميع العملاء المتأثرين قبل الحفظ.</p>
    {codes.map((code) => <form key={code.id} action={repairAccessCodePlanAdminAction} className="space-y-3 rounded-2xl border border-amber-200 p-4" aria-label={`تصحيح ${code.label || code.plan.name}`}>
      <input type="hidden" name="codeId" value={code.id} />
      <h3 className="font-bold">{code.label || "بدون وصف"} · {code.plan.name}</h3>
      <p className="text-sm">{code.grants.length ? code.grants.map(({ business }) => `${business.name} (${business.slug})`).join("، ") : "لا توجد منح نشطة لهذا الكود."}</p>
      <label className="grid gap-2 text-sm font-bold">الباقة البديلة
        <select name="plan" required defaultValue="" className="min-h-11 rounded-xl border border-amber-300 bg-transparent px-3">
          <option value="" disabled>اختر الباقة المعتمدة</option>
          {plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} — {plan.code === "BUSINESS" ? "5 فروع و8 أعضاء فريق" : "فروع وأعضاء فريق غير محدودين"}</option>)}
        </select>
      </label>
      <button className="min-h-11 rounded-xl bg-[#07181b] px-4 text-sm font-bold text-white">تصحيح الكود والمنح النشطة</button>
    </form>)}
  </section>;
}
