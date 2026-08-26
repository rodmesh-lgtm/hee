import Link from "next/link";
import { PackageCheck, Search, ShoppingBag } from "lucide-react";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";

const STATUS = ["draft", "submitted", "processing", "shipped", "fulfilled", "cancelled"] as const;
const PAYMENT = ["unpaid", "pending", "paid", "failed", "refunded"] as const;
const PAGE_SIZE = 40;

function sar(halalas: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(halalas / 100);
}
function clean(value: unknown, max = 120) { return String(value ?? "").trim().slice(0, max); }

export default async function AdminStoreOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; payment?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = clean(params.q);
  const status = STATUS.includes(params.status as (typeof STATUS)[number]) ? params.status! : "";
  const payment = PAYMENT.includes(params.payment as (typeof PAYMENT)[number]) ? params.payment! : "";
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);
  const where = {
    ...(status ? { status } : {}),
    ...(payment ? { paymentStatus: payment } : {}),
    ...(q ? { OR: [
      { id: { contains: q, mode: "insensitive" as const } },
      { businessNameSnapshot: { contains: q, mode: "insensitive" as const } },
      { business: { owner: { email: { contains: q, mode: "insensitive" as const } } } },
      { business: { owner: { name: { contains: q, mode: "insensitive" as const } } } },
    ] } : {}),
  };

  const [orders, count] = await Promise.all([
    db.businessStoreOrder.findMany({
      where,
      include: { business: { select: { id: true, name: true, owner: { select: { name: true, email: true } } } }, items: { select: { id: true } } },
      orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    db.businessStoreOrder.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-[#1f2552] sm:px-6" dir="rtl"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5"><div className="flex items-center gap-2 text-[#6f3bd2]"><ShoppingBag className="h-5 w-5" /><span className="text-xs font-black">إدارة HEE المركزية</span></div><h1 className="mt-2 text-2xl font-black">طلبات متجر الأعمال</h1><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">عرض تشغيلي لجميع طلبات منشآت HEE. الأسعار هنا snapshots تاريخية، ولا توجد أداة إدارية لتغيير الدفع أو تزوير BillingPayment.</p></header>

    <form className="grid gap-3 rounded-[22px] border border-[#e7e4f0] bg-white p-4 md:grid-cols-[1fr_180px_180px_auto]">
      <label className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={q} placeholder="رقم الطلب، المنشأة، المالك أو البريد" className="min-h-10 w-full rounded-xl border border-[#e4e0ec] pr-10 pl-3 text-sm" /></label>
      <select name="status" defaultValue={status} className="min-h-10 rounded-xl border border-[#e4e0ec] px-3 text-sm"><option value="">كل حالات الطلب</option>{STATUS.map((v) => <option key={v} value={v}>{v}</option>)}</select>
      <select name="payment" defaultValue={payment} className="min-h-10 rounded-xl border border-[#e4e0ec] px-3 text-sm"><option value="">كل حالات الدفع</option>{PAYMENT.map((v) => <option key={v} value={v}>{v}</option>)}</select>
      <button className="min-h-10 rounded-xl bg-[#20264f] px-5 text-xs font-black text-white">تطبيق</button>
    </form>

    <section className="grid gap-3 sm:grid-cols-3"><Metric label="النتائج" value={count} /><Metric label="الصفحة" value={`${page} / ${pages}`} /><Metric label="المعروض" value={orders.length} /></section>

    <section className="overflow-hidden rounded-[24px] border border-[#e7e4f0] bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-right text-xs"><thead className="bg-[#fbfbfd] text-slate-400"><tr><th className="p-3">الطلب</th><th>المنشأة / المالك</th><th>الحالة</th><th>الدفع</th><th>العناصر</th><th>الإجمالي</th><th>الإنشاء</th><th className="pl-3">التفاصيل</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-t border-[#f0edf5]"><td className="p-3"><code dir="ltr" className="text-[10px]">{order.id}</code></td><td><b className="block">{order.businessNameSnapshot}</b><span className="text-[10px] text-slate-400">{order.business.owner.name} · {order.business.owner.email}</span></td><td><Badge value={order.status} /></td><td><Badge value={order.paymentStatus} /></td><td>{order.items.length}</td><td><b>{sar(order.total)}</b><span className="block text-[10px] text-slate-400">ضريبة {sar(order.vatAmount)} · شحن {sar(order.shippingAmount)}</span></td><td>{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(order.createdAt)}</td><td className="pl-3"><Link href={`/admin/store-orders/${order.id}`} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-[#f1edff] px-3 font-black text-[#5d49cc]"><PackageCheck className="h-3.5 w-3.5" />فتح</Link></td></tr>)}{!orders.length ? <tr><td colSpan={8} className="p-10 text-center text-slate-400">لا توجد طلبات تطابق البحث والفلاتر الحالية.</td></tr> : null}</tbody></table></div></section>

    {pages > 1 ? <nav className="flex items-center justify-between text-xs"><span>إجمالي {count}</span><div className="flex gap-2">{page > 1 ? <Link className="rounded-xl border bg-white px-4 py-2 font-black" href={{ pathname: "/admin/store-orders", query: { q, status, payment, page: page - 1 } }}>السابق</Link> : null}{page < pages ? <Link className="rounded-xl border bg-white px-4 py-2 font-black" href={{ pathname: "/admin/store-orders", query: { q, status, payment, page: page + 1 } }}>التالي</Link> : null}</div></nav> : null}
  </div></main>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="rounded-2xl border border-[#e7e4f0] bg-white p-4"><span className="text-xs text-slate-400">{label}</span><b className="mt-1 block text-xl">{value}</b></div>; }
function Badge({ value }: { value: string }) { return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{value}</span>; }
