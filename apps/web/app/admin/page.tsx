import Link from "next/link";
import { BadgeCheck, BriefcaseBusiness, ExternalLink, ShieldCheck } from "lucide-react";
import { approvePlanUpgradeAdminAction, approveVerificationAdminAction } from "../actions/admin";
import { requireAdmin } from "../lib/admin";
import { db } from "../lib/db";

function meta(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export default async function AdminPage() {
  await requireAdmin();
  const [events, plans] = await Promise.all([
    db.analyticsEvent.findMany({
      where: { eventType: { in: ["verification_requested", "plan_upgrade_requested"] } },
      include: { business: { select: { id: true, name: true, slug: true, isVerified: true, plan: { select: { code: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.businessPlan.findMany({ where: { isActive: true }, select: { code: true } }),
  ]);

  const activePlans = new Set(plans.map((plan) => plan.code));
  const pending = events.filter((event) => String(meta(event.metadata).status ?? "pending") === "pending");
  const verification = pending.filter((event) => event.eventType === "verification_requested");
  const upgrades = pending.filter((event) => event.eventType === "plan_upgrade_requested");

  return <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-8 text-[#1f2552] sm:px-6">
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-[26px] border border-[#e7e4f0] bg-white p-5"><div><span className="text-2xl font-black tracking-[-.08em] text-[#6f3bd2]">HEE</span><h1 className="mt-2 text-xl font-black">إدارة طلبات الإطلاق</h1><p className="mt-1 text-sm text-slate-500">طلبات التوثيق والترقية التي تحتاج مراجعة يدوية.</p></div><Link href="/dashboard" className="rounded-xl border border-[#e3dfed] px-4 py-2 text-xs font-black text-[#5d49cc]">لوحة العميل</Link></header>

      <section className="grid gap-3 sm:grid-cols-3"><Metric title="طلبات معلقة" value={pending.length} /><Metric title="توثيق" value={verification.length} /><Metric title="ترقية" value={upgrades.length} /></section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-blue-600" /><h2 className="font-black">طلبات التوثيق</h2></div><div className="mt-4 space-y-2">{verification.length ? verification.map((event) => <article key={event.id} className="flex flex-col gap-3 rounded-2xl border border-[#ece9f3] p-4 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-sm">{event.business.name}</b><span className="mt-1 block text-xs text-slate-500">hee.sa/{event.business.slug} · {event.business.plan?.name ?? "Free"}</span></div><div className="flex items-center gap-2"><a href={`/${event.business.slug}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5e1ec] text-slate-500" aria-label="فتح الصفحة"><ExternalLink className="h-4 w-4" /></a>{event.business.isVerified ? <span className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-black text-blue-700">موثق بالفعل</span> : <form action={approveVerificationAdminAction}><input type="hidden" name="eventId" value={event.id} /><button className="h-9 rounded-xl bg-blue-600 px-4 text-xs font-black text-white">اعتماد التوثيق</button></form>}</div></article>) : <Empty text="لا توجد طلبات توثيق معلقة." />}</div></section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">طلبات الترقية</h2></div><div className="mt-4 space-y-2">{upgrades.length ? upgrades.map((event) => { const requestedPlan = String(meta(event.metadata).requestedPlan ?? "BUSINESS").toUpperCase(); const planReady = activePlans.has(requestedPlan); return <article key={event.id} className="flex flex-col gap-3 rounded-2xl border border-[#ece9f3] p-4 sm:flex-row sm:items-center sm:justify-between"><div><b className="text-sm">{event.business.name}</b><span className="mt-1 block text-xs text-slate-500">{event.business.plan?.code ?? "FREE"} ← {requestedPlan}</span>{!planReady ? <span className="mt-1 block text-[11px] font-bold text-rose-600">الباقة {requestedPlan} غير مهيأة في قاعدة البيانات بعد.</span> : null}</div><div className="flex items-center gap-2"><a href={`/${event.business.slug}`} target="_blank" rel="noreferrer" className="grid h-9 w-9 place-items-center rounded-xl border border-[#e5e1ec] text-slate-500" aria-label="فتح الصفحة"><ExternalLink className="h-4 w-4" /></a><form action={approvePlanUpgradeAdminAction}><input type="hidden" name="eventId" value={event.id} /><button disabled={!planReady} className="h-9 rounded-xl bg-[#6f3bd2] px-4 text-xs font-black text-white disabled:bg-slate-300">اعتماد الترقية</button></form></div></article>; }) : <Empty text="لا توجد طلبات ترقية معلقة." />}</div></section>

      <section className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-xs leading-6 text-amber-900"><div className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><p><b>مراجعة يدوية:</b> اعتماد التوثيق يعني أنك تحققت فعليًا من المنشأة. واعتماد الترقية يجب أن يتم فقط بعد تأكيد الاتفاق/الدفع خارج النظام إلى أن تُربط بوابة الدفع.</p></div></section>
    </div>
  </main>;
}

function Metric({ title, value }: { title: string; value: number }) { return <article className="rounded-[20px] border border-[#e7e4f0] bg-white p-4"><span className="text-[10px] font-bold text-slate-400">{title}</span><b className="mt-1 block text-2xl font-black">{value}</b></article>; }
function Empty({ text }: { text: string }) { return <div className="rounded-2xl bg-[#faf9fd] px-4 py-6 text-center text-sm text-slate-500">{text}</div>; }
