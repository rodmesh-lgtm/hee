import Link from "next/link";
import { notFound } from "next/navigation";
import { ReceiptText, ShieldAlert } from "lucide-react";
import { requireAdmin } from "../../../../lib/admin";
import { db } from "../../../../lib/db";

function sar(halalas: number | null | undefined) {
  if (halalas === null || halalas === undefined) return "—";
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(halalas / 100);
}
function dt(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

export default async function AdminBillingPaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!id || id.length > 100) notFound();

  const payment = await db.billingPayment.findUnique({
    where: { id },
    include: {
      business: { select: { id: true, name: true, slug: true, owner: { select: { name: true, email: true, emailVerifiedAt: true } } } },
      plan: { select: { code: true, name: true, monthlyPrice: true } },
      subscription: { select: { id: true, status: true, provider: true, autoRenew: true, startsAt: true, endsAt: true } },
      webhookEvents: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, provider: true, providerEventId: true, eventType: true, createdAt: true, processedAt: true } },
    },
  });
  if (!payment) notFound();

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-[#1f2552] sm:px-6" dir="rtl"><div className="mx-auto max-w-5xl space-y-5">
    <Link href="/admin/billing" className="text-xs font-black text-[#5d49cc]">← العودة إلى الفوترة</Link>
    <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5">
      <div className="flex items-center gap-2 text-[#6f3bd2]"><ReceiptText className="h-5 w-5" /><span className="text-xs font-black">دليل دفعة اشتراك HEE</span></div>
      <h1 className="mt-2 text-2xl font-black">تفاصيل الدفعة</h1>
      <code className="mt-2 block break-all text-[11px] text-slate-400" dir="ltr">{payment.id}</code>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900"><ShieldAlert className="ml-1 inline h-4 w-4" />هذه الصفحة للقراءة والتحقق فقط. لا تسمح بتعديل ledger أو subscription أو provider evidence يدويًا.</div>
    </header>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Metric label="الحالة" value={payment.status} />
      <Metric label="المبلغ" value={sar(payment.amount)} />
      <Metric label="النوع" value={payment.kind} />
      <Metric label="المحاولة" value={payment.attempt} />
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <Card title="المنشأة والخطة">
        <Row label="المنشأة" value={payment.business.name} /><Row label="المالك" value={payment.business.owner.name} /><Row label="البريد" value={payment.business.owner.email} /><Row label="توثيق البريد" value={payment.business.owner.emailVerifiedAt ? "موثق" : "غير موثق"} /><Row label="الخطة" value={`${payment.plan.name} (${payment.plan.code})`} /><Row label="سعر الخطة" value={sar(payment.plan.monthlyPrice)} />
      </Card>
      <Card title="مرجع provider">
        <Row label="Provider" value={payment.provider} mono /><Row label="Provider payment ID" value={payment.providerPaymentId ?? "—"} mono /><Row label="Provider given ID" value={payment.providerGivenId} mono /><Row label="Paid at" value={dt(payment.paidAt)} /><Row label="Next retry" value={dt(payment.nextRetryAt)} /><Row label="Created" value={dt(payment.createdAt)} />
      </Card>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <Card title="الاشتراك المرتبط">
        {payment.subscription ? <><Row label="Subscription ID" value={payment.subscription.id} mono /><Row label="الحالة" value={payment.subscription.status} /><Row label="Provider" value={payment.subscription.provider ?? "—"} mono /><Row label="Auto renew" value={payment.subscription.autoRenew ? "نعم" : "لا"} /><Row label="البداية" value={dt(payment.subscription.startsAt)} /><Row label="النهاية" value={dt(payment.subscription.endsAt)} /></> : <p className="text-xs text-slate-500">لا يوجد اشتراك مرتبط حاليًا. هذا قد يكون متوقعًا لبعض حالات الفشل/الاسترداد ويجب تفسيره مع reconciliation.</p>}
      </Card>
      <Card title="لقطة الإيصال">
        <Row label="الإصدار" value={dt(payment.receiptIssuedAt)} /><Row label="البائع" value={payment.receiptSellerLegalName ?? "—"} /><Row label="العنوان" value={payment.receiptSellerAddress ?? "—"} /><Row label="الحالة الضريبية" value={payment.receiptTaxStatus ?? "—"} /><Row label="الصافي" value={sar(payment.receiptNetAmount)} /><Row label="VAT" value={sar(payment.receiptVatAmount)} />
      </Card>
    </section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5">
      <h2 className="font-black">أحداث Webhook المرتبطة</h2><p className="mt-1 text-xs text-slate-500">آخر 50 حدثًا مرتبطًا بهذه الدفعة، دون عرض payload أو secrets.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-right text-xs"><thead className="text-slate-400"><tr className="border-b"><th className="py-2">النوع</th><th>Provider</th><th>Event ID</th><th>وصل</th><th>عولج</th></tr></thead><tbody>{payment.webhookEvents.map((event) => <tr key={event.id} className="border-b border-[#f0edf5] last:border-0"><td className="py-3 font-bold">{event.eventType}</td><td>{event.provider}</td><td><code dir="ltr" className="text-[10px]">{event.providerEventId}</code></td><td>{dt(event.createdAt)}</td><td>{dt(event.processedAt)}</td></tr>)}{!payment.webhookEvents.length ? <tr><td colSpan={5} className="py-8 text-center text-slate-400">لا توجد أحداث Webhook مرتبطة.</td></tr> : null}</tbody></table></div>
    </section>
  </div></main>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border border-[#e7e4f0] bg-white p-4"><span className="text-xs text-slate-400">{label}</span><b className="mt-1 block break-all text-lg">{value}</b></div>; }
function Card({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5"><h2 className="font-black">{title}</h2><dl className="mt-4 divide-y divide-[#f0edf5]">{children}</dl></section>; }
function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) { return <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5 text-xs"><dt className="text-slate-400">{label}</dt><dd className={`break-all font-bold ${mono ? "font-mono text-[10px]" : ""}`} dir={mono ? "ltr" : undefined}>{value}</dd></div>; }
