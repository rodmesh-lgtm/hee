import Link from "next/link";
import { redirect } from "next/navigation";
import type { ComponentType } from "react";
import { ArrowUpRight, CalendarDays, ChartNoAxesColumn, CircleHelp, Handshake, Link2, MessageCircle, Phone, QrCode, ShoppingBag } from "lucide-react";
import { db } from "../../lib/db";
import { getCurrentUser } from "../../lib/auth";
import { getPublicBusinessUrlFromRequest } from "../../lib/public-url";
import { PublicShareButton } from "../../../components/public/public-share-button";
import { AnalyticsVisitsChart } from "@/components/dashboard/analytics-visits-chart";

const PERIOD_OPTIONS = [7, 30, 90] as const;

const PAGE_VIEW_EVENT_TYPES = ["page_view", "page-view", "view_page", "public_page_view", "visit", "page_visit"];
const WHATSAPP_EVENT_TYPES = ["whatsapp_click", "contact_whatsapp", "whatsapp", "wa_click"];
const CALL_EVENT_TYPES = ["call_click", "phone_click", "contact_call", "call"];
const INQUIRY_EVENT_TYPES = ["inquiry", "inquiry_submit", "question", "contact_inquiry"];
const WEBSITE_EVENT_TYPES = ["website_click", "site_click", "open_website", "website"];
const SHARE_EVENT_TYPES = ["share", "share_page", "share_click"];

type MetricCard = {
  label: string;
  value: number;
  comparisonText: string | null;
};

type ActionRow = {
  key: string;
  label: string;
  value: number;
  icon: ComponentType<{ className?: string }>;
};

