import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ReceiptText } from "lucide-react";
import { getCurrentUser } from "../../../../lib/auth";
import { getOwnedBillingPayment } from "../../../../lib/billing-ledger";

export const dynamic = "force-dynamic";

function dateText(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Riyadh" }).format(value);
}

export default async function BillingReceiptPage({ params }: { params: Promise<{ billingId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { billingId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(billingId)) notFound();
  const payment = await getOwnedBillingPayment(user.id, billingId);
  if (!payment || !["paid", "refunded"].includes(payment.status)) notFound();

  // Receipts are historical financial records. Never rebuild seller/tax data from the
  // current environment because changing legal configuration must not rewrite history.
  if (
    !payment.receiptSellerLegalName ||
    !payment.receiptSellerAddress ||
    payment.receiptTaxStatus !== "not_registered" ||
    payment.receiptNetAmount === null ||
    payment.receiptVatAmount === null ||
    !payment.receiptIssuedAt
  ) notFound();

  const receiptNumber = `HEE-R-${payment.id}`;
  const totalAmount = payment.receiptNetAmount + payment.receiptVatAmount;

  return <div className="mx-auto max-w-2xl space-y-4 pb-8">
    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><ReceiptText className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#1f2552]">إيصال دفع</h1><p className="mt-1 text-xs text-slate-500">رقم الإيصال: {receiptNumber}</p></div></div>
      <div className="mt-5 grid gap-3 rounded-2xl bg-[#faf9fd] p-4 text-sm sm:grid-cols-2">
        <div><span className="block text-[10px] font-bold text-slate-400">المورد</span><b className="mt-1 block text-[#252a4a]">{payment.receiptSellerLegalName}</b><span className="mt-1 block text-xs text-slate-500">{payment.receiptSellerAddress}</span></div>
        <div><span className="block text-[10px] font-bold text-slate-400">تاريخ إصدار الإيصال</span><b className="mt-1 block text-[#252a4a]">{dateText(payment.receiptIssuedAt)}</b></div>
        <div><span className="block text-[10px] font-bold text-slate-400">الباقة</span><b className="mt-1 block text-[#252a4a]">{payment.planName}</b></div>
        <div><span className="block text-[10px] font-bold text-slate-400">المبلغ</span><b className="mt-1 block text-[#252a4a]">{(totalAmount / 100).toFixed(2)} ر.س</b></div>
      </div>
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">
        هذا إيصال دفع غير ضريبي، ولا يتم تقديمه كفاتورة ضريبية. بيانات المورد والحالة الضريبية أعلاه محفوظة كما كانت وقت إثبات العملية ولا يعاد بناؤها من إعدادات النظام الحالية.
      </div>
      {payment.status === "refunded" ? <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">تم استرداد هذه العملية.</div> : null}
    </section>
    <Link href="/dashboard/billing/manage" className="inline-flex min-h-11 items-center rounded-xl border border-[#ddd8f4] bg-white px-4 text-xs font-black text-[#5d49cc]">العودة لسجل المدفوعات</Link>
  </div>;
}
