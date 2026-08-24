import { Prisma } from "@prisma/client";
import Link from "next/link";
import { ArrowRight, ClipboardList, LockKeyhole, Truck } from "lucide-react";
import { notFound } from "next/navigation";
import { transitionBusinessStoreOrderAdminAction } from "../../../actions/admin-business-store-orders";
import { requireAdmin } from "../../../lib/admin";
import { db } from "../../../lib/db";

type AuditRow = { id: string; fromStatus: string; toStatus: string; paymentStatus: string; note: string | null; createdAt: Date; actorName: string; actorEmail: string };

const resultMessages: Record<string, string> = {
  updated: "تم تحديث حالة الطلب وتسجيل العملية في سجل التدقيق.",
  "payment-required": "لا يمكن إدخال الطلب في دورة التنفيذ قبل أن تكون حالة الدفع paid.",
  "refund-required": "لا يمكن إلغاء طلب مدفوع إداريًا دون مسار refund/reversal موثق.",
  "invalid-transition": "الانتقال المطلوب غير صالح من الحالة الحالية.",
  conflict: "تغير الطلب بالتزامن مع العملية. أعد مراجعة حالته الحالية.",
  missing: "الطلب لم يعد موجودًا.",
  invalid: "الطلب أو الحالة المطلوبة غير صالحين.",
};

function sar(halalas: number) { return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(halalas / 100); }
function json(value: unknown) { try { return JSON.stringify(value, null, 2); } catch { return "{}"; } }

