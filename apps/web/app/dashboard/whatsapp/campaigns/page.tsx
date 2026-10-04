import Link from "next/link";
import { LiveReportRefresh } from "../live-report-refresh";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import {
  Activity,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Eye,
  Megaphone,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  StopCircle,
  UsersRound,
} from "lucide-react";
import { launchWhatsAppCampaignAction } from "../../../actions/whatsapp-campaign-launch";
import { operateWhatsAppCampaignAction } from "../../../actions/whatsapp-marketing";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { db } from "../../../lib/db";
import { getWhatsAppCampaignLaunchReadiness, type WhatsAppCampaignLaunchReadiness } from "../../../lib/whatsapp/campaign-launch-readiness";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { campaignDeliverySummary, formatCampaignTime } from "../../../lib/whatsapp/campaign-presentation";
import { CampaignWizard } from "./campaign-wizard";

const campaignStatusFilters = ["all", "draft", "ready", "scheduled", "running", "paused", "completed", "failed", "cancelled"] as const;
type CampaignStatusFilter = (typeof campaignStatusFilters)[number];

export default async function WhatsAppCampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");

  const params = await searchParams;
  const observedAt = new Date();
  const query = String(params.q ?? "").trim().slice(0, 80);
  const requestedStatus = String(params.status ?? "all") as CampaignStatusFilter;
  const statusFilter: CampaignStatusFilter = campaignStatusFilters.includes(requestedStatus) ? requestedStatus : "all";

  const [connections, templates, segments, campaigns, eligibleAudienceRows, launchReadiness, sampleContacts] = await Promise.all([
    db.whatsAppConnection.findMany({
      where: { businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null, marketingEnabled: true },
      select: { id: true, verifiedName: true, displayPhoneNumber: true },
    }),
    db.whatsAppTemplate.findMany({
      where: { businessId: context.businessId, provider: "meta", status: "approved", category: { in: ["marketing", "utility"] }, connection: { marketingEnabled: true } },
      select: { id: true, connectionId: true, name: true, language: true, category: true, components: true },
      orderBy: { name: "asc" },
    }),
    db.whatsAppSegment.findMany({
      where: { businessId: context.businessId, kind: "static" },
      select: { id: true, name: true, _count: { select: { memberships: true } } },
      orderBy: { name: "asc" },
      take: 100,
    }),
    db.whatsAppCampaign.findMany({
      where: { businessId: context.businessId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        name: true,
        status: true,
        totalRecipients: true,
        scheduledAt: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        template: { select: { name: true, language: true } },
      },
    }),
    db.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      SELECT COUNT(*)::int AS "count"
      FROM "WhatsAppContact" contact
      INNER JOIN "WhatsAppConsent" consent
        ON consent."businessId" = contact."businessId"
        AND consent."phoneE164" = contact."phoneE164"
      WHERE contact."businessId" = ${context.businessId}
        AND contact."optedOutAt" IS NULL
        AND consent."revokedAt" IS NULL
        AND consent."source" <> 'booking'
        AND consent."consentedAt" <= CURRENT_TIMESTAMP
    `),
    getWhatsAppCampaignLaunchReadiness(),
    db.whatsAppContact.findMany({ where: { businessId: context.businessId, optedOutAt: null }, select: { id: true, displayName: true, phoneE164: true, email: true, attributes: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const eligibleAudience = eligibleAudienceRows[0]?.count ?? 0;
  const wizardTemplates = templates.map((template) => ({
    ...template,
    category: templateCategoryLabel(template.category),
    ...templatePreview(template.components),
  }));

  const recipientGroups = campaigns.length
    ? await db.whatsAppCampaignRecipient.groupBy({
      by: ["campaignId", "status"],
      where: { businessId: context.businessId, campaignId: { in: campaigns.map((item) => item.id) } },
      _count: { _all: true },
    })
    : [];
  const recipientCounts = new Map(recipientGroups.map((item) => [`${item.campaignId}:${item.status}`, item._count._all]));
  const deliveryGroups = campaigns.length ? await db.whatsAppDeliveryJob.groupBy({
    by: ["campaignId", "status"],
    where: { businessId: context.businessId, campaignId: { in: campaigns.map((item) => item.id) } },
    _count: { _all: true },
    _min: { nextAttemptAt: true },
  }) : [];
  const deliveryCounts = new Map(deliveryGroups.map((item) => [`${item.campaignId}:${item.status}`, item._count._all]));
  const aggregateRecipientCounts = recipientGroups.reduce<Record<string, number>>((totals, item) => {
    totals[item.status] = (totals[item.status] ?? 0) + item._count._all;
    return totals;
  }, {});
  const aggregateCount = (status: string) => aggregateRecipientCounts[status] ?? 0;
  const aggregateSent = aggregateCount("sent") + aggregateCount("delivered") + aggregateCount("read");
  const aggregateDelivered = aggregateCount("delivered") + aggregateCount("read");
  const aggregateRead = aggregateCount("read");
  const aggregateRecipients = campaigns.reduce((total, campaign) => total + campaign.totalRecipients, 0);
  const activeCampaigns = campaigns.filter((campaign) => ["scheduled", "running", "paused"].includes(campaign.status)).length;
  const deliveryRate = aggregateSent ? aggregateDelivered / aggregateSent : 0;
  const readRate = aggregateDelivered ? aggregateRead / aggregateDelivered : 0;

  const normalizedQuery = query.toLocaleLowerCase("ar");
  const filteredCampaigns = campaigns.filter((campaign) => {
    if (statusFilter !== "all" && campaign.status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    return [campaign.name, campaign.template.name, campaign.template.language]
      .some((value) => value.toLocaleLowerCase("ar").includes(normalizedQuery));
  });

  const operationSucceeded = ["launch", "schedule", "pause", "resume", "cancel", "canary-launched", "canary-awaiting"].includes(params.operation || "");
  const operationMessage = campaignOperationMessage(params.operation, launchReadiness);

  return <div className="min-w-0 space-y-5 pb-5">
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="flex items-center gap-3 text-2xl font-bold text-slate-950"><Megaphone className="h-6 w-6 text-[#008f87]" />حملات واتساب</h1><p className="mt-2 text-sm leading-6 text-slate-600">تابع رسائلك ونتائجها، وأنشئ حملتك بخطوات واضحة.</p></div>
      <Link href="/dashboard/whatsapp/campaigns?new=1#new-campaign" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#008f87] px-5 text-sm font-bold text-white hover:bg-[#006d67] focus-visible:ring-2 focus-visible:ring-[#008f87] focus-visible:ring-offset-2"><Plus className="h-5 w-5" />حملة جديدة</Link>
    </header>
    <LiveReportRefresh observedAt={observedAt.toISOString()} compact />
    <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3" open={!launchReadiness.ready}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 text-sm font-bold text-slate-800"><Activity className={`h-4 w-4 ${launchReadiness.ready ? "text-emerald-600" : "text-amber-600"}`} />{launchReadiness.ready ? "خدمة الإرسال جاهزة" : "الإرسال متوقف مؤقتًا للحماية"}<span className="mr-auto text-sm font-normal text-slate-500">تفاصيل التشغيل</span></summary>
      <p className="mt-3 text-sm leading-7 text-slate-600">{launchReadiness.ready ? `آخر تشغيل ناجح: ${formatCampaignTime(launchReadiness.lastSucceededAt)}. جاهزية الخدمة لا تعني إرسال رسائل الحملة؛ تابع حالة كل حملة أدناه.` : `${readinessLabel(launchReadiness)}. يمكنك تجهيز الحملة الآن، ويعود الإطلاق عند اكتمال الجاهزية.`}</p>
    </details>

    <p className="text-sm leading-6 text-slate-600">يُعاد فحص موافقة المستلم وإلغاء الاشتراك قبل كل رسالة. أول إرسال تجريبي لا يتجاوز 5 مستلمين حتى تأكيد التسليم.</p>
    {params.create || params.operation ? <p aria-live="polite" className={`rounded-2xl border p-3 text-sm font-bold ${(params.create === "complete" || operationSucceeded) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{params.create === "complete" ? "أُنشئت الحملة وثُبتت قائمة المستلمين المؤهلين. راجع العدد والبيانات قبل الإطلاق." : params.create ? campaignErrorMessage(params.reason) : operationMessage}</p> : null}

    <section aria-label="مؤشرات أداء الحملات" className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-6">
      <Kpi icon={<Megaphone className="h-4 w-4" />} label="الحملات" value={String(campaigns.length)} helper="أحدث 100 حملة" />
      <Kpi icon={<Activity className="h-4 w-4" />} label="قيد التشغيل" value={String(activeCampaigns)} helper="مجدولة أو جارية أو متوقفة" />
      <Kpi icon={<UsersRound className="h-4 w-4" />} label="المستلمون" value={formatNumber(aggregateRecipients)} helper="في قوائم الحملات" />
      <Kpi icon={<Send className="h-4 w-4" />} label="تم الإرسال" value={formatNumber(aggregateSent)} helper="قبلتها Meta؛ راقب تأكيد التسليم" />
      <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="معدل التسليم" value={formatRate(deliveryRate)} helper={`${formatNumber(aggregateDelivered)} تم تسليمهم`} />
      <Kpi icon={<Eye className="h-4 w-4" />} label="معدل القراءة" value={formatRate(readRate)} helper={`${formatNumber(aggregateRead)} قراءة مؤكدة`} />
    </section>

    <section aria-labelledby="campaign-list-title" className="space-y-3">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 id="campaign-list-title" className="mt-1 text-lg font-black text-slate-900">حملاتك</h2>
            <p className="mt-1 text-sm leading-5 text-slate-500">ابحث بالاسم أو القالب وصفِّ أحدث 100 حملة. النتائج لا تغيّر بيانات الحملة أو جمهورها المثبت.</p>
          </div>
          <form method="get" action="/dashboard/whatsapp/campaigns" className="grid min-w-0 gap-2 sm:grid-cols-[minmax(180px,1fr)_170px_auto] lg:w-[620px]">
            <label className="relative min-w-0"><span className="sr-only">البحث في الحملات</span><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input name="q" defaultValue={query} maxLength={80} placeholder="ابحث باسم الحملة أو القالب" className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-sm text-slate-900 outline-none transition focus:border-[#00bfae] focus:ring-4 focus:ring-[#00bfae]/10" /></label>
            <label><span className="sr-only">حالة الحملة</span><select name="status" defaultValue={statusFilter} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-[#00bfae] focus:ring-4 focus:ring-[#00bfae]/10">{campaignStatusFilters.map((status) => <option key={status} value={status}>{campaignFilterLabel(status)}</option>)}</select></label>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#07181b] px-4 text-sm font-black text-white transition hover:bg-[#0d292d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2"><Search className="h-3.5 w-3.5" />تطبيق</button>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500"><span>النتائج: <b className="text-slate-900">{filteredCampaigns.length}</b> من {campaigns.length}</span>{query || statusFilter !== "all" ? <Link href="/dashboard/whatsapp/campaigns" className="font-black text-[#008f87] hover:underline">مسح البحث والتصفية</Link> : null}</div>
      </div>

      {filteredCampaigns.map((campaign) => {
        const count = (status: string) => recipientCounts.get(`${campaign.id}:${status}`) ?? 0;
        const sent = count("sent") + count("delivered") + count("read");
        const delivered = count("delivered") + count("read");
        const read = count("read");
        const failed = count("failed");
        const retrying = deliveryCounts.get(`${campaign.id}:retry_scheduled`) ?? 0;
        const unknown = deliveryCounts.get(`${campaign.id}:delivery_unknown`) ?? 0;
        const queued = deliveryCounts.get(`${campaign.id}:queued`) ?? 0;
        const processing = deliveryCounts.get(`${campaign.id}:processing`) ?? 0;
        const snapshot = count("snapshotted");
        const summary = campaignDeliverySummary({ status: campaign.status, queued, processing, retrying, unknown, sent, delivered, snapshot, ready: launchReadiness.ready });
        const nextAttempt = deliveryGroups.filter((item) => item.campaignId === campaign.id && ["queued", "retry_scheduled"].includes(item.status)).flatMap((item) => item._min.nextAttemptAt ? [item._min.nextAttemptAt] : []).sort((a, b) => a.getTime() - b.getTime())[0];
        const sentProgress = campaign.totalRecipients ? sent / campaign.totalRecipients : 0;
        return <article key={campaign.id} id={`campaign-${campaign.id}`} data-testid="campaign-card" className="scroll-mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(7,24,27,.035)]">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><b className="break-words text-sm text-slate-900 sm:text-base">{campaign.name}</b><span className={`rounded-full px-2.5 py-1 text-sm font-black ${campaignStatusClasses(campaign.status)}`}>{campaignStatusLabel(campaign.status)}</span></div>
                <span className="mt-1.5 block break-words text-sm text-slate-500">{campaign.template.name} · {campaign.template.language}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-sm text-slate-500"><CalendarClock className="h-3 w-3" />{campaignTimingLabel(campaign)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {campaign.status === "ready" ? <><CampaignButton id={campaign.id} operation="launch" label="بدء الإرسال" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /><form action={operateWhatsAppCampaignAction} className="flex min-w-0 flex-wrap gap-1"><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="operation" value="schedule" /><input name="scheduledAt" type="datetime-local" required className="min-h-11 min-w-0 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-[#00bfae]" /><button className="rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-600 hover:border-[#9fe8df] hover:text-[#008f87]">جدولة</button></form></> : null}
                {campaign.status === "running" ? <CampaignButton id={campaign.id} operation="pause" label="إيقاف مؤقت" icon={<Pause className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}
                {campaign.status === "paused" ? <CampaignButton id={campaign.id} operation="resume" label="استئناف" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}
                {!["completed", "cancelled", "failed"].includes(campaign.status) ? <CampaignButton id={campaign.id} operation="cancel" label="إلغاء" icon={<StopCircle className="h-3.5 w-3.5" />} danger launchReady={launchReadiness.ready} /> : null}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4" role="status"><b className="block text-sm text-slate-900">{summary.title}</b><p className="mt-1 text-sm leading-7 text-slate-600">{summary.detail}</p>{nextAttempt && nextAttempt.getTime() > observedAt.getTime() ? <p className="mt-1 text-sm text-slate-600">أقرب وقت مسموح للمحاولة: {formatCampaignTime(nextAttempt)}؛ ليس موعد تسليم مضمونًا.</p> : null}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Mini label="بانتظار الإرسال" value={queued} />
              <Mini label="تجري معالجتها" value={processing} />

              <Mini label="تم الإرسال" value={sent} />
              <Mini label="تم التسليم" value={delivered} />
              <Mini label="تمت القراءة" value={read} />
              <Mini label="تعذر الإرسال" value={failed} />


            </div>
            <details className="mt-3 text-sm text-slate-600"><summary className="cursor-pointer py-2 font-bold">تفاصيل الجمهور والمحاولات</summary><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"><Mini label="المستلمون" value={campaign.totalRecipients} /><Mini label="لم تدخل الطابور" value={snapshot} /><Mini label="مستبعدون" value={count("skipped_opt_out")} /><Mini label="بانتظار إعادة المحاولة" value={retrying} /><Mini label="نتيجة غير مؤكدة" value={unknown} /></div></details>
            {retrying > 0 || unknown > 0 ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">{retrying > 0 ? "تُعاد المحاولات المؤقتة تلقائيًا وفق مهلة الانتظار وحدود الإرسال. " : ""}{unknown > 0 ? "بعض الطلبات انقطع اتصالها قبل تأكيد النتيجة. لا تعِد إرسال الحملة لهذه الأرقام حتى تُراجع حالتها، لتجنب التكرار." : ""}</p> : null}
          </div>
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600"><span>{formatNumber(campaign.totalRecipients)} مستلم · النتائج بحسب إيصالات Meta</span><a href={`/api/dashboard/whatsapp/campaign-export?campaign=${encodeURIComponent(campaign.id)}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-3 font-bold text-[#008f87]">تنزيل تقرير المستلمين CSV</a></div>
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500"><span>نسبة المستلمين الذين قُبل إرسال رسائلهم</span><b className="text-slate-700">{formatRate(sentProgress)}</b></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#00bfae] transition-[width] motion-reduce:transition-none" style={{ width: `${Math.round(Math.min(1, Math.max(0, sentProgress)) * 100)}%` }} /></div>
          </div>
        </article>;
      })}

      {!campaigns.length ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-10 text-center"><BarChart3 className="mx-auto mb-3 h-7 w-7 text-slate-300" /><b className="block text-sm text-slate-900">لا توجد حملات بعد</b><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">ابدأ بربط رقم واتساب رسمي ومزامنة قالب معتمد وإضافة جهات اتصال بموافقة صريحة، ثم أنشئ حملتك الأولى من قسم إنشاء حملة جديدة.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Link href="/dashboard/whatsapp/setup" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-[#008f87]">ربط واتساب</Link><Link href="/dashboard/whatsapp/contacts" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-[#008f87]">جهات الاتصال</Link><Link href="/dashboard/whatsapp/templates" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-black text-[#008f87]">القوالب</Link></div></div> : null}
      {campaigns.length > 0 && !filteredCampaigns.length ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-9 text-center"><Search className="mx-auto mb-3 h-6 w-6 text-slate-300" /><b className="block text-sm text-slate-900">لا توجد حملات مطابقة</b><p className="mt-2 text-sm text-slate-500">غيّر عبارة البحث أو حالة الحملة لعرض نتائج أخرى.</p><Link href="/dashboard/whatsapp/campaigns" className="mt-4 inline-flex rounded-xl bg-[#e9fbf8] px-4 py-2 text-sm font-black text-[#008f87]">عرض كل الحملات</Link></div> : null}
    </section>
    <details id="new-campaign" open={params.new === "1" || !campaigns.length} className="scroll-mt-6 rounded-2xl border border-slate-200 bg-white">
      <summary className="cursor-pointer px-5 py-4 text-base font-bold text-slate-900">إنشاء حملة جديدة <span className="mr-2 text-sm font-normal text-slate-500">الرقم، الجمهور، الرسالة والمراجعة</span></summary>
      <div className="border-t border-slate-100 p-3 sm:p-5"><div>{connections.length && templates.length && eligibleAudience ? <CampaignWizard sampleContacts={sampleContacts} connections={connections.map((item) => ({ id: item.id, label: item.verifiedName || item.displayPhoneNumber || "رقم واتساب متصل" }))} templates={wizardTemplates} segments={segments.map((segment) => ({ id: segment.id, name: segment.name, members: segment._count.memberships }))} eligibleContacts={eligibleAudience} /> : <CampaignReadiness connections={connections.length} templates={templates.length} eligibleContacts={eligibleAudience} />}</div></div>
    </details>
  </div>;
}

function Kpi({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return <article className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-3 sm:p-4"><div className="flex items-center gap-2 text-[#008f87]">{icon}<span className="text-sm font-bold text-slate-500">{label}</span></div><b className="mt-2 block break-words text-xl font-black text-slate-900">{value}</b><span className="mt-1 block text-sm leading-4 text-slate-500">{helper}</span></article>;
}

function CampaignReadiness({ connections, templates, eligibleContacts }: { connections: number; templates: number; eligibleContacts: number }) {
  const checks = [
    { ready: connections > 0, label: "رقم WhatsApp Business متصل", href: "/dashboard/whatsapp/setup" },
    { ready: templates > 0, label: "قالب Meta معتمد ومتزامن", href: "/dashboard/whatsapp/templates" },
    { ready: eligibleContacts > 0, label: "جهات اتصال بموافقة فعالة", href: "/dashboard/whatsapp/contacts" },
  ];
  return <div className="rounded-[26px] border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">أكمل جاهزية الحملة</h2><p className="mt-2 text-sm leading-6 text-slate-500">سيظهر معالج الإنشاء فور اكتمال المتطلبات الثلاثة.</p><div className="mt-4 space-y-2">{checks.map((check) => <Link key={check.label} href={check.href} className={`flex items-center justify-between rounded-xl border p-3 text-sm font-black ${check.ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span>{check.ready ? "✓" : "○"} {check.label}</span><span>{check.ready ? "مكتمل" : "إكمال ←"}</span></Link>)}</div></div>;
}

function templatePreview(value: Prisma.JsonValue) {
  const components = Array.isArray(value) ? value.filter((item): item is Prisma.JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
  const findText = (type: string) => {
    const component = components.find((item) => String(item.type ?? "").toUpperCase() === type);
    return typeof component?.text === "string" ? component.text : null;
  };
  const buttonComponent = components.find((item) => String(item.type ?? "").toUpperCase() === "BUTTONS");
  const buttons = Array.isArray(buttonComponent?.buttons) ? buttonComponent.buttons.flatMap((item) => item && typeof item === "object" && !Array.isArray(item) && typeof item.text === "string" ? [item.text] : []).slice(0, 3) : [];
  return { header: findText("HEADER"), body: findText("BODY"), footer: findText("FOOTER"), buttons };
}

function campaignErrorMessage(reason?: string) {
  if (reason === "WHATSAPP_CAMPAIGN_VARIABLE_MISSING") return "هناك مستلم تنقصه قيمة مطلوبة. أضف قيمة بديلة للمتغير أو استكمل بيانات الجمهور ثم أعد الإنشاء.";
  if (reason === "WHATSAPP_CAMPAIGN_MEDIA_INVALID") return "أضف رابط HTTPS مباشرًا لوسائط رأس القالب.";
  if (reason === "WHATSAPP_CAMPAIGN_TRACKING_INVALID") return "تتبع النقرات يتطلب زر INFRO الديناميكي المخصص للتتبع ووجهة HTTPS صحيحة.";
  if (reason === "WHATSAPP_CAMPAIGN_TEMPLATE_UNSUPPORTED") return "هذا النوع المتقدم من القوالب غير مدعوم في محرر الحملات الحالي.";
  if (reason === "WHATSAPP_CAMPAIGN_SEND_POLICY_INVALID" || reason === "WHATSAPP_CAMPAIGN_COMPOSITION_INVALID") return "راجع إعدادات أوقات الإرسال والمتغيرات قبل إنشاء الحملة.";
  if (reason === "WHATSAPP_CAMPAIGN_NO_ELIGIBLE_RECIPIENTS") return "لا يوجد مستلمون مؤهلون بعد فحص الموافقات والانسحابات.";
  if (reason === "WHATSAPP_CAMPAIGN_AUDIENCE_TOO_LARGE") return "الجمهور أكبر من الحد الآمن للحملة الواحدة (10,000 مستلم).";
  if (reason === "WHATSAPP_CAMPAIGN_STATIC_SEGMENT_NOT_FOUND") return "الشريحة المحددة لم تعد متاحة لهذا النشاط.";
  if (reason === "WHATSAPP_CAMPAIGN_CONFIGURATION_INVALID") return "الرقم أو القالب لم يعد صالحًا؛ حدّث الصفحة وأعد الاختيار.";
  if (reason === "invalid") return "أكمل بيانات الحملة واختر الجمهور والقالب قبل المتابعة.";
  return "تعذر إنشاء الحملة؛ تحقق من الاتصال والقالب والموافقات ثم حاول مرة أخرى.";
}

function campaignStatusLabel(status: string) {
  const labels: Record<string, string> = { draft: "مسودة", ready: "جاهزة", scheduled: "مجدولة", running: "قيد الإرسال", paused: "متوقفة مؤقتًا", completed: "مكتملة", cancelled: "ملغاة", failed: "تعذر إكمالها" };
  return labels[status] ?? "قيد المعالجة";
}

function campaignStatusClasses(status: string) {
  if (status === "completed") return "bg-emerald-50 text-emerald-700";
  if (status === "running") return "bg-sky-50 text-sky-700";
  if (status === "scheduled") return "bg-indigo-50 text-indigo-700";
  if (status === "paused") return "bg-amber-50 text-amber-700";
  if (["failed", "cancelled"].includes(status)) return "bg-rose-50 text-rose-700";
  return "bg-[#e9fbf8] text-[#008f87]";
}

function campaignFilterLabel(status: CampaignStatusFilter) {
  const labels: Record<CampaignStatusFilter, string> = { all: "كل الحالات", draft: "مسودة", ready: "جاهزة", scheduled: "مجدولة", running: "قيد الإرسال", paused: "متوقفة مؤقتًا", completed: "مكتملة", failed: "متعذرة", cancelled: "ملغاة" };
  return labels[status];
}

function campaignTimingLabel(campaign: { createdAt: Date; scheduledAt: Date | null; startedAt: Date | null; completedAt: Date | null }) {
  if (campaign.completedAt) return `اكتملت ${formatCampaignTime(campaign.completedAt)}`;
  if (campaign.startedAt) return `بدأت ${formatCampaignTime(campaign.startedAt)}`;
  if (campaign.scheduledAt) return `مجدولة ${formatCampaignTime(campaign.scheduledAt)}`;
  return `أُنشئت ${formatCampaignTime(campaign.createdAt)}`;
}

function templateCategoryLabel(category: string) {
  const labels: Record<string, string> = { marketing: "تسويقي", utility: "خدمي", authentication: "مصادقة", MARKETING: "تسويقي", UTILITY: "خدمي", AUTHENTICATION: "مصادقة" };
  return labels[category] ?? "معتمد";
}

function campaignOperationMessage(operation: string | undefined, readiness: WhatsAppCampaignLaunchReadiness) {
  if (operation === "worker-unavailable") return `الإرسال متوقف بأمان: ${readinessLabel(readiness)}. لم تتم إضافة أي رسائل جديدة للإرسال.`;
  if (operation === "canary-launched") return "أُضيفت الدفعة التجريبية إلى طابور الإرسال بحد أقصى 5 مستلمين. سننتظر تأكيد التسليم أو القراءة من Meta قبل توسيع الإرسال.";
  if (operation === "canary-awaiting") return "تم استخدام الحد التجريبي الآمن، وننتظر الآن تأكيد التسليم من Meta. لم تتم إضافة رسائل جديدة.";
  if (operation === "connection-not-ready") return "تعذر بدء الإرسال: رقم WhatsApp الرسمي لم يعد متصلًا. لم تُرسل أي رسالة جديدة.";
  if (operation === "template-not-approved") return "تعذر بدء الإرسال: القالب لم يعد معتمدًا لدى Meta. زامن القوالب ثم حاول مجددًا.";
  if (operation === "empty-snapshot") return "تعذر بدء الإرسال: لا توجد جهات اتصال مؤهلة في هذه الحملة. أنشئ حملة جديدة بعد مراجعة الموافقات.";
  if (operation === "not-due") return "هذه الحملة مجدولة لوقت لاحق ولم يحن وقتها بعد.";
  if (operation === "not-queueable") return "حالة الحملة الحالية لا تسمح بإضافة مستلمين جدد للإرسال.";
  if (operation === "not-found") return "تعذر العثور على الحملة ضمن نشاطك الحالي.";
  if (operation === "schedule") return "تمت جدولة الحملة بنجاح.";
  if (operation === "pause") return "تم إيقاف الحملة مؤقتًا.";
  if (operation === "resume") return "تم استئناف الحملة.";
  if (operation === "cancel") return "تم إلغاء الحملة.";
  if (operation === "launch") return "أُضيفت الرسائل إلى طابور الإرسال. تابع تأكيد الإرسال والتسليم في بطاقة الحملة.";
  return "تعذرت العملية؛ تحقق من الاتصال والقالب والموافقات وحالة الحملة.";
}

function readinessLabel(readiness: WhatsAppCampaignLaunchReadiness) {
  if (readiness.ready) return "خدمة الإرسال جاهزة";
  if (readiness.code === "outbound_disabled") return "إرسال واتساب معطل في إعدادات المنصة ويحتاج تفعيلًا من الإدارة";
  if (readiness.code === "worker_outbound_unverified") return "لم يثبت نجاح عامل إرسال واتساب؛ نجاح مزامنة المتاجر وحده لا يكفي لإطلاق الحملة";
  if (readiness.code === "web_release_unavailable") return "تعذر التحقق من إصدار المنصة الحالي";
  if (readiness.code === "worker_release_mismatch") return "خدمة الإرسال تحتاج إلى التحديث لتطابق إصدار المنصة";
  if (readiness.code === "worker_not_started") return "خدمة الإرسال لم تسجل تشغيلًا ناجحًا بعد";
  if (readiness.code === "worker_failed") return "آخر دورة تشغيل لخدمة الإرسال لم تكتمل بنجاح";
  if (readiness.code === "worker_stale") return "آخر تحقق ناجح لخدمة الإرسال قديم ويحتاج إلى تجديد";
  return "تعذر التحقق من الحالة التشغيلية لخدمة الإرسال";
}

function CampaignButton({ id, operation, label, icon, danger = false, launchReady }: { id: string; operation: string; label: string; icon: React.ReactNode; danger?: boolean; launchReady: boolean }) {
  const classes = `inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-[#e9fbf8] text-[#008f87] hover:bg-[#d8f7f2]"}`;
  if (operation === "launch") return <form action={launchWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><ConfirmSubmitButton label={label} showIcon={false} disabled={!launchReady} className={classes} confirmMessage="سيبدأ الإرسال الرسمي وقد تترتب رسوم من Meta. هل تؤكد أن جميع المستلمين وافقوا صراحة على استلام الرسائل؟" /></form>;
  return <form action={operateWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><input type="hidden" name="operation" value={operation} /><button className={classes}>{icon}{label}</button></form>;
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center"><span className="block text-sm text-slate-500">{label}</span><b className="text-sm text-slate-900">{value}</b></div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat("ar-SA", { style: "percent", maximumFractionDigits: 1 }).format(Math.min(1, Math.max(0, value)));
}
