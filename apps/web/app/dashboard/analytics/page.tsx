import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Eye, MapPin, MessageCircle, Phone, Share2, ShoppingBag } from "lucide-react";
import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessWithPlanForUser } from "../../lib/active-business";
import { getPlanEntitlements } from "../../lib/plan-entitlements";
import { AnalyticsVisitsChart } from "@/components/dashboard/analytics-visits-chart";

const PERIOD_OPTIONS = [7, 30, 90] as const;
type Period = (typeof PERIOD_OPTIONS)[number];
type AggregateRow = { eventType: string; day: string; count: number | bigint };

function number(value: number) { return new Intl.NumberFormat("ar-SA").format(value); }
function requestedPeriod(value?: string | string[]): Period { const raw = Array.isArray(value) ? value[0] : value; const parsed = Number(raw); return PERIOD_OPTIONS.includes(parsed as Period) ? parsed as Period : 30; }
function periodLabel(period: Period) { return period === 7 ? "7 أيام" : period === 90 ? "90 يوم" : "30 يوم"; }

function riyadhDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function shiftDateKey(key: string, days: number) {
  const base = new Date(`${key}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function riyadhMidnightUtc(key: string) {
  return new Date(`${key}T00:00:00+03:00`);
}

function chartLabel(key: string) {
  return new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", day: "numeric", month: "short" }).format(new Date(`${key}T12:00:00+03:00`));
}

export default async function DashboardAnalyticsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const params = searchParams ? await searchParams : {};

  const business = await getActiveBusinessWithPlanForUser(user.id);
  if (!business) redirect("/onboarding");

  const entitlements = getPlanEntitlements(business.plan?.code);
  const advancedAnalytics = entitlements.analytics === "advanced";
  const allowedPeriods: readonly Period[] = advancedAnalytics ? PERIOD_OPTIONS : [7];
  const requested = requestedPeriod(params.period);
  const period: Period = allowedPeriods.includes(requested) ? requested : advancedAnalytics ? 30 : 7;

  const now = new Date();
  const todayKey = riyadhDateKey(now);
  const startKey = shiftDateKey(todayKey, -(period - 1));
  const startUtc = riyadhMidnightUtc(startKey);

  // Prisma DateTime is stored by PostgreSQL as a timestamp without time zone, with
  // UTC values. Interpret that timestamp as UTC first, then convert to Riyadh for
  // calendar-day grouping; a single AT TIME ZONE would shift in the wrong direction.
  const [rows, orderConversions, bookingConversions] = await Promise.all([
    db.$queryRaw<AggregateRow[]>`
      SELECT
        "eventType",
        to_char((("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Riyadh')::date, 'YYYY-MM-DD') AS "day",
        COUNT(*)::int AS "count"
      FROM "AnalyticsEvent"
      WHERE "businessId" = ${business.id}
        AND "createdAt" >= ${startUtc}
        AND "createdAt" < ${now}
        AND "eventType" IN ('page_view', 'whatsapp_click', 'phone_click', 'share_click', 'website_click', 'map_click')
      GROUP BY "eventType", (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Riyadh')::date
      ORDER BY (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Riyadh')::date ASC
    `,
    db.order.count({ where: { businessId: business.id, createdAt: { gte: startUtc, lt: now } } }),
    db.booking.count({ where: { businessId: business.id, createdAt: { gte: startUtc, lt: now } } }),
  ]);

  const totals = new Map<string, number>();
  const viewsByDay = new Map<string, number>();
  for (const row of rows) {
    const value = Number(row.count) || 0;
    totals.set(row.eventType, (totals.get(row.eventType) ?? 0) + value);
    if (row.eventType === "page_view") viewsByDay.set(row.day, value);
  }

  const count = (type: string) => totals.get(type) ?? 0;
  const views = count("page_view");
  const whatsapp = count("whatsapp_click");
  const calls = count("phone_click");
  const shares = count("share_click");
  const maps = count("map_click");
  const website = count("website_click");
  const interactions = whatsapp + calls + shares + maps + website;
  const conversions = orderConversions + bookingConversions;

  const chartData = Array.from({ length: period }, (_, index) => {
    const dayKey = shiftDateKey(startKey, index);
    return { dayKey, label: chartLabel(dayKey), value: viewsByDay.get(dayKey) ?? 0 };
  });

  const metrics = [
    { label: "مشاهدات الصفحة", value: views, icon: Eye },
    { label: "واتساب", value: whatsapp, icon: MessageCircle },
    { label: "الاتصالات", value: calls, icon: Phone },
    { label: "المشاركة", value: shares, icon: Share2 },
    { label: "الطلبات", value: orderConversions, icon: ShoppingBag },
    { label: "الحجوزات", value: bookingConversions, icon: CalendarDays },
  ];

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-xl font-black text-[#20264f]">الأداء</h1><p className="mt-1 text-sm text-slate-500">مؤشرات بسيطة لما يفعله الزوار داخل هويتك الرقمية.</p></div><div className="flex gap-1 rounded-xl bg-[#f6f4fb] p-1">{allowedPeriods.map((option) => <Link key={option} href={`/dashboard/analytics?period=${option}`} className={`rounded-lg px-3 py-2 text-[10px] font-black ${period === option ? "bg-white text-[#5d49cc] shadow-sm" : "text-slate-400"}`}>{periodLabel(option)}</Link>)}</div></div></section>

    {!advancedAnalytics ? <div className="rounded-2xl border border-[#ddd8f4] bg-[#f8f6ff] p-4 text-sm font-bold text-[#5d49cc]">الباقة المجانية تعرض آخر 7 أيام. الترقية تفتح تحليلات 30 و90 يومًا.</div> : null}
    {!business.isPublished ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">انشر صفحتك أولاً لبدء تسجيل زيارات العملاء.</div> : null}

    <section className="grid grid-cols-2 gap-2 lg:grid-cols-3 xl:grid-cols-6">{metrics.map(({ label, value, icon: Icon }) => <article key={label} className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#f3efff] text-[#6543ce]"><Icon className="h-4 w-4" /></span><b className="mt-3 block text-2xl text-[#20264f]">{number(value)}</b><span className="mt-1 block text-[10px] text-slate-400">{label}</span></article>)}</section>

    <section className="rounded-[24px] border border-[#e9e7f3] bg-white p-4 sm:p-5"><div className="flex items-center justify-between"><div><h2 className="font-black text-[#20264f]">الزيارات</h2><p className="mt-1 text-xs text-slate-500">خلال آخر {periodLabel(period)}</p></div><span className="text-xs font-black text-[#5d49cc]">{number(views)} زيارة</span></div><div className="mt-5"><AnalyticsVisitsChart points={chartData} /></div></section>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><MessageCircle className="h-4 w-4 text-emerald-600" /><b className="mt-2 block text-lg text-[#20264f]">{number(interactions)}</b><span className="text-[10px] text-slate-400">إجمالي التفاعلات</span></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><MapPin className="h-4 w-4 text-[#6543ce]" /><b className="mt-2 block text-lg text-[#20264f]">{number(maps)}</b><span className="text-[10px] text-slate-400">فتح الموقع</span></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><Eye className="h-4 w-4 text-[#6543ce]" /><b className="mt-2 block text-lg text-[#20264f]">{views ? `${Math.round((interactions / views) * 100)}%` : "0%"}</b><span className="text-[10px] text-slate-400">معدل التفاعل</span></article><article className="rounded-[20px] border border-[#e9e7f3] bg-white p-4"><ShoppingBag className="h-4 w-4 text-[#6543ce]" /><b className="mt-2 block text-lg text-[#20264f]">{views ? `${Math.round((conversions / views) * 100)}%` : "0%"}</b><span className="text-[10px] text-slate-400">معدل التحويل إلى طلب/حجز</span></article></section>
  </div>;
}
