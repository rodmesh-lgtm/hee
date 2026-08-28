import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarClock, CreditCard, KeyRound, ReceiptText, ShieldCheck } from "lucide-react";
import { cancelAutoRenewAction } from "../../../actions/billing";
import { redeemSubscriptionAccessCodeAction } from "../../../actions/subscription-access-code";
import { getCurrentUser } from "../../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../../lib/active-business";
import { db } from "../../../lib/db";
import { CancelRenewalButton } from "../../../../components/billing/cancel-renewal-button";

function dateText(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeZone: "Asia/Riyadh" }).format(value);
}

function paymentStatus(status: string) {
  const map: Record<string, string> = {
    paid: "مدفوع",
    created: "بانتظار الدفع",
    initiated: "قيد التحقق",
    authorized: "مصرح",
    failed: "فشل",
    refunded: "مسترد",
    voided: "ملغى",
    canceled: "ملغى",
  };
  return map[status] ?? status;
}

function paymentKind(kind: string) {
  if (kind === "renewal") return "تجديد";
  if (kind === "upgrade") return "ترقية";
  return "اشتراك";
}

function accessCodeMessage(code?: string) {
  const map: Record<string, { tone: string; text: string }> = {
    activated: { tone: "border-emerald-200 bg-emerald-50 text-emerald-800", text: "تم تفعيل الباقة بواسطة كود الوصول. لا توجد عملية دفع مرتبطة بهذا التفعيل، وتبقى الباقة فعالة حتى إلغاء المنحة من الإدارة." },
    "already-active": { tone: "border-blue-200 bg-blue-50 text-blue-800", text: "هذا الكود مفعل بالفعل لهذه المنشأة." },
    "subscription-conflict": { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "يوجد اشتراك مدفوع أو تجريبي قائم حاليًا. حفاظًا على الفوترة لا يمكن لكود الوصول استبداله أو إيقافه تلقائيًا." },
    exhausted: { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "وصل هذا الكود إلى الحد الأقصى للاستخدامات." },
    revoked: { tone: "border-rose-200 bg-rose-50 text-rose-800", text: "سبق إلغاء منحة هذا الكود لهذه المنشأة ولا يمكن إعادة استخدامها تلقائيًا." },
    unavailable: { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "الباقة المرتبطة بهذا الكود غير متاحة حاليًا." },
    "rate-limited": { tone: "border-amber-200 bg-amber-50 text-amber-900", text: "تم تجاوز عدد محاولات إدخال الأكواد المسموح بها مؤقتًا. حاول لاحقًا." },
    invalid: { tone: "border-rose-200 bg-rose-50 text-rose-800", text: "الكود غير صحيح أو منتهي أو غير فعال." },
    "missing-business": { tone: "border-rose-200 bg-rose-50 text-rose-800", text: "تعذر التحقق من ملكية المنشأة." },
  };
  return code ? map[code] : undefined;
}

