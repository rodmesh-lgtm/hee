import Link from "next/link";
import { CreditCard, ReceiptText, Search, ShieldCheck } from "lucide-react";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";

const PAGE_SIZE = 30;
const SUBSCRIPTION_STATUSES = ["active", "past_due", "cancelled", "expired"] as const;
const PAYMENT_STATUSES = ["created", "pending", "paid", "failed", "reversed", "refunded"] as const;

function clean(value: unknown, max = 120) { return String(value ?? "").trim().slice(0, max); }
function sar(halalas: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(halalas / 100);
}
function dt(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(value) : "—";
}

export default async function AdminBillingPage({ searchParams }: { searchParams: Promise<{ q?: string; subscriptionStatus?: string; paymentStatus?: string; provider?: string; page?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const q = clean(params.q);
  const subscriptionStatus = SUBSCRIPTION_STATUSES.includes(params.subscriptionStatus as (typeof SUBSCRIPTION_STATUSES)[number]) ? params.subscriptionStatus! : "";
  const paymentStatus = PAYMENT_STATUSES.includes(params.paymentStatus as (typeof PAYMENT_STATUSES)[number]) ? params.paymentStatus! : "";
  const provider = clean(params.provider, 40).toLowerCase();
  const page = Math.max(1, Number.parseInt(String(params.page ?? "1"), 10) || 1);

  const businessSearch = q ? { OR: [
    { business: { name: { contains: q, mode: "insensitive" as const } } },
    { business: { owner: { name: { contains: q, mode: "insensitive" as const } } } },
    { business: { owner: { email: { contains: q, mode: "insensitive" as const } } } },
  ] } : {};
  const subscriptionWhere = {
    ...businessSearch,
    ...(subscriptionStatus ? { status: subscriptionStatus } : {}),
    ...(provider ? { provider: { equals: provider, mode: "insensitive" as const } } : {}),
  };
  const paymentWhere = {
    ...businessSearch,
    ...(paymentStatus ? { status: paymentStatus } : {}),
    ...(provider ? { provider: { equals: provider, mode: "insensitive" as const } } : {}),
  };

  const [subscriptions, subscriptionCount, payments, paymentCount, paidSum, activeAccessGrants] = await Promise.all([
    db.subscription.findMany({
      where: subscriptionWhere,
      include: {
        plan: { select: { code: true, name: true, monthlyPrice: true } },
        business: { select: { id: true, name: true, owner: { select: { name: true, email: true } } } },
        accessGrants: { where: { revokedAt: null }, select: { id: true, code: { select: { label: true } } } },
      },
      orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    db.subscription.count({ where: subscriptionWhere }),
    db.billingPayment.findMany({
      where: paymentWhere,
      include: {
        plan: { select: { code: true, name: true } },
        business: { select: { id: true, name: true, owner: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
    }),
    db.billingPayment.count({ where: paymentWhere }),
    db.billingPayment.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
    db.subscriptionAccessGrant.count({ where: { revokedAt: null } }),
  ]);
  const pages = Math.max(1, Math.ceil(Math.max(subscriptionCount, paymentCount) / PAGE_SIZE));

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-[#1f2552] sm:px-6" dir="rtl"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5">
      <div className="flex items-center gap-2 text-[#6f3bd2]"><CreditCard className="h-5 w-5" /><span className="text-xs font-black">إدارة HEE المركزية</span></div>
      <h1 className="mt-2 text-2xl font-black">الاشتراكات والفوترة</h1>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">واجهة تشغيلية للقراءة والتحقق من الاشتراكات ودفتر الدفعات والإيصالات. لا توجد هنا أداة لتفعيل باقة مدفوعة يدويًا أو تغيير حالة دفع؛ الاستحقاق المدفوع يبقى تابعًا لأدلة الدفع أو لنطاق أكواد الاشتراك المنفصل.</p>
    </header>

    <section className="grid gap-3 sm:grid-cols-4">
      <Metric label="الاشتراكات المطابقة" value={subscriptionCount} />
      <Metric label="الدفعات المطابقة" value={paymentCount} />
      <Metric label="إجمالي الدفعات Paid" value={sar(paidSum._sum.amount ?? 0)} />
      <Metric label="منح Access Code النشطة" value={activeAccessGrants} />
    </section>

    <form className="grid gap-3 rounded-[22px] border border-[#e7e4f0] bg-white p-4 lg:grid-cols-[1fr_170px_170px_150px_auto]">
      <label className="relative"><Search className="absolute right-3 top-3 h-4 w-4 text-slate-400" /><input name="q" defaultValue={q} placeholder="المنشأة، المالك أو البريد" className="min-h-10 w-full rounded-xl border border-[#e4e0ec] pr-10 pl-3 text-sm" /></label>
      <select name="subscriptionStatus" defaultValue={subscriptionStatus} className="min-h-10 rounded-xl border border-[#e4e0ec] px-3 text-sm"><option value="">كل الاشتراكات</option>{SUBSCRIPTION_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}</select>
      <select name="paymentStatus" defaultValue={paymentStatus} className="min-h-10 rounded-xl border border-[#e4e0ec] px-3 text-sm"><option value="">كل الدفعات</option>{PAYMENT_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}</select>
      <input name="provider" defaultValue={provider} placeholder="provider" className="min-h-10 rounded-xl border border-[#e4e0ec] px-3 text-sm" dir="ltr" />
      <button className="min-h-10 rounded-xl bg-[#20264f] px-5 text-xs font-black text-white">تطبيق</button>
    </form>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">الاشتراكات</h2></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1100px] text-right text-xs"><thead className="text-slate-400"><tr className="border-b"><th className="py-2">المنشأة / المالك</th><th>الخطة</th><th>الحالة</th><th>Provider</th><th>Auto renew</th><th>Access grant</th><th>البداية</th><th>النهاية</th></tr></thead><tbody>{subscriptions.map((sub) => <tr key={sub.id} className="border-b border-[#f0edf5] last:border-0"><td className="py-3"><b className="block">{sub.business.name}</b><span className="text-[10px] text-slate-400">{sub.business.owner.name} · {sub.business.owner.email}</span></td><td><b>{sub.plan.name}</b><span className="block text-[10px] text-slate-400">{sub.plan.code}</span></td><td><Badge value={sub.status} /></td><td><code className="text-[10px]" dir="ltr">{sub.provider ?? "—"}</code></td><td>{sub.autoRenew ? "نعم" : "لا"}</td><td>{sub.accessGrants.length ? <span className="text-emerald-700">نشطة{sub.accessGrants[0]?.code.label ? ` · ${sub.accessGrants[0].code.label}` : ""}</span> : "—"}</td><td>{dt(sub.startsAt)}</td><td>{dt(sub.endsAt)}</td></tr>)}{!subscriptions.length ? <tr><td colSpan={8} className="py-8 text-center text-slate-400">لا توجد اشتراكات مطابقة.</td></tr> : null}</tbody></table></div>
    </section>

    <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">دفتر الدفعات والإيصالات</h2></div>
      <p className="mt-1 text-xs leading-6 text-slate-500">الدفعات هنا تخص اشتراكات HEE فقط. اشتراكات <code dir="ltr">access_code</code> لا تنشئ BillingPayment وهمية.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1180px] text-right text-xs"><thead className="text-slate-400"><tr className="border-b"><th className="py-2">الدفعة</th><th>المنشأة</th><th>الخطة</th><th>الحالة</th><th>المبلغ</th><th>Provider</th><th>المحاولة</th><th>الدفع</th><th>الإيصال</th><th>التفاصيل</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-[#f0edf5] last:border-0"><td className="py-3"><code className="text-[10px]" dir="ltr">{payment.id}</code></td><td><b className="block">{payment.business.name}</b><span className="text-[10px] text-slate-400">{payment.business.owner.email}</span></td><td>{payment.plan.code}</td><td><Badge value={payment.status} /></td><td><b>{sar(payment.amount)}</b></td><td><code className="text-[10px]" dir="ltr">{payment.provider}</code></td><td>{payment.attempt}</td><td>{dt(payment.paidAt)}</td><td>{payment.receiptIssuedAt ? <span className="text-emerald-700">موثق · {dt(payment.receiptIssuedAt)}</span> : "—"}</td><td><Link href={`/admin/billing/payments/${payment.id}`} className="inline-flex min-h-9 items-center rounded-xl bg-[#f1edff] px-3 font-black text-[#5d49cc]">فتح</Link></td></tr>)}{!payments.length ? <tr><td colSpan={10} className="py-8 text-center text-slate-400">لا توجد دفعات مطابقة.</td></tr> : null}</tbody></table></div>
    </section>

    {pages > 1 ? <nav className="flex items-center justify-between text-xs"><span>صفحة {page} من {pages}</span><div className="flex gap-2">{page > 1 ? <Link className="rounded-xl border bg-white px-4 py-2 font-black" href={{ pathname: "/admin/billing", query: { q, subscriptionStatus, paymentStatus, provider, page: page - 1 } }}>السابق</Link> : null}{page < pages ? <Link className="rounded-xl border bg-white px-4 py-2 font-black" href={{ pathname: "/admin/billing", query: { q, subscriptionStatus, paymentStatus, provider, page: page + 1 } }}>التالي</Link> : null}</div></nav> : null}
  </div></main>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div className="rounded-2xl border border-[#e7e4f0] bg-white p-4"><span className="text-xs text-slate-400">{label}</span><b className="mt-1 block text-xl">{value}</b></div>; }
function Badge({ value }: { value: string }) { return <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">{value}</span>; }
