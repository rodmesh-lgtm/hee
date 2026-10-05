import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { ArrowRight, Download, MessageCircle, Radio, Search } from "lucide-react";
import { db } from "../../../../lib/db";
import { getWhatsAppReadContext } from "../../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../../lib/whatsapp/feature-entitlement";
import { campaignAnalytics, recipientStatusLabels, reportPageNumber } from "../../../../lib/whatsapp/campaign-analytics";
import { campaignFailureReason, campaignOutcome, formatCampaignTime } from "../../../../lib/whatsapp/campaign-presentation";
import { LiveReportRefresh } from "../../live-report-refresh";
import { ActivityChart, DeliveryDistribution, PerformanceMetrics } from "../../_components/performance-visuals";

export default async function CampaignReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const { id } = await params;
  if (!id || id.length > 128) notFound();
  const campaign = await db.whatsAppCampaign.findFirst({ where: { id, businessId: context.businessId }, select: { id: true, name: true, status: true, totalRecipients: true, createdAt: true, startedAt: true, templateSnapshot: true, template: { select: { name: true, language: true, components: true } }, connection: { select: { verifiedName: true, displayPhoneNumber: true } } } });
  if (!campaign) notFound();
  const filters = await searchParams;
  const q = String(filters.q ?? "").trim().slice(0, 80);
  const status = Object.hasOwn(recipientStatusLabels, filters.status ?? "") ? filters.status! : "all";
  const requestedPage = reportPageNumber(filters.page);
  const recipientWhere: Prisma.WhatsAppCampaignRecipientWhereInput = { businessId: context.businessId, campaignId: campaign.id, ...(status !== "all" ? { status } : {}), ...(q ? { OR: [{ displayName: { contains: q, mode: "insensitive" } }, { phoneE164: { contains: q } }] } : {}) };
  // One repeatable snapshot keeps totals and pages consistent as receipts arrive.
  const data = await db.$transaction(async tx => {
    const groups = await tx.whatsAppCampaignRecipient.groupBy({ by: ["status"], where: { businessId: context.businessId, campaignId: campaign.id }, _count: { _all: true, sentAt: true } });
    const failures = await tx.whatsAppDeliveryJob.groupBy({ by: ["lastErrorCode"], where: { businessId: context.businessId, campaignId: campaign.id, status: "failed" }, _count: { _all: true } });
    const total = await tx.whatsAppCampaignRecipient.count({ where: recipientWhere });
    const page = Math.min(requestedPage, Math.max(1, Math.ceil(total / 25)));
    const recipients = await tx.whatsAppCampaignRecipient.findMany({ where: recipientWhere, orderBy: { id: "asc" }, skip: (page - 1) * 25, take: 25, select: { id: true, displayName: true, phoneE164: true, status: true, sentAt: true, deliveredAt: true, readAt: true, failedAt: true, deliveryJob: { select: { lastErrorCode: true, status: true, attemptCount: true, nextAttemptAt: true } } } });
    const hourly = await tx.$queryRaw<Array<{ hour: Date; accepted: number; delivered: number; read: number }>>(Prisma.sql`
      WITH events AS (
        SELECT r."sentAt" AS at, 'accepted' AS kind FROM "WhatsAppCampaignRecipient" r WHERE r."businessId" = ${context.businessId} AND r."campaignId" = ${campaign.id} AND r."sentAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        UNION ALL
        SELECT r."deliveredAt", 'delivered' FROM "WhatsAppCampaignRecipient" r WHERE r."businessId" = ${context.businessId} AND r."campaignId" = ${campaign.id} AND r."deliveredAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
        UNION ALL
        SELECT r."readAt", 'read' FROM "WhatsAppCampaignRecipient" r WHERE r."businessId" = ${context.businessId} AND r."campaignId" = ${campaign.id} AND r."readAt" >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      )
      SELECT DATE_TRUNC('hour', at) AS hour, COUNT(*) FILTER (WHERE kind = 'accepted')::int AS accepted, COUNT(*) FILTER (WHERE kind = 'delivered')::int AS delivered, COUNT(*) FILTER (WHERE kind = 'read')::int AS read
      FROM events GROUP BY DATE_TRUNC('hour', at) ORDER BY hour ASC
    `);
    const attribution = await tx.$queryRaw<Array<{ clicks: number; bookings: number; replies: number }>>(Prisma.sql`
      SELECT
        (SELECT COUNT(*)::int FROM "AnalyticsEvent" a WHERE a."businessId" = ${context.businessId} AND a."eventType" = 'whatsapp_campaign_click' AND a."metadata"->>'campaignId' = ${campaign.id}) AS clicks,
        (SELECT COUNT(*)::int FROM "AnalyticsEvent" a WHERE a."businessId" = ${context.businessId} AND a."eventType" = 'whatsapp_campaign_booking' AND a."metadata"->>'campaignId' = ${campaign.id}) AS bookings,
        (SELECT COUNT(DISTINCT j."recipientId")::int FROM "WhatsAppDeliveryJob" j
          JOIN "WhatsAppMessage" m ON m."businessId" = j."businessId" AND m."direction" = 'inbound' AND m."payload"->'context'->>'id' = j."providerMessageId"
          WHERE j."businessId" = ${context.businessId} AND j."campaignId" = ${campaign.id}) AS replies
    `);
    const clock = await tx.$queryRaw<Array<{ now: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP AS now`);
    return { groups, failures, total, page, recipients, hourly, attribution: attribution[0], observedAt: clock[0].now };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 15000 });
  const stats = campaignAnalytics(campaign.totalRecipients, Object.fromEntries(data.groups.map(group => [group.status, group._count._all])), data.groups.reduce((sum, group) => sum + group._count.sentAt, 0));
  const outcome = campaignOutcome({ status: campaign.status, failed: stats.failed, delivered: stats.delivered, total: stats.total });
  const statusLabel = outcome.label ?? ({ running: "قيد الإرسال", ready: "جاهزة للإطلاق", paused: "متوقفة مؤقتًا", scheduled: "مجدولة", cancelled: "ملغاة", failed: "تعذر إكمالها", draft: "مسودة" } as Record<string, string>)[campaign.status] ?? "قيد المتابعة";
  const endHour = Math.floor(data.observedAt.getTime() / 3600000) * 3600000;
  const points = Array.from({ length: 24 }, (_, index) => {
    const at = endHour - (23 - index) * 3600000;
    const row = data.hourly.find(row => row.hour.getTime() === at);
    return { label: new Date(at).toLocaleTimeString("ar-SA", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit" }), accepted: row?.accepted ?? 0, delivered: row?.delivered ?? 0, read: row?.read ?? 0 };
  });
  const snapshot = campaign.templateSnapshot && typeof campaign.templateSnapshot === "object" && !Array.isArray(campaign.templateSnapshot) ? campaign.templateSnapshot : null;
  const components = snapshot?.components ?? campaign.template.components;
  const textParts = Array.isArray(components) ? components.flatMap(item => item && typeof item === "object" && !Array.isArray(item) && typeof item.text === "string" ? [{ type: String(item.type), text: item.text }] : []) : [];
  const snapshotAvailable = Array.isArray(snapshot?.components);
  const href = (page: number) => `?${new URLSearchParams({ q, status, page: String(page) })}#recipients`;
  const fmt = (value: number) => new Intl.NumberFormat("ar-SA").format(value);
  return <div className="min-w-0 space-y-5 pb-6">
    <Link href="/dashboard/whatsapp/campaigns" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#008f87]"><ArrowRight className="h-4 w-4" />كل الحملات</Link>
    <header className="relative overflow-hidden rounded-3xl bg-[#071e22] p-5 text-white sm:p-7"><div className="pointer-events-none absolute -left-12 -top-16 h-64 w-64 rounded-full bg-[#00bfae]/15 blur-3xl" /><div className="relative flex flex-wrap items-start justify-between gap-5"><div className="min-w-0"><span className="inline-flex items-center gap-2 text-xs font-bold text-[#70e8d6]"><Radio className="h-4 w-4" />متابعة الحملة</span><h1 className="mt-3 break-words text-2xl font-black sm:text-3xl">{campaign.name}</h1><p className="mt-2 text-sm text-[#b8d2ce]">{campaign.template.name} · {campaign.template.language} · {campaign.connection.verifiedName || campaign.connection.displayPhoneNumber || "رقم واتساب الرسمي"}</p><p className="mt-2 text-xs text-[#b8d2ce]">{campaign.startedAt ? `بدأت ${formatCampaignTime(campaign.startedAt)}` : `أُنشئت ${formatCampaignTime(campaign.createdAt)}`}</p></div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/20 px-4 py-2 text-sm font-bold">{statusLabel}</span><a href={`/api/dashboard/whatsapp/campaign-export?campaign=${encodeURIComponent(campaign.id)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#8af0dd] px-4 text-sm font-black text-[#06231f]"><Download className="h-4 w-4" />تصدير CSV</a></div></div></header>
    <LiveReportRefresh observedAt={data.observedAt.toISOString()} intervalSeconds={5} />
    <PerformanceMetrics stats={stats} />
    {data.failures.length > 0 ? <section aria-label="أسباب تعثر الحملة" className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><h2 className="text-lg font-black text-rose-800">ما الذي يحتاج إلى إجراء؟</h2>{data.failures.map(failure => { const reason = campaignFailureReason(failure.lastErrorCode); return <div key={failure.lastErrorCode ?? "unknown"} className="mt-3 space-y-2"><b className="text-sm text-rose-800">{reason.title} · {fmt(failure._count._all)} رسالة{failure.lastErrorCode && /^\d+$/.test(failure.lastErrorCode) ? ` · ${failure.lastErrorCode}` : ""}</b><p className="text-sm leading-7 text-rose-800">{reason.detail}</p><p className="text-sm font-bold text-rose-800">{reason.action}</p></div>; })}<Link href="?status=failed#recipients" className="mt-4 inline-flex min-h-11 items-center rounded-xl border border-rose-200 px-4 text-sm font-bold text-rose-800">مراجعة المستلمين المتعثرين</Link></section> : null}
    <section className="grid min-w-0 gap-4 xl:grid-cols-2"><ActivityChart points={points} /><DeliveryDistribution stats={stats} /></section>
    <section aria-label="تفاعل الحملة" className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold text-[#008f87]">بعد الوصول</p><h2 className="mt-1 text-lg font-black text-slate-900">من الرسالة إلى التفاعل</h2></div><div className="grid grid-cols-3 gap-5 sm:gap-10">{[{ label: "نقرات فريدة", value: data.attribution.clicks }, { label: "مستلمون ردوا", value: data.attribution.replies }, { label: "حجوزات منسوبة", value: data.attribution.bookings }].map(item => <div key={item.label}><b className="block text-2xl font-black text-slate-900">{fmt(item.value)}</b><span className="mt-1 block text-xs text-slate-500">{item.label}</span></div>)}</div></div><p className="mt-4 text-xs leading-6 text-slate-500">النقرات عبر روابط INFRO المتتبعة مع استبعاد المعاينات المعروفة. الردود المقتبسة مرتبطة برسالة الحملة، والحجوزات من نفس المتصفح خلال 7 أيام من النقرة. هذه الأرقام لا تعني إيرادًا أو طلبًا مدفوعًا.</p></section>
    <section className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <article id="recipients" className="min-w-0 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-900">حالة كل مستلم</h2><p className="mt-1 text-xs text-slate-500">{fmt(data.total)} نتيجة · 25 مستلمًا في الصفحة</p></div><Search className="h-5 w-5 text-[#008f87]" /></div><form action={`/dashboard/whatsapp/campaigns/${campaign.id}#recipients`} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto]"><input name="q" defaultValue={q} aria-label="البحث في مستلمي الحملة" maxLength={80} placeholder="اسم العميل أو رقم الجوال" className="min-h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900" /><select name="status" defaultValue={status} aria-label="حالة المستلم" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700"><option value="all">كل الحالات</option>{Object.entries(recipientStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="min-h-11 rounded-xl bg-[#008f87] px-4 text-sm font-bold text-white">بحث</button></form>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[520px] text-right text-sm"><thead className="bg-slate-50 text-xs text-slate-600"><tr>{["المستلم", "الحالة", "آخر إيصال", "المحاولات / السبب"].map(label => <th key={label} className="px-3 py-4">{label}</th>)}</tr></thead><tbody>{data.recipients.map(recipient => <tr key={recipient.id} className="border-t border-slate-100"><td className="px-3 py-4"><b className="block text-slate-900">{recipient.displayName || "بدون اسم"}</b><span dir="ltr" className="mt-1 inline-block text-xs text-slate-500">{recipient.phoneE164}</span></td><td className="px-3 py-4"><span className={`inline-block rounded-full px-2.5 py-1.5 text-xs font-bold ${recipient.status === "failed" ? "bg-rose-50 text-rose-800" : ["delivered", "read"].includes(recipient.status) ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}>{recipientStatusLabels[recipient.status] ?? "نتيجة غير مصنفة"}</span></td><td className="px-3 py-4 text-xs leading-6 text-slate-600">{recipient.readAt || recipient.deliveredAt || recipient.failedAt || recipient.sentAt ? formatCampaignTime((recipient.readAt || recipient.deliveredAt || recipient.failedAt || recipient.sentAt)!) : "لم يصل إيصال بعد"}</td><td className="px-3 py-4 text-xs leading-6 text-slate-600">{fmt(recipient.deliveryJob?.attemptCount ?? 0)} محاولة{recipient.deliveryJob?.lastErrorCode && /^\d+$/.test(recipient.deliveryJob.lastErrorCode) ? <span className="block">رمز Meta: {recipient.deliveryJob.lastErrorCode}</span> : null}{recipient.deliveryJob?.status === "retry_scheduled" ? <span className="block">إعادة محاولة: {formatCampaignTime(recipient.deliveryJob.nextAttemptAt)}</span> : null}</td></tr>)}</tbody></table></div>
      {!data.recipients.length ? <p className="p-6 text-center text-sm text-slate-500">لا يوجد مستلمون يطابقون البحث.</p> : null}<nav aria-label="صفحات المستلمين" className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4"><span className="text-xs text-slate-500">صفحة {fmt(data.page)} من {fmt(Math.max(1, Math.ceil(data.total / 25)))}</span><div className="flex gap-2">{data.page > 1 ? <Link href={href(data.page - 1)} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">السابق</Link> : null}{data.page * 25 < data.total ? <Link href={href(data.page + 1)} className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold text-slate-700">التالي</Link> : null}</div></nav></article>
      <aside className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5"><h2 className="flex items-center gap-2 text-base font-black text-slate-900"><MessageCircle className="h-5 w-5 text-[#008f87]" />معاينة قالب الرسالة</h2><p className="mt-2 text-xs leading-6 text-slate-500">{snapshotAvailable ? "القالب المحفوظ عند تثبيت الحملة. تتغير قيم المتغيرات حسب المستلم." : "القالب الحالي؛ لا توجد نسخة محفوظة لمحتوى هذه الحملة القديمة."}</p><div className="mt-4 overflow-hidden rounded-2xl border border-slate-200"><div className="bg-[#075e54] p-4 text-sm font-bold text-white">{campaign.connection.verifiedName || "WhatsApp Business"}</div><div className="bg-slate-50 p-3"><div className="rounded-xl bg-white p-4 text-sm leading-8 text-slate-800">{textParts.length ? textParts.map((part, index) => <p key={index} className={`whitespace-pre-wrap break-words ${part.type === "HEADER" ? "font-bold" : part.type === "FOOTER" ? "text-xs text-slate-500" : ""}`}>{part.text}</p>) : <p>قالب بوسائط أو مكونات غير نصية. راجع تفاصيل القالب.</p>}</div></div></div><Link href="/dashboard/whatsapp/templates" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-[#008f87]">فتح القوالب</Link><p className="mt-2 text-xs leading-6 text-slate-500">المعاينة لا ترسل رسالة. إدارة الإطلاق والإيقاف والجدولة من صفحة الحملات.</p></aside>
    </section>
  </div>;
}
