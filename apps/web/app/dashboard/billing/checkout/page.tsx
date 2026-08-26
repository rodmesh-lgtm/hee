import Link from "next/link";
import { redirect } from "next/navigation";
import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";
import { getCurrentUser } from "../../../lib/auth";
import { billingCheckoutExpired } from "../../../lib/billing-checkout-integrity";
import { getOwnedBillingPayment } from "../../../lib/billing-ledger";
import { db } from "../../../lib/db";
import { moyasarConfigured, moyasarPublishableKey } from "../../../lib/moyasar";
import { isProductionRuntime } from "../../../lib/runtime-environment";
import { MoyasarCheckout } from "../../../../components/billing/moyasar-checkout";

function publicOrigin() {
  if (isProductionRuntime()) return "https://ir.sa";
  const raw = String(process.env.AUTH_ORIGIN ?? process.env.APP_URL ?? "http://localhost:3000").trim();
  try { return new URL(raw).origin; } catch { return "http://localhost:3000"; }
}

export default async function BillingCheckoutPage({ searchParams }: { searchParams: Promise<{ billing?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.emailVerifiedAt) redirect("/dashboard/settings?billing=email-verification-required");
  const params = await searchParams;
  const billingId = String(params.billing ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(billingId)) redirect("/dashboard/branding?billing=invalid");

  const billing = await getOwnedBillingPayment(user.id, billingId);
  if (!billing) redirect("/dashboard/branding?billing=invalid");

  const [liveBusiness, livePlan] = await Promise.all([
    db.business.findFirst({ where: { id: billing.businessId, ownerId: user.id, deletedAt: null }, select: { id: true } }),
    db.businessPlan.findFirst({ where: { id: billing.planId, isActive: true }, select: { id: true } }),
  ]);
  if (!liveBusiness || !livePlan) redirect("/dashboard/branding?billing=unavailable");

  if (billing.status === "paid") redirect("/dashboard/settings?billing=paid");
  if (["failed", "voided", "refunded", "canceled"].includes(billing.status)) redirect("/dashboard/branding?billing=failed");
  if (!["created", "initiated", "authorized"].includes(billing.status)) redirect("/dashboard/settings?billing=unavailable");

  const configured = moyasarConfigured();
  const callbackUrl = `${publicOrigin()}/api/billing/moyasar/callback?billing=${encodeURIComponent(billing.id)}`;
  const reconcileUrl = billing.providerPaymentId ? `${callbackUrl}&id=${encodeURIComponent(billing.providerPaymentId)}` : null;
  const amountSar = (billing.amount / 100).toFixed(2);
  const upgrade = billing.kind === "upgrade";
  const providerStarted = billing.status !== "created" || Boolean(billing.providerPaymentId);
  const staleProviderlessCheckout = !providerStarted && billingCheckoutExpired(billing.createdAt);

  return <div className="mx-auto max-w-2xl space-y-4 pb-8">
    <section className="rounded-[26px] border border-[#e7e4f0] bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><CreditCard className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#1f2552]">الدفع والاشتراك</h1><p className="mt-1 text-sm leading-6 text-slate-500">راجع المبلغ وشروط التجديد قبل فتح نموذج ميسر. لا تمر بيانات البطاقة عبر خوادم HEE.</p></div></div>
    </section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><span className="text-xs font-bold text-slate-400">{upgrade ? "ترقية إلى" : "الاشتراك في"}</span><h2 className="mt-1 text-2xl font-black text-[#1f2552]">{billing.planName}</h2></div><div className="text-left"><span className="text-xs text-slate-400">المبلغ المستحق الآن</span><div className="mt-1 text-2xl font-black text-[#5b3fd6]">{amountSar} ر.س</div></div></div>
      <p className="mt-4 rounded-2xl bg-[#faf9fd] p-3 text-xs leading-6 text-slate-600">{upgrade ? "هذا المبلغ محسوب للمدة المتبقية من اشتراكك الحالي، ولن تدفع سعر شهر كامل مرتين." : `سعر الباقة ${billing.monthlyPrice} ر.س شهريًا. عند حفظ وسيلة الدفع بنجاح يمكن تجديد الاشتراك تلقائيًا، ويمكنك إيقاف التجديد من إدارة الاشتراك.`}</p>
      <div className="mt-3 rounded-2xl border border-[#ece9f3] p-3 text-xs leading-6 text-slate-600">الإلغاء يوقف الخصم للدورات المستقبلية ولا يحذف بياناتك أو يلغي الفترة المدفوعة فورًا. الاسترداد ليس تلقائيًا بمجرد الإلغاء؛ تطبق الحقوق النظامية والشروط السارية. <Link href="/terms" className="font-black text-[#5d49cc] underline underline-offset-4">راجع الشروط</Link>.</div>
    </section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" />دفع مشفر · تحقق 3D Secure · Mada / Visa / Mastercard</div>
      {staleProviderlessCheckout ? <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950"><b>انتهت صلاحية رابط الدفع القديم قبل بدء أي عملية لدى ميسر.</b><br />لن نسمح باستخدام سعر أو تفاصيل Checkout قديمة. ارجع إلى الباقات وأنشئ عملية دفع جديدة بالمعلومات الحالية.<div className="mt-3"><Link href="/dashboard/branding" className="inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-black text-amber-950">العودة إلى الباقات</Link></div></div> : providerStarted ? <div role="status" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><b>عملية الدفع قيد التحقق.</b><br />لن نعرض نموذج دفع جديد لنفس العملية حتى لا يحدث خصم مكرر. إذا أكملت التحقق البنكي فستتحدث حالة اشتراكك تلقائيًا.{reconcileUrl ? <div className="mt-3"><Link href={reconcileUrl} prefetch={false} className="inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-4 text-xs font-black text-amber-950">التحقق من حالة العملية الآن</Link></div> : null}</div> : configured ? <MoyasarCheckout amount={billing.amount} publishableKey={moyasarPublishableKey()} callbackUrl={callbackUrl} billingId={billing.id} businessId={billing.businessId} description={`HEE ${billing.planName} subscription`} /> : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900"><b>الدفع غير مفعّل في هذه البيئة.</b><br />لن يتم تحصيل أي مبلغ حتى تُضاف مفاتيح ميسر المعتمدة للبيئة الحالية.</div>}
    </section>

    <section className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#ece9f3] bg-white p-4 text-xs text-slate-500"><span className="inline-flex items-center gap-2"><LockKeyhole className="h-4 w-4" />لا نطلب منك إرسال بيانات البطاقة عبر الدعم.</span><Link href="/dashboard/branding" className="font-black text-[#5d49cc]">العودة للباقات</Link></section>
  </div>;
}