export default async function AdminStoreOrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const result = String((await searchParams).result ?? "");
  const order = await db.businessStoreOrder.findUnique({ where: { id }, include: { business: { select: { id: true, name: true, slug: true, owner: { select: { name: true, email: true } } } }, items: { orderBy: { createdAt: "asc" } } } });
  if (!order) notFound();
  const audit = await db.$queryRaw<AuditRow[]>(Prisma.sql`
    SELECT a."id", a."fromStatus", a."toStatus", a."paymentStatus", a."note", a."createdAt",
           u."name" AS "actorName", u."email" AS "actorEmail"
    FROM "BusinessStoreOrderAudit" a
    JOIN "User" u ON u."id" = a."actorUserId"
    WHERE a."orderId" = ${order.id}
    ORDER BY a."createdAt" DESC
    LIMIT 100
  `);

  const next = order.status === "draft" ? ["cancelled"] : order.status === "submitted" ? ["processing", "cancelled"] : order.status === "processing" ? ["shipped", "cancelled"] : order.status === "shipped" ? ["fulfilled"] : [];

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-[#1f2552] sm:px-6" dir="rtl"><div className="mx-auto max-w-6xl space-y-5">
    <Link href="/admin/store-orders" className="inline-flex items-center gap-2 text-xs font-black text-[#5d49cc]"><ArrowRight className="h-4 w-4" />كل طلبات المتجر</Link>
    <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[#6f3bd2]"><ClipboardList className="h-5 w-5" /><span className="text-xs font-black">طلب متجر الأعمال</span></div><h1 className="mt-2 text-xl font-black">{order.businessNameSnapshot}</h1><code className="mt-1 block text-[10px] text-slate-400" dir="ltr">{order.id}</code></div><div className="text-left"><b className="text-2xl text-[#5d49cc]">{sar(order.total)}</b><span className="mt-1 block text-xs text-slate-400">{order.status} · {order.paymentStatus}</span></div></div></header>

    {result && resultMessages[result] ? <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-bold ${result === "updated" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{resultMessages[result]}</div> : null}

    <section className="grid gap-3 md:grid-cols-4"><Metric label="Subtotal" value={sar(order.subtotal)} /><Metric label="VAT" value={sar(order.vatAmount)} /><Metric label="Shipping" value={sar(order.shippingAmount)} /><Metric label="Total" value={sar(order.total)} /></section>

    <section className="grid gap-4 lg:grid-cols-2"><Card title="المنشأة والمالك"><Row label="المنشأة" value={order.business.name} /><Row label="Slug" value={order.business.slug} /><Row label="المالك" value={order.business.owner.name} /><Row label="البريد" value={order.business.owner.email} /><Row label="Public snapshot" value={order.publicUrlSnapshot} /></Card><Card title="الشحن"><Row label="الاسم" value={order.shippingName ?? "—"} /><Row label="الهاتف" value={order.shippingPhone ?? "—"} /><Row label="البريد" value={order.shippingEmail ?? "—"} /><Row label="العنوان" value={[order.shippingAddressLine1, order.shippingAddressLine2, order.shippingDistrict, order.shippingCity, order.shippingPostalCode, order.shippingCountry].filter(Boolean).join("، ") || "—"} /></Card></section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">العناصر التاريخية</h2><p className="mt-1 text-xs text-slate-500">هذه snapshots للطلب وليست قراءة مباشرة من الكتالوج الحالي، لذلك تغيير المنتج المركزي لا يغيّر التاريخ التجاري.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-right text-xs"><thead><tr className="border-b text-slate-400"><th className="py-2">SKU</th><th>المنتج</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th><th>التخصيص</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id} className="border-b border-[#f0edf5] last:border-0"><td className="py-3"><code dir="ltr">{item.sku}</code></td><td className="font-bold">{item.nameSnapshot}</td><td>{item.quantity}</td><td>{sar(item.unitPrice)}</td><td>{sar(item.lineTotal)}</td><td><pre className="max-w-xs whitespace-pre-wrap text-[10px] text-slate-500">{json(item.customizationSnapshot)}</pre></td></tr>)}</tbody></table></div></section>

    <section className="grid gap-4 lg:grid-cols-2"><Card title="Identity snapshot"><pre dir="ltr" className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[10px] text-slate-600">{json(order.identitySnapshot)}</pre></Card><Card title="Order customization snapshot"><pre dir="ltr" className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[10px] text-slate-600">{json(order.customizationSnapshot)}</pre></Card></section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><div className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">الانتقالات التشغيلية</h2></div><p className="mt-2 text-xs leading-6 text-slate-500">لا يوجد dropdown حر. الانتقالات محددة مسبقًا وتنفذ داخل transaction مع row/advisory locking وDB guard. هذه الواجهة لا تغيّر حالة الدفع.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{next.map((target) => { const blockedByPayment = ["processing", "shipped", "fulfilled"].includes(target) && order.paymentStatus !== "paid"; const blockedRefund = target === "cancelled" && order.paymentStatus === "paid"; return <form key={target} action={transitionBusinessStoreOrderAdminAction} className="rounded-2xl border border-[#ece9f3] p-4"><input type="hidden" name="orderId" value={order.id} /><input type="hidden" name="nextStatus" value={target} /><b className="text-sm">{order.status} → {target}</b><textarea name="note" maxLength={500} rows={2} placeholder="ملاحظة تشغيلية اختيارية" className="mt-3 w-full rounded-xl border border-[#e4e0ec] p-2 text-xs" /><button disabled={blockedByPayment || blockedRefund} className="mt-2 min-h-10 rounded-xl bg-[#20264f] px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-40">تنفيذ الانتقال</button>{blockedByPayment ? <p className="mt-2 text-[10px] font-bold text-amber-700">يتطلب paymentStatus=paid.</p> : null}{blockedRefund ? <p className="mt-2 text-[10px] font-bold text-amber-700">الطلب مدفوع؛ يجب وجود refund/reversal domain قبل الإلغاء.</p> : null}</form>; })}{!next.length ? <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">لا توجد انتقالات إدارية صالحة من الحالة الحالية.</div> : null}</div></section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><div className="flex items-center gap-2"><Truck className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">الدفع والشحن</h2></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><Row label="Payment provider" value={order.paymentProvider ?? "غير مربوط"} /><Row label="Provider reference" value={order.providerPaymentId ?? "غير موجود"} /></div><p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-800">لا يوجد Shipment Provider أو tracking integration حقيقي في هذه المرحلة. حالة shipped هي حالة تشغيلية فقط، ولا تعرض المنصة رقم تتبع وهميًا.</p></section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="font-black">سجل التدقيق</h2><div className="mt-4 space-y-2">{audit.map((entry) => <div key={entry.id} className="rounded-xl border border-[#f0edf5] p-3 text-xs"><div className="flex flex-wrap justify-between gap-2"><b>{entry.fromStatus} → {entry.toStatus}</b><span className="text-slate-400">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt)}</span></div><p className="mt-1 text-slate-500">الدفع وقت الانتقال: {entry.paymentStatus} · {entry.actorName} ({entry.actorEmail})</p>{entry.note ? <p className="mt-2 rounded-lg bg-slate-50 p-2">{entry.note}</p> : null}</div>)}{!audit.length ? <p className="text-xs text-slate-400">لا توجد انتقالات إدارية مسجلة بعد.</p> : null}</div></section>
  </div></main>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5"><h2 className="mb-4 font-black">{title}</h2><div className="space-y-2">{children}</div></section>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex flex-wrap justify-between gap-3 border-b border-[#f2eff6] py-2 text-xs last:border-0"><span className="text-slate-400">{label}</span><b className="max-w-[70%] break-words text-left">{value}</b></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl border border-[#e7e4f0] bg-white p-4"><span className="text-xs text-slate-400">{label}</span><b className="mt-1 block text-lg">{value}</b></div>; }
