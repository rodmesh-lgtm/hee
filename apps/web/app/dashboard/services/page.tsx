import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Plus, Trash2 } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { addSimpleServiceAction, deleteSimpleServiceAction, updateBookingAvailabilityAction, updateSimpleServiceAction } from "../../actions/services";

export default async function DashboardServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    include: { services: { where: { deletedAt: null }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
  });
  if (!business) redirect("/onboarding");

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <h1 className="text-xl font-black text-[#20264f]">الخدمات</h1>
      <p className="mt-1 text-sm text-slate-500">أضف خدماتك وحدد ما يمكن حجزه مباشرة من صفحة النشاط.</p>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-[#6f3bd2]" /><h2 className="text-sm font-black text-[#20264f]">الحجز الإلكتروني</h2></div><p className="mt-1 text-xs leading-5 text-slate-500">فعّل الحجز للمنشأة ثم اختر الخدمات القابلة للحجز واضبط مدتها.</p></div>
        <form action={updateBookingAvailabilityAction} className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#e4e0f2] bg-[#faf9fd] px-3 py-2 text-xs font-black text-[#4e4771]"><input type="checkbox" name="bookingAvailable" defaultChecked={business.bookingAvailable} className="h-4 w-4 accent-[#6f3bd2]" />الحجز متاح</label>
          <button className="h-9 rounded-xl bg-[#6f3bd2] px-3 text-xs font-black text-white">حفظ</button>
        </form>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><Link href="/dashboard/working-hours" className="rounded-xl border border-[#ded9f3] bg-[#f7f4ff] px-3 py-2 text-xs font-black text-[#5d49cc]">ضبط ساعات العمل</Link><Link href="/dashboard/inbox" className="rounded-xl border border-[#e5e8f3] bg-white px-3 py-2 text-xs font-black text-slate-600">فتح الطلبات والحجوزات</Link></div>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <form action={addSimpleServiceAction} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto]"><input name="name" required minLength={2} placeholder="اسم الخدمة" className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /><input name="description" placeholder="وصف مختصر (اختياري)" className="h-11 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /><button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6f3bd2] px-4 text-sm font-black text-white"><Plus className="h-4 w-4" />إضافة</button></form>
    </section>

    <section className="space-y-2">{business.services.length ? business.services.map((service) => <article key={service.id} className="rounded-[20px] border border-[#e7e9f4] bg-white p-3.5">
      <form action={updateSimpleServiceAction} className="space-y-3">
        <input type="hidden" name="id" value={service.id} />
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]"><input name="name" defaultValue={service.name} className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm font-bold text-[#20264f]" /><input name="description" defaultValue={service.description ?? ""} className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm text-slate-600" /></div>
        <div className="grid gap-2 sm:grid-cols-[140px_160px_minmax(0,1fr)_auto]"><label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>السعر (ر.س)</span><input name="price" type="number" min="0" max="100000000" defaultValue={service.price} className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm" /></label><label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>مدة الحجز بالدقائق</span><input name="durationMinutes" type="number" min="5" max="1440" defaultValue={service.durationMinutes ?? ""} placeholder="30" className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm" /></label><label className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-xs font-black text-[#4e4771]"><input type="checkbox" name="bookingEnabled" defaultChecked={service.bookingEnabled} className="h-4 w-4 accent-[#6f3bd2]" />قابلة للحجز</label><button className="mt-4 h-10 rounded-xl border border-[#ded9f3] bg-[#f7f4ff] px-4 text-xs font-black text-[#5d49cc]">حفظ</button></div>
      </form>
      <form action={deleteSimpleServiceAction} className="mt-2 flex justify-end"><input type="hidden" name="id" value={service.id} /><button className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-rose-600"><Trash2 className="h-3.5 w-3.5" />حذف</button></form>
    </article>) : <div className="rounded-[22px] border border-dashed border-[#dcd8ea] bg-white px-4 py-8 text-center text-sm text-slate-500">لا توجد خدمات بعد. أضف أول خدمة من الأعلى.</div>}</section>
  </div>;
}
