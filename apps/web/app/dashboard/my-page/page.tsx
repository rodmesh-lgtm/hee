import { redirect } from "next/navigation";
import { BarChart3, Eye, MessageCircle, Pencil, Phone, Sparkles, Tag, Package, MapPin, ChevronDown, Crown, ClipboardList } from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { db } from "../../lib/db";
import { Card } from "../../../components/ui/card";
import { MyPageEditor } from "../../../components/dashboard/my-page-editor";
import { getPublicBusinessUrlFromRequest } from "../../lib/public-url";
import { PublicShareButton } from "../../../components/public/public-share-button";
import { normalizePageModulesForPersistence, serializePageModules } from "../../lib/page-modules";

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

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function comparisonText(current: number, previous: number) {
  if (previous <= 0) {
    return null;
  }

  const percent = Math.round(((current - previous) / previous) * 100);
  const prefix = percent > 0 ? "+" : "";
  return `${prefix}${percent}%`;
}

const PAGE_VIEW_EVENT_TYPES = ["page_view", "page-view", "view_page", "public_page_view", "visit", "page_visit"];
const WHATSAPP_EVENT_TYPES = ["whatsapp_click", "contact_whatsapp", "whatsapp", "wa_click"];
const CALL_EVENT_TYPES = ["call_click", "phone_click", "contact_call", "call"];
const SHARE_EVENT_TYPES = ["share", "share_page", "share_click"];
const INQUIRY_EVENT_TYPES = ["inquiry", "inquiry_submit", "question", "contact_inquiry"];

function countEventsByTypes(eventCounts: Map<string, number>, eventTypes: string[]) {
  return eventTypes.reduce((total, eventType) => total + (eventCounts.get(eventType) ?? 0), 0);
}

