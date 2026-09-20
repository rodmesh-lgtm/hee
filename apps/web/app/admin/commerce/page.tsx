import Link from "next/link";
import { requireAdmin } from "../../lib/admin";
import { db } from "../../lib/db";
import { commerceIntegrationHealth } from "../../lib/commerce/integration-health";

const providerNames: Record<string, string> = { salla: "سلة", shopify: "Shopify", woocommerce: "WooCommerce", zid: "زد" };
const time = (value: Date | null) => value?.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) ?? "لم يُسجّل بعد";
function safeCode(value: string | null) { return value && /^[A-Z][A-Z0-9_]{0,79}$/.test(value) ? value : value ? "COMMERCE_OPERATION_FAILED" : "—"; }
function age(value: Date | null, now: Date) {
  if (!value) return "لا يوجد نجاح مسجل";
  const minutes = Math.max(0, Math.floor((now.getTime() - value.getTime()) / 60_000));
  return minutes < 60 ? `منذ ${minutes.toLocaleString("ar-SA")} دقيقة` : `منذ ${Math.floor(minutes / 60).toLocaleString("ar-SA")} ساعة`;
}

export default async function AdminCommercePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  await requireAdmin();
  const requestedPage = Number((await searchParams).page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1;
  const [integrations, total, clock] = await Promise.all([
    db.whatsAppCommerceIntegration.findMany({
      where: { business: { deletedAt: null } },
      orderBy: [{ lastWebhookAt: "asc" }, { id: "asc" }], take: 100, skip: (page - 1) * 100,
      select: { id: true, businessId: true, provider: true, displayName: true, status: true, connectedAt: true, lastWebhookAt: true, lastErrorCode: true,
        business: { select: { name: true, slug: true } },
        shopifyWebhookSync: { select: { status: true, attemptCount: true, syncedAt: true, lastErrorCode: true } },
      },
    }),
    db.whatsAppCommerceIntegration.count({ where: { business: { deletedAt: null } } }),
    db.$queryRaw<Array<{ now: Date }>>`SELECT CURRENT_TIMESTAMP AS "now"`,
  ]);
  const now = clock[0].now;
  const ids = integrations.map(row => row.id);
  const eventSelect = { id: true, integrationId: true, status: true, attemptCount: true, receivedAt: true, processedAt: true, lastErrorCode: true } as const;
  const [sallaEvents, shopifyEvents, syncEvents] = await Promise.all([
    db.sallaWebhookEvent.findMany({ where: { integrationId: { in: ids } }, orderBy: { receivedAt: "desc" }, take: 100, select: eventSelect }),
    db.whatsAppShopifyWebhookEvent.findMany({ where: { integrationId: { in: ids } }, orderBy: { receivedAt: "desc" }, take: 100, select: eventSelect }),
    db.analyticsEvent.findMany({ where: { businessId: { in: integrations.map(row => row.businessId) }, eventType: "commerce_periodic_sync_result" }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, businessId: true, createdAt: true, metadata: true } }),
  ]);
  const stores = new Map(integrations.map(row => [row.id, row]));
  const webhookEvents = [...sallaEvents, ...shopifyEvents].sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime()).slice(0, 100);
  const recentSyncs = syncEvents.flatMap(event => {
    const data = event.metadata;
    if (!data || typeof data !== "object" || Array.isArray(data) || typeof data.integrationId !== "string") return [];
    const store = stores.get(data.integrationId);
    if (!store || store.businessId !== event.businessId || (data.outcome !== "success" && data.outcome !== "failed")) return [];
    return [{ id: event.id, store, createdAt: event.createdAt, succeeded: data.outcome === "success" }];
  });
  const delayed = integrations.filter(row => commerceIntegrationHealth(row, now).state === "delayed").length;
  const needsAction = integrations.filter(row => commerceIntegrationHealth(row, now).state === "action_required").length;
  return <div dir="rtl" className="min-w-0 space-y-6">
    <header className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7">
      <p className="text-xs font-bold text-slate-500">INFRO · تشغيل المتاجر</p>
      <h1 className="mt-2 text-2xl font-black text-slate-950">صحة تكاملات المتاجر</h1>
      <p className="mt-3 text-sm leading-7 text-slate-600">حالة الربط وآخر تحديث ناجح، ومحاولات المزامنة والإشعارات المسجلة. الأوقات بتوقيت الرياض.</p>
      <Link href="/admin/whatsapp" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-emerald-700">متابعة عامل التشغيل</Link>
    </header>
    <section aria-label="ملخص الصفحة الحالية" className="grid gap-3 sm:grid-cols-3">
      {[ ["إجمالي التكاملات", total], ["متأخرة في هذه الصفحة", delayed], ["تحتاج تدخلًا في هذه الصفحة", needsAction] ].map(([label, value]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-black text-slate-950">{value.toLocaleString("ar-SA")}</p></article>)}
    </section>
    <section aria-label="المتاجر المرتبطة" className="grid min-w-0 gap-4 xl:grid-cols-2">
      {integrations.map(row => { const health = commerceIntegrationHealth(row, now); return <article key={row.id} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-base font-black text-slate-950">{row.business.name}</h2><p className="mt-1 break-words text-sm text-slate-600">{providerNames[row.provider] ?? "مزود غير معروف"} · {row.displayName || "متجر المنشأة"}</p></div><span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{health.label}</span></div>
        <p className="mt-3 text-sm leading-7 text-slate-600">{row.provider === "zid" ? "الربط الحي بزد غير مفعل؛ يلزم التطبيق الرسمي وصلاحياته." : health.detail}</p>
        <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><div><dt className="text-slate-500">آخر تحديث ناجح</dt><dd className="mt-1 font-bold text-slate-900">{time(row.lastWebhookAt)}</dd></div><div><dt className="text-slate-500">عمر آخر نجاح</dt><dd className="mt-1 font-bold text-slate-900">{age(row.lastWebhookAt, now)}</dd></div><div><dt className="text-slate-500">رمز الخطأ</dt><dd className="mt-1 break-all font-mono text-slate-700" dir="ltr">{safeCode(row.lastErrorCode)}</dd></div>{row.shopifyWebhookSync ? <div><dt className="text-slate-500">محاولات تسجيل إشعارات Shopify</dt><dd className="mt-1 font-bold text-slate-900">{row.shopifyWebhookSync.attemptCount} · {safeCode(row.shopifyWebhookSync.lastErrorCode)}</dd></div> : null}</dl>
      </article>; })}
      {!integrations.length ? <p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">لا توجد تكاملات في هذه الصفحة.</p> : null}
    </section>
    <nav aria-label="صفحات التكاملات" className="flex flex-wrap items-center gap-4 text-sm font-bold text-slate-700">{page > 1 ? <Link className="min-h-11 p-3" href={`/admin/commerce?page=${page - 1}`}>السابق</Link> : null}<span>الصفحة {page.toLocaleString("ar-SA")}</span>{page * 100 < total ? <Link className="min-h-11 p-3" href={`/admin/commerce?page=${page + 1}`}>التالي</Link> : null}</nav>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">محاولات المزامنة الدورية</h2><p className="mt-2 text-xs leading-6 text-slate-500">آخر 100 سجل متاح لمتاجر الصفحة. يبدأ السجل من تفعيل هذه الميزة؛ لا يمثل سجلًا تاريخيًا كاملًا.</p>
      <ul className="mt-4 divide-y divide-slate-100">{recentSyncs.map(event => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm text-slate-700"><span>{event.store.business.name} · {providerNames[event.store.provider] ?? "متجر"}</span><span>{event.succeeded ? "نجحت المزامنة" : "تعذرت المزامنة"} · {time(event.createdAt)}</span></li>)}</ul>{!recentSyncs.length ? <p className="mt-4 text-sm text-slate-500">لا توجد محاولات مسجلة بعد.</p> : null}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black text-slate-950">إشعارات المتاجر ومحاولات المعالجة</h2><p className="mt-2 text-xs text-slate-500">أحدث 100 إشعار من سلة وShopify لمتاجر الصفحة.</p>
      <ul className="mt-4 divide-y divide-slate-100">{webhookEvents.map(event => <li key={event.id} className="space-y-2 py-3 text-sm text-slate-700"><p>{stores.get(event.integrationId)?.business.name} · {time(event.receivedAt)}</p><p>المحاولات: {event.attemptCount} · {event.status === "processed" ? "تمت المعالجة" : event.status === "failed" ? "فشل" : "قيد المعالجة أو الانتظار"}</p><p className="break-all font-mono text-xs" dir="ltr">{safeCode(event.lastErrorCode)}</p></li>)}</ul>{!webhookEvents.length ? <p className="mt-4 text-sm text-slate-500">لا توجد إشعارات مسجلة.</p> : null}
    </section>
  </div>;
}