function makeQrUrl(url: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function comparisonText(current: number, previous: number) {
  if (previous <= 0) {
    return null;
  }

  const percent = Math.round(((current - previous) / previous) * 100);
  const prefix = percent > 0 ? "+" : "";
  return `${prefix}${percent}% عن الفترة السابقة`;
}

function countEventsByTypes(eventCounts: Map<string, number>, eventTypes: string[]) {
  return eventTypes.reduce((total, eventType) => total + (eventCounts.get(eventType) ?? 0), 0);
}

function parsePeriod(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (PERIOD_OPTIONS.includes(parsed as (typeof PERIOD_OPTIONS)[number])) {
    return parsed as (typeof PERIOD_OPTIONS)[number];
  }
  return 30;
}

function periodLabel(days: (typeof PERIOD_OPTIONS)[number]) {
  if (days === 7) return "آخر 7 أيام";
  if (days === 90) return "آخر 90 يوم";
  return "آخر 30 يوم";
}

function buildInsight({
  pageViews,
  previousPageViews,
  actions,
}: {
  pageViews: number;
  previousPageViews: number;
  actions: Array<ActionRow>;
}) {
  const mostUsedAction = actions.reduce<ActionRow | null>((top, current) => {
    if (!top || current.value > top.value) {
      return current;
    }
    return top;
  }, null);

  if (mostUsedAction && mostUsedAction.value > 0) {
    if (mostUsedAction.key === "whatsapp") {
      return "واتساب هو أكثر وسيلة يستخدمها عملاؤك للتواصل.";
    }

    if (mostUsedAction.key === "request") {
      return "العملاء يتفاعلون أكثر مع الطلب / الحجز في هذه الفترة.";
    }

    if (mostUsedAction.key === "share") {
      return "مشاركة الصفحة تساعدك في جذب تفاعل جديد من العملاء.";
    }

    return `أكثر تفاعل حالياً يأتي من: ${mostUsedAction.label}.`;
  }

  if (previousPageViews > 0 && pageViews > previousPageViews) {
    return "زيارات صفحتك ارتفعت مقارنة بالفترة السابقة.";
  }

  return "ابدأ بمشاركة صفحتك، وسنساعدك على فهم تفاعل عملائك هنا.";
}

export default async function DashboardAnalyticsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : {};
  const period = parsePeriod(resolvedSearchParams.period);

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    select: {
      id: true,
      name: true,
      slug: true,
      shortDescription: true,
      description: true,
      businessType: true,
      primaryColor: true,
    },
  });

  if (!business) {
    return (
      <section className="rounded-2xl border border-dashed border-[#dfe4f6] bg-white p-6 text-center">
        <h1 className="text-xl font-black text-[#1f2552]">الأداء</h1>
        <p className="mt-2 text-sm text-slate-600">أنشئ نشاطك أولاً حتى نعرض لك مؤشرات الأداء.</p>
      </section>
    );
  }

  const now = new Date();
  const currentStart = startOfDay(addDays(now, -(period - 1)));
  const previousStart = startOfDay(addDays(currentStart, -period));
  const previousEnd = currentStart;

  const [
    currentEventGroups,
    previousEventGroups,
    currentOrdersCount,
    previousOrdersCount,
    currentBookingsCount,
    previousBookingsCount,
    visitEvents,
  ] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["eventType"],
      where: {
        businessId: business.id,
        createdAt: { gte: currentStart, lt: now },
      },
      _count: { _all: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["eventType"],
      where: {
        businessId: business.id,
        createdAt: { gte: previousStart, lt: previousEnd },
      },
      _count: { _all: true },
    }),
    db.order.count({ where: { businessId: business.id, createdAt: { gte: currentStart, lt: now } } }),
    db.order.count({ where: { businessId: business.id, createdAt: { gte: previousStart, lt: previousEnd } } }),
    db.booking.count({ where: { businessId: business.id, createdAt: { gte: currentStart, lt: now } } }),
    db.booking.count({ where: { businessId: business.id, createdAt: { gte: previousStart, lt: previousEnd } } }),
    db.analyticsEvent.findMany({
      where: {
        businessId: business.id,
        eventType: { in: PAGE_VIEW_EVENT_TYPES },
        createdAt: { gte: currentStart, lt: now },
      },
      select: { createdAt: true },
    }),
  ]);

  const currentEventsMap = new Map(currentEventGroups.map((item) => [item.eventType, item._count._all]));
  const previousEventsMap = new Map(previousEventGroups.map((item) => [item.eventType, item._count._all]));

  const pageViews = countEventsByTypes(currentEventsMap, PAGE_VIEW_EVENT_TYPES);
  const previousPageViews = countEventsByTypes(previousEventsMap, PAGE_VIEW_EVENT_TYPES);

  const whatsappClicks = countEventsByTypes(currentEventsMap, WHATSAPP_EVENT_TYPES);
  const callClicks = countEventsByTypes(currentEventsMap, CALL_EVENT_TYPES);
  const inquiryEvents = countEventsByTypes(currentEventsMap, INQUIRY_EVENT_TYPES);
  const websiteClicks = countEventsByTypes(currentEventsMap, WEBSITE_EVENT_TYPES);
  const shareClicks = countEventsByTypes(currentEventsMap, SHARE_EVENT_TYPES);

  const previousWhatsappClicks = countEventsByTypes(previousEventsMap, WHATSAPP_EVENT_TYPES);
  const previousCallClicks = countEventsByTypes(previousEventsMap, CALL_EVENT_TYPES);
  const previousInquiryEvents = countEventsByTypes(previousEventsMap, INQUIRY_EVENT_TYPES);
  const previousWebsiteClicks = countEventsByTypes(previousEventsMap, WEBSITE_EVENT_TYPES);
  const previousShareClicks = countEventsByTypes(previousEventsMap, SHARE_EVENT_TYPES);

  const ordersBookings = currentOrdersCount + currentBookingsCount;
  const previousOrdersBookings = previousOrdersCount + previousBookingsCount;

  const interactions = whatsappClicks + callClicks + websiteClicks + shareClicks + ordersBookings + inquiryEvents;
  const previousInteractions = previousWhatsappClicks + previousCallClicks + previousWebsiteClicks + previousShareClicks + previousOrdersBookings + previousInquiryEvents;

  const inquiries = inquiryEvents;
  const previousInquiries = previousInquiryEvents;

  const metricCards: MetricCard[] = [
    { label: "مشاهدات الصفحة", value: pageViews, comparisonText: comparisonText(pageViews, previousPageViews) },
    { label: "التفاعلات", value: interactions, comparisonText: comparisonText(interactions, previousInteractions) },
    { label: "الطلبات / الحجوزات", value: ordersBookings, comparisonText: comparisonText(ordersBookings, previousOrdersBookings) },
    { label: "الاستفسارات", value: inquiries, comparisonText: comparisonText(inquiries, previousInquiries) },
  ];

  const actionRows: ActionRow[] = [
    { key: "whatsapp", label: "واتساب", value: whatsappClicks, icon: MessageCircle },
    { key: "call", label: "اتصال", value: callClicks, icon: Phone },
    { key: "request", label: "طلب / حجز", value: ordersBookings, icon: ShoppingBag },
    { key: "inquiry", label: "استفسار", value: inquiries, icon: CircleHelp },
    { key: "website", label: "فتح الموقع", value: websiteClicks, icon: Link2 },
    { key: "share", label: "مشاركة الصفحة", value: shareClicks, icon: Handshake },
  ].filter((row) => row.value > 0);

  const totalActivity = metricCards.reduce((sum, metric) => sum + metric.value, 0);
  const mostlyEmpty = totalActivity === 0;

  const allChartDays = Array.from({ length: period }, (_, index) => {
    const dayDate = addDays(currentStart, index);
    return {
      dayKey: toDayKey(dayDate),
      label: new Intl.DateTimeFormat("ar-SA", { day: "numeric", month: "short" }).format(dayDate),
    };
  });

  const visitsByDay = new Map<string, number>();
  for (const event of visitEvents) {
    const dayKey = toDayKey(event.createdAt);
    visitsByDay.set(dayKey, (visitsByDay.get(dayKey) ?? 0) + 1);
  }

  const chartPoints = allChartDays.map((day) => ({
    label: day.label,
    dayKey: day.dayKey,
    value: visitsByDay.get(day.dayKey) ?? 0,
  }));

  const hasChartData = chartPoints.some((point) => point.value > 0);
  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);
  const qrDataUrl = makeQrUrl(publicUrl);

  const topInterest = actionRows
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const showTopInterest = topInterest.length >= 3;

  const insight = buildInsight({
    pageViews,
    previousPageViews,
    actions: actionRows,
  });

  return (
    <div className="space-y-5">
      <section className="space-y-3 rounded-2xl border border-[#edf0fb] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#1f2552]">الأداء</h1>
            <p className="mt-1 text-sm text-slate-500">اعرف كيف يتفاعل العملاء مع صفحتك</p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-xl border border-[#e8eafb] bg-[#f9faff] p-1">
            {PERIOD_OPTIONS.map((days) => {
              const active = days === period;
              return (
                <Link
                  key={days}
                  href={`/dashboard/analytics?period=${days}`}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    active ? "bg-white text-[#4f43d9] shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {periodLabel(days)}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <article key={metric.label} className="rounded-2xl border border-[#edf0fb] bg-white p-4">
            <p className="text-3xl font-black tracking-tight text-[#1f2552]">{formatNumber(metric.value)}</p>
            <p className="mt-1 text-sm font-semibold text-slate-600">{metric.label}</p>
            {metric.comparisonText ? <p className="mt-2 text-xs font-bold text-[#4f43d9]">{metric.comparisonText}</p> : null}
          </article>
        ))}
      </section>

      {mostlyEmpty ? (
        <section className="rounded-2xl border border-dashed border-[#dce2f7] bg-white p-5 text-center">
          <h2 className="text-lg font-black text-[#1f2552]">ابدأ أولى زياراتك</h2>
          <p className="mt-2 text-sm text-slate-600">شارك صفحتك مع عملائك، وستظهر لك هنا المشاهدات والتفاعلات والطلبات بشكل مبسط.</p>
          <div className="mt-4 inline-flex">
            <PublicShareButton
              title={business.name}
              text={business.shortDescription || business.description || business.businessType}
              url={publicUrl}
              label="مشاركة الصفحة"
              className="h-10 rounded-xl border border-[#ddd7ff] bg-[#f4f1ff] px-4 text-sm font-bold text-[#4f43d9]"
            />
          </div>
        </section>
      ) : null}

      {!mostlyEmpty ? (
        <>
          <section className="rounded-2xl border border-[#edf0fb] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <ChartNoAxesColumn className="h-4 w-4 text-[#5a4fd5]" />
              <h2 className="text-lg font-black text-[#1f2552]">ماذا فعل العملاء؟</h2>
            </div>

            {actionRows.length === 0 ? (
              <p className="rounded-xl bg-[#f9faff] px-3 py-3 text-sm text-slate-600">لا توجد تفاعلات كافية في هذه الفترة بعد.</p>
            ) : (
              <div className="divide-y divide-[#eef1fb]">
                {actionRows.map((action) => {
                  const Icon = action.icon;
                  return (
                    <div key={action.key} className="flex items-center justify-between py-3 text-sm">
                      <div className="flex items-center gap-2 font-semibold text-slate-700">
                        <Icon className="h-4 w-4 text-[#5a4fd5]" />
                        <span>{action.label}</span>
                      </div>
                      <span className="text-base font-black text-[#1f2552]">{formatNumber(action.value)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-[#edf0fb] bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-[#1f2552]">زيارات صفحتك</h2>
              <div className="inline-flex items-center gap-1 rounded-full bg-[#f5f7ff] px-3 py-1 text-xs font-semibold text-slate-600">
                <CalendarDays className="h-3.5 w-3.5" />
                {periodLabel(period)}
              </div>
            </div>

            {hasChartData ? (
              <AnalyticsVisitsChart points={chartPoints} color={business.primaryColor || "#5D43EF"} />
            ) : (
              <div className="rounded-xl border border-dashed border-[#dce2f7] bg-[#f9faff] p-4 text-sm text-slate-600">
                <p className="font-bold text-slate-700">لا توجد زيارات كافية لعرض الرسم حتى الآن.</p>
                <p className="mt-1">شارك صفحتك وابدأ في استقبال الزوار.</p>
              </div>
            )}
          </section>

          {showTopInterest ? (
            <section className="rounded-2xl border border-[#edf0fb] bg-white p-4">
              <h2 className="text-lg font-black text-[#1f2552]">الأكثر اهتماماً</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {topInterest.slice(0, 5).map((item) => (
                  <div key={item.key} className="rounded-xl border border-[#edf0fb] bg-[#fbfcff] px-3 py-2 text-sm">
                    <p className="font-semibold text-slate-600">{item.label}</p>
                    <p className="mt-1 text-lg font-black text-[#1f2552]">{formatNumber(item.value)}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[#edf0fb] bg-white p-4">
            <h2 className="text-base font-black text-[#1f2552]">ملاحظة من HEE</h2>
            <p className="mt-2 text-sm text-slate-600">{insight}</p>
          </section>

          <section className="rounded-2xl border border-[#eceffc] bg-gradient-to-l from-[#f8f7ff] to-white p-4">
            <h2 className="text-lg font-black text-[#1f2552]">زد زيارات صفحتك</h2>
            <p className="mt-1 text-sm text-slate-600">شارك رابط صفحتك مع عملائك لتزيد فرص التواصل والطلبات.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PublicShareButton
                title={business.name}
                text={business.shortDescription || business.description || business.businessType}
                url={publicUrl}
                label="مشاركة الصفحة"
                className="h-10 rounded-xl border border-[#ddd7ff] bg-[#f4f1ff] px-4 text-sm font-bold text-[#4f43d9]"
              />
              <a
                href={qrDataUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#ddd7ff] bg-white px-4 text-sm font-bold text-[#4f43d9]"
              >
                <QrCode className="h-4 w-4" />
                QR
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
