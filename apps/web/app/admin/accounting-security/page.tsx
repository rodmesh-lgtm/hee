import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";
import { ACCOUNTING_SECURITY_HOLD } from "../../lib/accounting-security";
import { accountingProvenanceQuery, accountingProvenanceFindings, type AccountingProvenance } from "../../lib/accounting-provenance-query";

export const dynamic = "force-dynamic";
export const metadata = { title: "INFRO · مراجعة عزل الحسابات", robots: { index: false, follow: false } };
export default async function AccountingSecurityPage({ searchParams }: { searchParams: Promise<{ businessId?: string }> }) {
  await requireAdmin();
  const businessId = String((await searchParams).businessId || "");
  if (businessId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(businessId)) notFound();
  const businesses = await db.business.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" }, take: 500 });
  const selected = businessId ? await db.business.findFirst({ where: { id: businessId, deletedAt: null }, select: { id: true, name: true, ownerId: true } }) : null;
  if (businessId && !selected) notFound();
  const rows = selected ? await db.$queryRaw<AccountingProvenance[]>(accountingProvenanceQuery(selected.id)) : [];
  return <main dir="rtl" className="mx-auto max-w-7xl space-y-6 p-6">
    <h1 className="text-2xl font-bold">مراجعة عزل الفواتير والعملاء</h1>
    <p>حماية الوصول المحاسبي: {ACCOUNTING_SECURITY_HOLD ? "إيقاف احترازي مفعل" : "غير موقوف"}.</p>
    <p>هذه أداة قراءة إدارية لمصدر السجلات. لا تُعدل الفواتير ولا تنقلها ولا تحذفها. لا تعرض بيانات التواصل أو محتويات الفواتير.</p>
    <form method="get" className="flex flex-wrap gap-3"><label>المنشأة<select name="businessId" defaultValue={businessId} className="m-2 min-h-11 rounded border p-2"><option value="">اختر منشأة</option>{businesses.map(b => <option key={b.id} value={b.id}>{b.name} · {b.id.slice(-6)}</option>)}</select></label><button className="min-h-11 rounded border px-5">فحص المصدر</button></form>
    {selected && <><h2 className="text-xl font-bold">{selected.name}</h2><p>معرّف المنشأة: <bdi>{selected.id}</bdi> · معرّف المالك: <bdi>{selected.ownerId}</bdi></p>
      <p>عُرضت أحدث {rows.length} فاتورة، بحد 500. غياب المؤشرات لا يثبت الملكية: يجب مقارنة السجلات الأصلية مع المنشأة، والتحقق من تدفقات حسابين مستقلين قبل إعادة الخدمة.</p>
      <div className="overflow-x-auto"><table className="w-full text-right"><thead><tr><th>الفاتورة / معرّف السجل</th><th>المنفذ / تاريخ الإنشاء</th><th>نتيجة فحص المصدر</th></tr></thead><tbody>{rows.map(row => {
        const findings = accountingProvenanceFindings(row);
        return <tr key={row.id} className="border-b"><td className="p-3">#{row.number}<br/><bdi>{row.id}</bdi></td><td className="p-3"><bdi>{row.createdBy}</bdi><br/>{row.createdAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</td><td className="p-3">{findings.length ? findings.join("؛ ") : "لا مؤشرات في الفحوص الآلية — لم تُعتمد الملكية بعد"}</td></tr>;
      })}</tbody></table></div>
      <Link className="inline-flex min-h-11 items-center underline" href={`/admin/businesses/${selected.id}`}>فتح بيانات المنشأة الإدارية</Link>
    </>}
  </main>;
}
