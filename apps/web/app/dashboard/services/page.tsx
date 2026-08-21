import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, Plus } from "lucide-react";
import { db } from "../../lib/db";
import { getOwnedBusinessForRead } from "../../lib/ownership";
import { addSimpleServiceAction, deleteSimpleServiceAction, updateBookingAvailabilityAction, updateSimpleServiceAction } from "../../actions/services";
import { ConfirmSubmitButton } from "../../../components/dashboard/confirm-submit-button";

const fieldClass = "h-11 min-w-0 rounded-xl border border-[#e5e8f3] bg-[#fbfcff] px-3 text-sm text-[#20264f] outline-none focus:border-[#b7a9ef] focus:bg-white";

export default async function DashboardServicesPage() {
  const activeBusiness = await getOwnedBusinessForRead();
  if (!activeBusiness) redirect("/onboarding");
  const business = await db.business.findFirst({
    where: { id: activeBusiness.id, ownerId: activeBusiness.ownerId, deletedAt: null },
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
        <form action={updateBookingAvailabilityAction} className="flex w-full items-center gap-2 sm:w-auto">
          <label className="inline-flex min-h-10 flex-1 cursor-pointer items-center gap-2 rounded-xl border border-[#e4e0f2] bg-[#faf9fd] px-3 py-2 text-xs font-black text-[#4e4771] sm:flex-none"><input type="checkbox" name="bookingAvailable" defaultChecked={business.bookingAvailable} className="h-4 w-4 accent-[#6f3bd2]" />الحجز متاح</label>
          <button className="h-10 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white">حفظ</button>
        </form>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><Link href="/dashboard/working-hours" className="rounded-xl border border-[#ded9f3] bg-[#f7f4ff] px-3 py-2 text-xs font-black text-[#5d49cc]">ضبط ساعات العمل</Link><Link href="/dashboard/inbox" className="rounded-xl border border-[#e5e8f3] bg-white px-3 py-2 text-xs font-black text-slate-600">فتح الطلبات والحجوزات</Link></div>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div>
        <div className="mb-3"><h2 className="text-sm font-black text-[#20264f]">إضافة خدمة</h2><p className="mt-1 text-xs text-slate-500">ابدأ بالاسم، ويمكنك إكمال السعر والحجز بعد الإضافة.</p></div>
        <form action={addSimpleServiceAction} aria-label="إضافة خدمة" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] sm:items-end">
          <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>اسم الخدمة</span><input name="name" required minLength={2} placeholder="مثال: استشارة أولية" className={fieldClass} /></label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-600"><span>وصف مختصر <span className="font-normal text-slate-400">(اختياري)</span></span><input name="description" placeholder="ما الذي يحصل عليه العميل؟" className={fieldClass} /></label>
          <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#6f3bd2] px-5 text-sm font-black text-white"><Plus className="h-4 w-4" />إضافة</button>
        </form>
      </div>
    </section>

    <section className="space-y-2">{business.services.length ? business.services.map((service) => <article key={service.id} className="rounded-[20px] border border-[#e7e9f4] bg-white p-3.5 sm:p-4">
      <form action={updateSimpleServiceAction} className="space-y-3">
        <input type="hidden" name="id" value={service.id} />
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>اسم الخدمة</span><input name="name" defaultValue={service.name} className="h-10 min-w-0 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm font-bold text-[#20264f] outline-none focus:border-[#b7a9ef]" /></label>
          <label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>الوصف</span><input name="description" defaultValue={service.description ?? ""} className="h-10 min-w-0 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm text-slate-600 outline-none focus:border-[#b7a9ef]" /></label>
        </div>
        <div className="grid gap-2 sm:grid-cols-[140px_160px_minmax(0,1fr)_auto] sm:items-end">
          <label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>السعر (ر.س)</span><input name="price" type="number" min="0" max="100000000" inputMode="decimal" defaultValue={service.price} className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /></label>
          <label className="grid gap-1 text-[10px] font-bold text-slate-500"><span>مدة الحجز بالدقائق</span><input name="durationMinutes" type="number" min="5" max="1440" inputMode="numeric" defaultValue={service.durationMinutes ?? ""} placeholder="30" className="h-10 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-sm outline-none focus:border-[#b7a9ef]" /></label>
          <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#e8eaf4] bg-[#fbfcff] px-3 text-xs font-black text-[#4e4771]"><input type="checkbox" name="bookingEnabled" defaultChecked={service.bookingEnabled} className="h-4 w-4 accent-[#6f3bd2]" />قابلة للحجز</label>
          <button className="h-10 rounded-xl border border-[#ded9f3] bg-[#f7f4ff] px-5 text-xs font-black text-[#5d49cc]">حفظ التعديلات</button>
        </div>
      </form>
      <div className="mt-3 flex items-center justify-between border-t border-[#f0eef6] pt-3"><span className="text-[10px] text-slate-400">الحذف نهائي لهذه الخدمة فقط.</span><form action={deleteSimpleServiceAction}><input type="hidden" name="id" value={service.id} /><ConfirmSubmitButton confirmMessage={`حذف الخدمة «${service.name}»؟`} compact /></form></div>
    </article>) : <div className="rounded-[22px] border border-dashed border-[#dcd8ea] bg-white px-4 py-8 text-center"><b className="block text-sm text-[#303653]">لم تضف خدمات بعد</b><span className="mt-1 block text-xs text-slate-500">أضف أول خدمة من النموذج بالأعلى وستظهر مباشرة في صفحتك.</span></div>}</section>
  </div>;
}
