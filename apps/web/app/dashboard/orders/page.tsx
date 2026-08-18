import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";

export default async function DashboardOrdersPage() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  const business = await db.business.findFirst({ where: { ownerId: user.id, deletedAt: null } });
  if (!business) {
    return <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-6 text-sm text-slate-400">لا يوجد نشاط مرتبط بهذا الحساب.</div>;
  }

  const orders = await db.order.findMany({
    where: { businessId: business.id },
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white">الطلبات</h1>
            <p className="mt-2 text-sm text-slate-400">تتبع الطلبات التي أرسلتها العملاء من الصفحة العامة.</p>
          </div>
          <div className="rounded-2xl bg-indigo-500/10 px-3 py-2 text-sm font-bold text-indigo-200">{orders.length} طلب</div>
        </div>
      </div>

      {orders.length === 0 ? <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-950/70 p-8 text-center text-sm text-slate-400">لا توجد طلبات حتى الآن.</div> : <div className="space-y-4">{orders.map((order) => (
        <div key={order.id} className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-black text-white">{order.customer.name}</p>
              <p className="text-sm text-slate-400">{order.customer.phone}</p>
            </div>
            <div className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-bold text-indigo-200">{order.status}</div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            {order.items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2"> <span>{item.name}</span><span>×{item.quantity}</span></div>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-400">
            <span>{order.orderType}</span>
            <span>{order.notes || "بدون ملاحظات"}</span>
            <span>{new Date(order.createdAt).toLocaleString("ar-SA")}</span>
          </div>
        </div>
      ))}</div>}
    </div>
  );
}
