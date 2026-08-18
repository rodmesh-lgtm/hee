import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";

export default async function DashboardBookingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
  if (!business) {
    return <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">لا يوجد نشاط مرتبط بهذا الحساب.</div>;
  }

  const bookings = await db.booking.findMany({
    where: { businessId: business.id },
    include: { customer: true, service: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">الحجوزات</h1>
            <p className="mt-2 text-sm text-slate-400">إدارة المواعيد التي يحجزها العملاء من الصفحة العامة.</p>
          </div>
          <div className="rounded-2xl bg-indigo-500/10 px-3 py-2 text-sm font-bold text-indigo-200">{bookings.length} حجز</div>
        </div>
      </div>

      {bookings.length === 0 ? <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/70 p-8 text-center text-sm text-slate-400">لا توجد حجوزات حتى الآن.</div> : <div className="space-y-4">{bookings.map((booking) => (
        <div key={booking.id} className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-black text-white">{booking.customer.name}</p>
              <p className="text-sm text-slate-400">{booking.customer.phone}</p>
            </div>
            <div className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-bold text-indigo-200">{booking.status}</div>
          </div>
          <div className="mt-4 rounded-2xl bg-white/5 p-3 text-sm text-slate-300">
            <p>{booking.service?.name ?? "خدمة غير محددة"}</p>
            <p className="mt-2">{booking.bookingDate} - {booking.bookingTime}</p>
            <p className="mt-2">{booking.notes || "بدون ملاحظات"}</p>
          </div>
        </div>
      ))}</div>}
    </div>
  );
}
