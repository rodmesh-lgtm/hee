import { redirect } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { addSimpleServiceAction, deleteSimpleServiceAction, updateSimpleServiceAction } from "../../actions/services";

export default async function DashboardServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null }, include: { services: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } } });
  if (!business) redirect("/onboarding");

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><h1 className="text-xl font-black text-[#20264f]">الخدمات</h1><p className="mt-1 text-sm text-slate-500">أضف الخدمات الأساسية التي تريد إظهارها في صفحة هويتك.</p></section>
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><form action={addSimpleServiceAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"><input name="name" required minLength={2} placeholder="اسم الخدمة" className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /><input name="description" placeholder="وصف مختصر (اختياري)" className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />إضافة</button></form></section>
    <section className="space-y-2">{business.services.length ? business.services.map((service) => <article key={service.id} className="rounded-[20px] border border-[#e7e9f4] bg-white p-3.5"><form action={updateSimpleServiceAction} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto]"><input type="hidden" name="id" value={service.id} /><input name="name" defaultValue={service.name} className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm font-bold text-[#20264f]" /><input name="description" defaultValue={service.description ?? ""} className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm text-slate-600" /><button className="h-10 rounded-xl border border-[#ded9f3] bg-[#f7f4ff] px-3 text-xs font-black text-[#5d49cc]">حفظ</button></form><form action={deleteSimpleServiceAction} className="mt-2 flex justify-end"><input type="hidden" name="id" value={service.id} /><button className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-rose-600"><Trash2 className="h-3.5 w-3.5" />حذف</button></form></article>) : <div className="rounded-[22px] border border-dashed border-[#dcd8ea] bg-white px-4 py-8 text-center text-sm text-slate-500">لا توجد خدمات بعد. أضف أول خدمة من الأعلى.</div>}</section>
  </div>;
}