export default async function BillingManagePage({ searchParams }: { searchParams: Promise<{ billing?: string; code?: string; feature?: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessWithPlanForUser(user.id);
  if (!business) redirect("/onboarding");
  const params = await searchParams;

  const [subscription, payments, paymentMethod] = await Promise.all([
    db.subscription.findFirst({
      where: { businessId: business.id, status: { in: ["active", "past_due"] } },
      orderBy: { startsAt: "desc" },
      select: { id: true, status: true, autoRenew: true, startsAt: true, endsAt: true, provider: true, plan: { select: { name: true, code: true, monthlyPrice: true } } },
    }),
    db.billingPayment.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: "desc" },
      take: 24,
      select: { id: true, kind: true, amount: true, currency: true, status: true, paidAt: true, createdAt: true, plan: { select: { name: true } } },
    }),
    db.billingPaymentMethod.findFirst({
      where: { businessId: business.id, status: "active" },
      orderBy: { createdAt: "desc" },
      select: { brand: true, last4: true, provider: true },
    }),
  ]);

  const now = new Date();
  const accessCodeEffective = Boolean(subscription?.status === "active" && subscription.provider === "access_code" && subscription.endsAt === null);
  const subscriptionStillEffective = Boolean(
    subscription?.status === "active"
      && (accessCodeEffective || Boolean(subscription.endsAt && subscription.endsAt.getTime() > now.getTime())),
  );
  const renewalCancellationAvailable = Boolean(subscription?.autoRenew && ["active", "past_due"].includes(subscription.status));
  const effectivePlanName = subscriptionStillEffective ? subscription?.plan.name ?? "Free" : "Free";
  const effectivePaidThrough = subscriptionStillEffective && !accessCodeEffective ? subscription?.endsAt ?? null : null;
  const staleExpiredSubscription = Boolean(subscription?.status === "active" && subscription.provider !== "access_code" && subscription.endsAt && subscription.endsAt.getTime() <= now.getTime());
  const codeMessage = accessCodeMessage(params.code);

  return <div className="mx-auto max-w-3xl space-y-4 pb-8">
    <section className="rounded-[24px] border border-[#e8e5f2] bg-white p-5">
      <div className="flex items-start justify-between gap-3"><div><h1 className="text-xl font-black text-[#1f2552]">إدارة الاشتراك والفوترة</h1><p className="mt-1 text-sm leading-6 text-slate-500">تابع الباقة الفعالة والتجديد وسجل المدفوعات من مكان واحد.</p></div><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><CreditCard className="h-5 w-5" /></span></div>
      {params.billing === "renewal-canceled" ? <div role="status" className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">تم إيقاف التجديد التلقائي. ستظل أي فترة مدفوعة ما زالت سارية متاحة حتى نهايتها، ولن تبدأ دورة خصم مستقبلية جديدة.</div> : null}
      {params.billing === "renewal-processing-future-canceled" ? <div role="status" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-7 font-bold text-amber-950"><b>تم إيقاف التجديد للدورات المستقبلية الآن.</b><br />كانت دفعة التجديد الحالية قد بدأت بالفعل لدى مزود الدفع قبل طلب الإلغاء، لذلك قد تكتمل هذه العملية الجارية. لن تُستخدم وسيلة الدفع المحفوظة لدورة لاحقة. إذا اكتملت الدفعة الحالية فستُمنح الفترة التي دُفعت قيمتها، مع بقاء التجديد التالي متوقفًا.</div> : null}
      {codeMessage ? <div role="status" className={`mt-4 rounded-2xl border p-3 text-sm font-bold leading-6 ${codeMessage.tone}`}>{codeMessage.text}</div> : null}
      {staleExpiredSubscription ? <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 font-bold text-amber-950">انتهت الفترة المدفوعة المسجلة. يتم التعامل مع الصلاحيات الآن وفق الباقة الفعالة، حتى لو تأخرت مهمة التسوية الخلفية في تحديث السجل التاريخي.</div> : null}
      {params.feature === "whatsapp-marketing" ? <div role="status" className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-3 text-sm leading-7 font-bold text-violet-900">ميزة WhatsApp Marketing تتطلب باقة iR مدفوعة وفعالة. اشتراك iR يغطي استخدام المنصة فقط؛ رسوم محادثات ورسائل Meta وأي رصيد مرتبط بها تحاسبها Meta بصورة مستقلة ولا تسجل كإيراد اشتراك iR.</div> : null}
    </section>

    <section className="grid gap-3 sm:grid-cols-2">
      <article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><span className="text-[10px] font-bold text-slate-400">الباقة الفعالة الآن</span><h2 className="mt-1 text-xl font-black text-[#1f2552]">{effectivePlanName}</h2><div className="mt-3 flex items-center gap-2 text-xs text-slate-600"><CalendarClock className="h-4 w-4 text-[#6543ce]" />{accessCodeEffective ? "مفعلة بكود وصول إداري حتى إلغاء المنحة" : effectivePaidThrough ? `صالحة حتى ${dateText(effectivePaidThrough)}` : "لا توجد دورة فوترة مدفوعة فعالة حاليًا"}</div><div className="mt-2 text-xs font-bold text-slate-600">{accessCodeEffective ? "لا يوجد تجديد تلقائي أو خصم مالي لهذا التفعيل" : subscription?.status === "past_due" ? (subscription.autoRenew ? "الدفع متأخر والتجديد التلقائي ما زال مفعّلًا حتى توقفه" : "الدفع متأخر والتجديد التلقائي متوقف") : subscriptionStillEffective && subscription?.autoRenew ? "التجديد التلقائي مفعل" : "التجديد التلقائي غير مفعل"}</div></article>
      <article className="rounded-[22px] border border-[#e9e7f3] bg-white p-4"><span className="text-[10px] font-bold text-slate-400">وسيلة الدفع المحفوظة</span><div className="mt-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /><b className="text-sm text-[#252a4a]">{paymentMethod?.last4 ? `${paymentMethod.brand || "بطاقة"} •••• ${paymentMethod.last4}` : "لا توجد وسيلة دفع محفوظة"}</b></div><p className="mt-3 text-xs leading-6 text-slate-500">HEE لا تخزن رقم البطاقة أو CVV. تُحفظ فقط بيانات عرض مقنّعة ورمز مزود الدفع مشفرًا.</p></article>
    </section>

    <section className="rounded-[22px] border border-[#e9e7f3] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-[#6543ce]" /><h2 className="font-black text-[#1f2552]">لديك كود تفعيل؟</h2></div>
      <p className="mt-2 text-xs leading-6 text-slate-500">أدخل كود الوصول الصادر من إدارة HEE. لا ينشئ الكود دفعة وهمية، ولا يمكنه استبدال اشتراك مدفوع أو تجريبي قائم.</p>
      <form action={redeemSubscriptionAccessCodeAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input name="accessCode" required autoComplete="off" maxLength={64} dir="ltr" placeholder="HEE-..." className="h-11 min-w-0 flex-1 rounded-xl border border-[#ddd8e9] px-3 text-sm font-bold uppercase outline-none focus:border-[#7658d7]" />
        <button className="h-11 rounded-xl bg-[#5b3fd6] px-5 text-xs font-black text-white">تفعيل الكود</button>
      </form>
    </section>

    {renewalCancellationAvailable ? <section className="rounded-[22px] border border-amber-200 bg-amber-50 p-4"><h2 className="font-black text-amber-950">إيقاف التجديد التلقائي</h2><p className="mt-2 text-xs leading-6 text-amber-900">{subscription?.status === "past_due" ? "يمكنك إيقاف أي محاولات تجديد مستقبلية حتى أثناء تعثر الدفع. إذا كانت عملية خصم قد بدأت بالفعل قبل طلبك فقد تكتمل تلك العملية الجارية، لكن لن تبدأ دورة لاحقة جديدة." : "لن يتم خصم دورة جديدة بعد نهاية الفترة الحالية. لا يؤدي هذا الإجراء إلى حذف بياناتك أو إيقاف الباقة المدفوعة فورًا."}</p><form action={cancelAutoRenewAction} className="mt-3"><CancelRenewalButton /></form></section> : null}

    <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><ReceiptText className="h-4 w-4 text-[#6543ce]" /><h2 className="font-black text-[#1f2552]">سجل المدفوعات</h2></div>{payments.length ? <div className="mt-4 divide-y divide-[#efedf5]">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><b className="block text-sm text-[#252a4a]">{payment.plan.name} · {paymentKind(payment.kind)}</b><span className="mt-1 block text-[11px] text-slate-400">{dateText(payment.paidAt ?? payment.createdAt)}</span>{["paid", "refunded"].includes(payment.status) ? <Link href={`/dashboard/billing/receipt/${payment.id}`} className="mt-2 inline-flex min-h-11 items-center text-xs font-black text-[#5d49cc]">عرض إيصال الدفع</Link> : null}</div><div className="text-left"><b className="block text-sm text-[#252a4a]">{(payment.amount / 100).toFixed(2)} ر.س</b><span className="mt-1 block text-[11px] font-bold text-slate-500">{paymentStatus(payment.status)}</span></div></div>)}</div> : <p className="mt-4 text-sm text-slate-500">لا توجد مدفوعات مسجلة حتى الآن.</p>}</section>

    <div className="flex flex-wrap gap-2"><Link href="/dashboard/settings" className="inline-flex min-h-11 items-center rounded-xl border border-[#ddd8f4] px-4 text-xs font-black text-[#5d49cc]">العودة للحساب</Link><Link href="/dashboard/branding" className="inline-flex min-h-11 items-center rounded-xl bg-[#5b3fd6] px-4 text-xs font-black text-white">عرض الباقات</Link></div>
  </div>;
}
