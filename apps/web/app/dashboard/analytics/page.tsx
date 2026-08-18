import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye, MapPin, MessageCircle, Phone, Share2 } from "lucide-react";
import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";
import { getPlanEntitlements } from "../../lib/plan-entitlements";
import { AnalyticsVisitsChart } from "@/components/dashboard/analytics-visits-chart";

const PERIOD_OPTIONS = [7, 30, 90] as const;
type Period = (typeof PERIOD_OPTIONS)[number];

function startOfDay(date: Date) { const next = new Date(date); next.setHours(0, 0, 0, 0); return next; }
function addDays(date: Date, days: number) { const next = new Date(date); next.setDate(next.getDate() + days); return next; }
function dayKey(date: Date) { return date.toISOString().slice(0, 10); }
function number(value: number) { return new Intl.NumberFormat("ar-SA").format(value); }
function requestedPeriod(value?: string | string[]): Period { const raw = Array.isArray(value) ? value[0] : value; const parsed = Number(raw); return PERIOD_OPTIONS.includes(parsed as Period) ? parsed as Period : 30; }
function periodLabel(period: Period) { return period === 7 ? "7 أيام" : period === 90 ? "90 يوم" : "30 يوم"; }

export default async function DashboardAnalyticsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = searchParams ? await searchParams : {};

  const business = await db.business.findFirst({
    where: { ownerId: user.id, deletedAt: null },
    select: { id: true, slug: true, isPublished: true, plan: { select: { code: true } } },
  });
  if (!business) redirect("/onboarding");

  const entitlements = getPlanEntitlements(business.plan?.code);
  const advancedAnalytics = entitlements.analytics === "advanced";
  const allowedPeriods: readonly Period[] = advancedAnalytics ? PERIOD_OPTIONS : [7];
  const requested = requestedPeriod(params.period);
  const period: Period = allowedPeriods.includes(requested) ? requested : advancedAnalytics ? 30 : 7;

  const now = new Date();
  const start = startOfDay(addDays(now, -(period - 1)));
  const events = await db.analyticsEvent.findMany({ where: { businessId: business.id, createdAt: { gte: start, lt: now }, eventType: { in: ["page_view", "whatsapp_click", "phone_click", "share_click", "website_click", "map_click"] } }, select: { eventType: true, createdAt: true } });

  const count = (type: string) => events.filter((event) => event.eventType === type).length;
  const views = count("page_view");
  const whatsapp = count("whatsapp_click");
  const calls = count("phone_click");
  const shares = count("share_click");
  const maps = count("map_click");
  const website = count("website_click");
  const interactions = whatsapp + calls + shares + maps + website;

  const allDays = Array.from({ length: period }, (_, index) => { const date = addDays(start, index); return { dayKey: dayKey(date), label: new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(date) }; });
  const byDay = new Map<string, number>();
  events.filter((event) => event.eventType === "page_view").forEach((event) => byDay.set(dayKey(event.createdAt), (byDay.get(dayKey(event.createdAt)) ?? 0) + 1));
  const chartData = allDays.map((day) => ({ dayKey: day.dayKey, label: day.label, value: byDay.get(day.dayKey) ?? 0 }));

  const metrics = [
    { label: "مشاهدات الصفحة", value: views, icon: Eye },
    { label: "واتساب", value: whatsapp, icon: MessageCircle },
    { label: "الاتصالات", value: calls, icon: Phone },
    { label: "المشاركة", value: shares, icon: Share2 },
  ];

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black text-[#20264f]">الأداء</h1><p className="mt-1 text-sm text-slate-500">مؤشرات بسيطة لما يفعله الزوار داخل هويتك الرقمية.</p></div><div className="flex gap-1 rounded-xl bg-[#f6f4fb] p-1">{allowedPeriods.map((option) => <Link key={option} href={`/dashboard/analytics?period=${option}`} className={`rounded-lg px-3 py-2 text-[10px] font-black ${period === option ? "bg-white text-[#5d49cc] shadow-sm" : "text-slate-400"}`}>{periodLabel(option)}</Link>)}</div></div></section>

    {!advancedAnalytics ? <div className="rounded-2xl border border-[#ddd8f4] bg-[#f8f6ff] p-4 text-sm font-bold text-[#5d49cc]">الباقة المجانية تعرض آخر 7 أيام. الترقية تفتح تحليلات 30 و90 يومًا.</div> : null}
    {!business.isPublished ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">انشر صفحتك أولاً لبدء تسجيل زيارات العملاء.</div> : null}

    <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">{metrics.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3efff] text-[#6543ce]"><Icon className="h-4 w-4" /></span><b className="mt-3 block text-2xl text-[#20264f]">{number(value)}</b><span className="mt-1 block text-[10px] text-slate-400">{label}</span></article>)}</section>

    <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-4 sm:p-5"><div className="flex items-center justify-between"><div><h2 className="font-black text-[#20264f]">الزيارات</h2><p className="mt-1 text-xs text-slate-500">خلال آخر {periodLabel(period)}</p></div><span className="text-xs font-black text-[#5d49cc]">{number(views)} زيارة</span></div><div className="mt-5"><AnalyticsVisitsChart points={chartData} /></div></section>

    <section className="grid gap-3 sm:grid-cols-3"><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><MessageCircle className="h-4 w-4 text-emerald-600" /><b className="mt-2 block text-lg text-[#20264f]">{number(interactions)}</b><span className="text-[10px] text-slate-400">إجمالي التفاعلات</span></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><MapPin className="h-4 w-4 text-[#6543ce]" /><b className="mt-2 block text-lg text-[#20264f]">{number(maps)}</b><span className="text-[10px] text-slate-400">فتح الموقع</span></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><Eye className="h-4 w-4 text-[#6543ce]" /><b className="mt-2 block text-lg text-[#20264f]">{views ? `${Math.round((interactions / views) * 100)}%` : "0%"}</b><span className="text-[10px] text-slate-400">معدل التفاعل</span></article></section>
  </div>;
}