export default async function DashboardMyPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = await searchParams;
  const editMode = (Array.isArray(resolvedSearchParams?.edit) ? resolvedSearchParams.edit[0] : resolvedSearchParams?.edit) === "1";

  const business = await db.business.findFirst({
    where: { ownerId: user.id },
    include: {
      plan: true,
      products: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      galleryItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] },
      socialLinks: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!business) {
    return (
      <Card className="space-y-3 border-dashed bg-slate-950/75" hoverLift={false}>
        <h1 className="text-2xl font-black text-white">صفحتي</h1>
        <p className="text-sm text-slate-300">أنشئ نشاطك أولاً لتفعيل صفحة النشاط.</p>
      </Card>
    );
  }

  const normalizedModules = normalizePageModulesForPersistence((business as { pageModules?: unknown }).pageModules, business.businessType);
  const serializedModules = serializePageModules(normalizedModules);
  const needsModuleMigration = JSON.stringify((business as { pageModules?: unknown }).pageModules) !== JSON.stringify(serializedModules);

  if (needsModuleMigration) {
    await db.business.update({
      where: { id: business.id },
      data: {
        pageModules: serializedModules,
        bookingAvailable: normalizedModules.some((module) => module.enabled && ["request", "services", "inquiry"].includes(module.id)),
        acceptOnlineOrders: normalizedModules.some((module) => module.enabled && module.id === "products"),
      },
    });
  }

  const editorBusiness = needsModuleMigration ? { ...business, pageModules: serializedModules } : business;

  const publicUrl = await getPublicBusinessUrlFromRequest(business.slug);

  if (editMode) {
    return <MyPageEditor business={editorBusiness} publicUrl={publicUrl} qrDataUrl={makeQrUrl(publicUrl)} paymentEligible={Boolean(business.plan?.onlinePay)} />;
  }

  const now = new Date();
  const currentStart = startOfDay(addDays(now, -29));
  const previousStart = startOfDay(addDays(currentStart, -30));
  const previousEnd = currentStart;

  const [currentEventGroups, previousEventGroups, ordersCount, previousOrdersCount, bookingsCount, previousBookingsCount] = await Promise.all([
    db.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { businessId: business.id, createdAt: { gte: currentStart, lt: now } },
      _count: { _all: true },
    }),
    db.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { businessId: business.id, createdAt: { gte: previousStart, lt: previousEnd } },
      _count: { _all: true },
    }),
    db.order.count({ where: { businessId: business.id, createdAt: { gte: currentStart, lt: now } } }),
    db.order.count({ where: { businessId: business.id, createdAt: { gte: previousStart, lt: previousEnd } } }),
    db.booking.count({ where: { businessId: business.id, createdAt: { gte: currentStart, lt: now } } }),
    db.booking.count({ where: { businessId: business.id, createdAt: { gte: previousStart, lt: previousEnd } } }),
  ]);

  const currentEventsMap = new Map(currentEventGroups.map((item) => [item.eventType, item._count._all]));
  const previousEventsMap = new Map(previousEventGroups.map((item) => [item.eventType, item._count._all]));

  const views = countEventsByTypes(currentEventsMap, PAGE_VIEW_EVENT_TYPES);
  const previousViews = countEventsByTypes(previousEventsMap, PAGE_VIEW_EVENT_TYPES);

  const interactions =
    countEventsByTypes(currentEventsMap, WHATSAPP_EVENT_TYPES) +
    countEventsByTypes(currentEventsMap, CALL_EVENT_TYPES) +
    countEventsByTypes(currentEventsMap, SHARE_EVENT_TYPES) +
    countEventsByTypes(currentEventsMap, INQUIRY_EVENT_TYPES);

  const previousInteractions =
    countEventsByTypes(previousEventsMap, WHATSAPP_EVENT_TYPES) +
    countEventsByTypes(previousEventsMap, CALL_EVENT_TYPES) +
    countEventsByTypes(previousEventsMap, SHARE_EVENT_TYPES) +
    countEventsByTypes(previousEventsMap, INQUIRY_EVENT_TYPES);

  const ordersAndBookings = ordersCount + bookingsCount;
  const previousOrdersAndBookings = previousOrdersCount + previousBookingsCount;
  const qrDataUrl = makeQrUrl(publicUrl);
  const statusLabel = business.isPublished ? "منشورة" : "غير منشورة";
  const statusClass = business.isPublished ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200";

  const metricCards = [
    {
      label: "مشاهدات الصفحة",
      value: views,
      comparison: comparisonText(views, previousViews),
      icon: Eye,
      iconClass: "text-[#3f63ff] bg-[#eef3ff]",
    },
    {
      label: "التفاعلات",
      value: interactions,
      comparison: comparisonText(interactions, previousInteractions),
      icon: MessageCircle,
      iconClass: "text-[#6c3ff6] bg-[#f2edff]",
    },
    {
      label: "الطلبات / الحجوزات",
      value: ordersAndBookings,
      comparison: comparisonText(ordersAndBookings, previousOrdersAndBookings),
      icon: ClipboardList,
      iconClass: "text-[#2a9d59] bg-[#eaf8ee]",
    },
  ] as const;

  return (
    <div className="space-y-5 pb-2">
      <section className="rounded-2xl border border-[#edf0fb] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-[#1f2552]">مرحباً، {business.name}</h1>
            <p className="mt-1 text-sm text-slate-500">صفحتك منشورة وكل شيء يعمل بشكل جيد.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#ddd7ff] bg-[#f2eeff] px-4 text-sm font-bold text-[#4f43d9]">
              <Eye className="h-4 w-4" />
              عرض الصفحة
            </a>
            <PublicShareButton
              title={business.name}
              text={business.shortDescription || business.description || business.businessType}
              url={publicUrl}
              label="مشاركة"
              className="h-10 rounded-xl border border-[#e6e8f5] bg-white px-4 text-sm font-bold text-slate-700"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <article key={metric.label} className="rounded-2xl border border-[#edf0fb] bg-white p-4 shadow-[0_16px_32px_-26px_rgba(50,60,120,0.55)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-500">{metric.label}</p>
                  <p className="mt-2 text-4xl font-black tracking-tight text-[#1f2552]">{formatNumber(metric.value)}</p>
                </div>
                <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${metric.iconClass}`}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              {metric.comparison ? (
                <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  {metric.comparison}
                  <span className="text-slate-500">عن الفترة السابقة</span>
                </div>
              ) : null}
            </article>
          );
        })}

        <article className="rounded-2xl border border-[#edf0fb] bg-white p-4 shadow-[0_16px_32px_-26px_rgba(50,60,120,0.55)]">
          <div className="flex h-full items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-slate-500">الفترة</p>
              <p className="mt-2 text-xl font-black text-[#1f2552]">آخر 30 يوم</p>
            </div>
            <ChevronDown className="h-5 w-5 text-slate-400" />
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[290px_minmax(0,1fr)_252px]">
        <aside className="space-y-3">
          <div className="rounded-[28px] border border-[#d9deeb] bg-white p-3 shadow-[0_35px_50px_-36px_rgba(31,37,82,0.65)]">
            <div className="mx-auto w-[210px] overflow-hidden rounded-[30px] border-[6px] border-[#131a2f] bg-white shadow-[0_22px_34px_-24px_rgba(9,11,22,0.7)]">
              <iframe src={`/${business.slug}?surface=phone`} title="معاينة الهاتف" className="h-[430px] w-full" />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <button type="button" className="rounded-xl border border-[#d8d1ff] bg-[#f3f0ff] px-3 py-2 font-bold text-[#4f43d9]">الهاتف</button>
              <button type="button" className="rounded-xl border border-[#e8eaf5] bg-white px-3 py-2 font-bold text-slate-600">سطح المكتب</button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#edf0fb] bg-white p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1f2552]">تابع أداءك</h3>
              <BarChart3 className="h-4 w-4 text-[#5b4fd8]" />
            </div>
            <p className="mt-2 text-xs leading-6 text-slate-500">انتقل إلى صفحة الأداء لمعرفة كيف يتفاعل العملاء مع صفحتك.</p>
            <a href="/dashboard/analytics" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-[#ddd7ff] bg-[#f4f1ff] px-3 py-2 text-sm font-bold text-[#4f43d9]">
              عرض الأداء
            </a>
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-2xl border border-[#edf0fb] bg-white p-4 sm:p-5 shadow-[0_18px_32px_-28px_rgba(40,50,110,0.42)]">
            <h2 className="text-2xl font-black text-[#1f2552]">صفحتي</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[152px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-2xl border border-[#e8ebf7] bg-[#f8faff]">
                {business.coverUrl ? <img src={business.coverUrl} alt={business.name} className="h-[152px] w-full object-cover" /> : <div className="flex h-[152px] items-center justify-center text-xs text-slate-400">غلاف الصفحة</div>}
              </div>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${statusClass}`}>{statusLabel}</span>
                  <h3 className="text-2xl font-black text-[#1f2552]">{business.name}</h3>
                </div>
                <p className="text-sm font-semibold text-[#4f43d9]">{publicUrl.replace(/^https?:\/\//, "")}</p>
                <p className="text-xs text-slate-500">آخر تحديث: اليوم</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <a href="/dashboard/my-page?edit=1" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5b3fd6] px-4 text-sm font-bold text-white">
                    <Pencil className="h-4 w-4" />
                    تعديل صفحتي
                  </a>
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#ded8ff] bg-[#f7f5ff] px-4 text-sm font-bold text-[#4f43d9]">
                    <Eye className="h-4 w-4" />
                    عرض الصفحة
                  </a>
                  <PublicShareButton
                    title={business.name}
                    text={business.shortDescription || business.description || business.businessType}
                    url={publicUrl}
                    label="مشاركة"
                    className="h-11 w-full rounded-xl border border-[#e6e8f5] bg-white px-4 text-sm font-bold text-slate-700"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#edf0fb] bg-white p-4 sm:p-5 shadow-[0_18px_32px_-28px_rgba(40,50,110,0.42)]">
            <h2 className="text-2xl font-black text-[#1f2552]">ما الذي تريد فعله؟</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <a href="/dashboard/branding" className="rounded-2xl border border-[#edf0fb] bg-white px-4 py-4 transition hover:border-[#ddd7ff] hover:bg-[#faf8ff]">
                <Tag className="h-5 w-5 text-[#5b4fd8]" />
                <p className="mt-3 text-sm font-black text-[#1f2552]">تغيير الصور</p>
                <p className="mt-1 text-xs text-slate-500">حدّث صور صفحتك بسهولة</p>
              </a>
              <a href="/dashboard/business" className="rounded-2xl border border-[#edf0fb] bg-white px-4 py-4 transition hover:border-[#ddd7ff] hover:bg-[#faf8ff]">
                <MapPin className="h-5 w-5 text-[#5b4fd8]" />
                <p className="mt-3 text-sm font-black text-[#1f2552]">إضافة موقع</p>
                <p className="mt-1 text-xs text-slate-500">أضف موقع نشاطك</p>
              </a>
              <a href="/dashboard/contact-links" className="rounded-2xl border border-[#edf0fb] bg-white px-4 py-4 transition hover:border-[#ddd7ff] hover:bg-[#faf8ff]">
                <Phone className="h-5 w-5 text-[#2a9d59]" />
                <p className="mt-3 text-sm font-black text-[#1f2552]">إضافة واتساب</p>
                <p className="mt-1 text-xs text-slate-500">أضف رقم تواصل جديد</p>
              </a>
              <a href="/dashboard/offers" className="rounded-2xl border border-[#edf0fb] bg-white px-4 py-4 transition hover:border-[#ddd7ff] hover:bg-[#faf8ff]">
                <Tag className="h-5 w-5 text-[#ff5a5a]" />
                <p className="mt-3 text-sm font-black text-[#1f2552]">إضافة عرض</p>
                <p className="mt-1 text-xs text-slate-500">أنشئ عرضاً جذاباً لعملائك</p>
              </a>
              <a href="/dashboard/catalog" className="rounded-2xl border border-[#edf0fb] bg-white px-4 py-4 transition hover:border-[#ddd7ff] hover:bg-[#faf8ff]">
                <Package className="h-5 w-5 text-[#9a3fe0]" />
                <p className="mt-3 text-sm font-black text-[#1f2552]">إضافة خدمة</p>
                <p className="mt-1 text-xs text-slate-500">أضف خدمة جديدة لعملائك</p>
              </a>
            </div>

            <div className="mt-4 rounded-2xl border border-[#e6defe] bg-gradient-to-l from-[#f3efff] to-[#fbf9ff] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-base font-black text-[#2a2f61]">أضف عرضاً مميزاً هذا الأسبوع لزيادة التفاعل والطلبات.</p>
                <a href="/dashboard/offers" className="inline-flex h-10 items-center justify-center rounded-xl border border-[#d9d1ff] bg-white px-4 text-sm font-bold text-[#4f43d9]">
                  إنشاء عرض الآن
                </a>
              </div>
            </div>
          </section>
        </div>

        <aside className="space-y-3">
          <section className="rounded-2xl border border-[#edf0fb] bg-white p-4 text-center">
            <div className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#f3efff] text-[#5a4ed7]">
              <Crown className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-xl font-black text-[#1f2552]">ترقّ نشاطك</h3>
            <p className="mt-2 text-sm text-slate-500">ميزات أكثر وتخصيصات أقوى مع الباقات المدفوعة.</p>
            <a href="/dashboard/settings" className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#ddd7ff] bg-[#f4f1ff] px-4 text-sm font-bold text-[#4f43d9]">
              ترقية الباقة
            </a>
          </section>

          <section className="rounded-2xl border border-[#edf0fb] bg-white p-4">
            <h3 className="text-sm font-black text-[#1f2552]">QR صفحتك</h3>
            <p className="mt-1 text-xs text-slate-500">شارك رمز الصفحة بسرعة مع العملاء.</p>
            <a href={qrDataUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#ddd7ff] bg-white px-4 text-sm font-bold text-[#4f43d9]">
              فتح QR
            </a>
          </section>
        </aside>
      </section>
    </div>
  );
}
