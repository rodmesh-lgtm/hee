import Link from "next/link";
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
  Search,
  Send,
  StopCircle,
  UsersRound,
  XCircle,
} from "lucide-react";
import { launchWhatsAppCampaignAction } from "../../../actions/whatsapp-campaign-launch";
import { operateWhatsAppCampaignAction } from "../../../actions/whatsapp-marketing";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { db } from "../../../lib/db";
import { getWhatsAppCampaignLaunchReadiness, type WhatsAppCampaignLaunchReadiness } from "../../../lib/whatsapp/campaign-launch-readiness";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { CampaignWizard } from "./campaign-wizard";

const campaignStatusFilters = ["all", "ready", "scheduled", "running", "paused", "completed", "failed", "cancelled"] as const;
type CampaignStatusFilter = (typeof campaignStatusFilters)[number];

export default async function WhatsAppCampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");

  const params = await searchParams;
  const query = String(params.q ?? "").trim().slice(0, 80);
  const requestedStatus = String(params.status ?? "all") as CampaignStatusFilter;
  const statusFilter: CampaignStatusFilter = campaignStatusFilters.includes(requestedStatus) ? requestedStatus : "all";

  const [connections, templates, segments, campaigns, eligibleAudienceRows, launchReadiness] = await Promise.all([
    db.whatsAppConnection.findMany({
      where: { businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null },
      select: { id: true, verifiedName: true, displayPhoneNumber: true },
    }),
    db.whatsAppTemplate.findMany({
      where: { businessId: context.businessId, provider: "meta", status: "approved" },
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
        AND consent."consentedAt" <= CURRENT_TIMESTAMP
    `),
    getWhatsAppCampaignLaunchReadiness(),
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
  const aggregateRecipientCounts = recipientGroups.reduce<Record<string, number>>((totals, item) => {
    totals[item.status] = (totals[item.status] ?? 0) + item._count._all;
    return totals;
  }, {});
  const aggregateCount = (status: string) => aggregateRecipientCounts[status] ?? 0;
  const aggregateSent = aggregateCount("sent") + aggregateCount("delivered") + aggregateCount("read");
  const aggregateDelivered = aggregateCount("delivered") + aggregateCount("read");
  const aggregateRead = aggregateCount("read");
  const aggregateFailed = aggregateCount("failed");
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
    <header className="relative overflow-hidden rounded-[30px] bg-[#07181b] p-5 text-white shadow-[0_30px_80px_-50px_rgba(3,23,25,.85)] sm:p-7">
      <div className="absolute -left-12 -top-16 h-52 w-52 rounded-full bg-[#00d8c6]/20 blur-3xl" />
      <div className="absolute -bottom-24 right-1/3 h-52 w-52 rounded-full bg-[#118cff]/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <span className="text-[9px] font-black tracking-[.16em] text-[#6eead8]" dir="ltr">CAMPAIGN OPERATIONS</span>
          <div className="mt-3 flex items-center gap-2"><Megaphone className="h-5 w-5 text-[#35e4cb]" /><h1 className="text-2xl font-black">مركز عمليات الحملات</h1></div>
          <p className="mt-3 max-w-3xl text-xs leading-7 text-slate-300">أنشئ الحملة، ثبّت الجمهور المؤهل، راقب الأداء، وتحكم في الإرسال والجدولة من مساحة تشغيل واحدة دون تجاوز ضوابط Meta أو الموافقة.</p>
        </div>
        <div className={`min-w-[190px] rounded-2xl border px-4 py-3 ${launchReadiness.ready ? "border-emerald-400/20 bg-emerald-400/10" : "border-amber-300/20 bg-amber-300/10"}`}>
          <span className="block text-[9px] text-slate-400">DELIVERY READINESS</span>
          <b className={`mt-1 block text-sm ${launchReadiness.ready ? "text-emerald-200" : "text-amber-200"}`}>{launchReadiness.ready ? "جاهز للإرسال" : "الإطلاق محمي"}</b>
          <span className="mt-1 block text-[9px] leading-5 text-slate-400">{readinessLabel(launchReadiness)}</span>
        </div>
      </div>
    </header>

    <section className={`rounded-[22px] border p-4 ${launchReadiness.ready ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"}`}>
      <div className="flex items-start gap-3"><Activity className={`mt-0.5 h-5 w-5 shrink-0 ${launchReadiness.ready ? "text-emerald-600" : "text-amber-600"}`} /><div><b className="text-sm text-slate-900">{launchReadiness.ready ? "الإرسال جاهز" : "الإرسال متوقف مؤقتًا للحماية"}</b><p className="mt-1 text-xs leading-6 text-slate-600">{launchReadiness.ready ? `آخر تحقق تشغيلي ناجح: ${launchReadiness.lastSucceededAt.toLocaleString("ar-SA")}. قبل الإرسال سيعاد التحقق من الموافقة، وإلغاء الاشتراك، والاتصال، واعتماد القالب لكل مستلم.` : `${readinessLabel(launchReadiness)}. يمكنك تجهيز الحملة ومراجعتها الآن، وسيظل الإطلاق متوقفًا حتى تعود حالة التشغيل إلى الوضع السليم.`}</p></div></div>
    </section>

    {params.create || params.operation ? <p aria-live="polite" className={`rounded-2xl border p-3 text-xs font-bold ${(params.create === "complete" || operationSucceeded) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>{params.create === "complete" ? "أُنشئت الحملة وثُبتت قائمة المستلمين المؤهلين. راجع العدد والبيانات قبل الإطلاق." : params.create ? campaignErrorMessage(params.reason) : operationMessage}</p> : null}

    <section aria-label="مؤشرات أداء الحملات" className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-6">
      <Kpi icon={<Megaphone className="h-4 w-4" />} label="الحملات" value={String(campaigns.length)} helper="أحدث 100 حملة" />
      <Kpi icon={<Activity className="h-4 w-4" />} label="قيد التشغيل" value={String(activeCampaigns)} helper="مجدولة أو جارية أو متوقفة" />
      <Kpi icon={<UsersRound className="h-4 w-4" />} label="المستلمون" value={formatNumber(aggregateRecipients)} helper="داخل Snapshots الحالية" />
      <Kpi icon={<Send className="h-4 w-4" />} label="تم الإرسال" value={formatNumber(aggregateSent)} helper="إرسال مؤكد من المنصة" />
      <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="معدل التسليم" value={formatRate(deliveryRate)} helper={`${formatNumber(aggregateDelivered)} تم تسليمهم`} />
      <Kpi icon={<Eye className="h-4 w-4" />} label="معدل القراءة" value={formatRate(readRate)} helper={`${formatNumber(aggregateRead)} قراءة مؤكدة`} />
    </section>

    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,.85fr)]">
      <div>{connections.length && templates.length && eligibleAudience ? <CampaignWizard connections={connections.map((item) => ({ id: item.id, label: item.verifiedName || item.displayPhoneNumber || "رقم واتساب متصل" }))} templates={wizardTemplates} segments={segments.map((segment) => ({ id: segment.id, name: segment.name, members: segment._count.memberships }))} eligibleContacts={eligibleAudience} /> : <CampaignReadiness connections={connections.length} templates={templates.length} eligibleContacts={eligibleAudience} />}</div>
      <aside className="rounded-[26px] border border-[#bdebe5] bg-[#effcf9] p-5 text-xs leading-7 text-slate-700"><span className="text-[9px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">SAFE LAUNCH</span><b className="mt-2 block text-sm text-slate-900">مرحلة إرسال تجريبية آمنة</b><p className="mt-2">قبل بدء الحملة نتأكد من جاهزية خدمة الإرسال، واستمرار اتصال الرقم واعتماد القالب وصلاحية قائمة المستلمين والموافقات. وقد تترتب رسوم فعلية من Meta عند إرسال الرسائل.</p><p className="mt-2 font-bold text-slate-900">في أول تشغيل فعلي نبدأ بحد أقصى 5 مستلمين. بعد وصول تأكيد تسليم أو قراءة من Meta تصبح الحملات التالية مؤهلة للإرسال المعتاد.</p></aside>
    </section>

    <section aria-labelledby="campaign-list-title" className="space-y-3">
      <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="text-[9px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">CAMPAIGN CONTROL</span>
            <h2 id="campaign-list-title" className="mt-1 text-lg font-black text-slate-900">سجل الحملات والتحكم</h2>
            <p className="mt-1 text-[10px] leading-5 text-slate-500">ابحث بالاسم أو القالب وصفِّ أحدث 100 حملة. النتائج لا تغيّر بيانات الحملة أو جمهورها المثبت.</p>
          </div>
          <form method="get" action="/dashboard/whatsapp/campaigns" className="grid min-w-0 gap-2 sm:grid-cols-[minmax(180px,1fr)_170px_auto] lg:w-[620px]">
            <label className="relative min-w-0"><span className="sr-only">البحث في الحملات</span><Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={query} maxLength={80} placeholder="ابحث باسم الحملة أو القالب" className="h-11 w-full rounded-xl border border-slate-200 bg-white pr-9 pl-3 text-xs text-slate-900 outline-none transition focus:border-[#00bfae] focus:ring-4 focus:ring-[#00bfae]/10" /></label>
            <label><span className="sr-only">حالة الحملة</span><select name="status" defaultValue={statusFilter} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#00bfae] focus:ring-4 focus:ring-[#00bfae]/10">{campaignStatusFilters.map((status) => <option key={status} value={status}>{campaignFilterLabel(status)}</option>)}</select></label>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white transition hover:bg-[#0d292d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2"><Search className="h-3.5 w-3.5" />تطبيق</button>
          </form>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-[10px] text-slate-500"><span>النتائج: <b className="text-slate-900">{filteredCampaigns.length}</b> من {campaigns.length}</span>{query || statusFilter !== "all" ? <Link href="/dashboard/whatsapp/campaigns" className="font-black text-[#008f87] hover:underline">مسح البحث والتصفية</Link> : null}</div>
      </div>

      {filteredCampaigns.map((campaign) => {
        const count = (status: string) => recipientCounts.get(`${campaign.id}:${status}`) ?? 0;
        const sent = count("sent") + count("delivered") + count("read");
        const delivered = count("delivered") + count("read");
        const read = count("read");
        const failed = count("failed");
        const sentProgress = campaign.totalRecipients ? sent / campaign.totalRecipients : 0;
        return <article key={campaign.id} className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_8px_28px_rgba(7,24,27,.035)]">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><b className="break-words text-sm text-slate-900 sm:text-base">{campaign.name}</b><span className={`rounded-full px-2.5 py-1 text-[9px] font-black ${campaignStatusClasses(campaign.status)}`}>{campaignStatusLabel(campaign.status)}</span></div>
                <span className="mt-1.5 block break-words text-[10px] text-slate-400">{campaign.template.name} · {campaign.template.language}</span>
                <span className="mt-1 inline-flex items-center gap-1 text-[9px] text-slate-400"><CalendarClock className="h-3 w-3" />{campaignTimingLabel(campaign)}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {campaign.status === "ready" ? <><CampaignButton id={campaign.id} operation="launch" label="بدء الإرسال" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /><form action={operateWhatsAppCampaignAction} className="flex min-w-0 flex-wrap gap-1"><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="operation" value="schedule" /><input name="scheduledAt" type="datetime-local" required className="h-9 min-w-0 rounded-lg border border-slate-200 px-2 text-[10px] outline-none focus:border-[#00bfae]" /><button className="rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-600 hover:border-[#9fe8df] hover:text-[#008f87]">جدولة</button></form></> : null}
                {campaign.status === "running" ? <CampaignButton id={campaign.id} operation="pause" label="إيقاف مؤقت" icon={<Pause className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}
                {campaign.status === "paused" ? <CampaignButton id={campaign.id} operation="resume" label="استئناف" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}
                {!["completed", "cancelled", "failed"].includes(campaign.status) ? <CampaignButton id={campaign.id} operation="cancel" label="إلغاء" icon={<StopCircle className="h-3.5 w-3.5" />} danger launchReady={launchReadiness.ready} /> : null}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
              <Mini label="المستلمون" value={campaign.totalRecipients} />
              <Mini label="تم الإرسال" value={sent} />
              <Mini label="تم التسليم" value={delivered} />
              <Mini label="تمت القراءة" value={read} />
              <Mini label="تعذر الإرسال" value={failed} />
              <Mini label="مستبعدون" value={count("skipped_opt_out")} />
            </div>
          </div>
          <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3 text-[9px] text-slate-500"><span>تقدم المعالجة</span><b className="text-slate-700">{formatRate(sentProgress)}</b></div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-[#00bfae] transition-[width] motion-reduce:transition-none" style={{ width: `${Math.round(Math.min(1, Math.max(0, sentProgress)) * 100)}%` }} /></div>
          </div>
        </article>;
      })}

      {!campaigns.length ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-10 text-center"><BarChart3 className="mx-auto mb-3 h-7 w-7 text-slate-300" /><b className="block text-sm text-slate-900">لا توجد حملات بعد</b><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">ابدأ بربط رقم واتساب رسمي ومزامنة قالب معتمد وإضافة جهات اتصال بموافقة صريحة، ثم أنشئ حملتك الأولى من النموذج أعلاه.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Link href="/dashboard/whatsapp/setup" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-[#008f87]">ربط واتساب</Link><Link href="/dashboard/whatsapp/contacts" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-[#008f87]">جهات الاتصال</Link><Link href="/dashboard/whatsapp/templates" className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-[#008f87]">القوالب</Link></div></div> : null}
      {campaigns.length > 0 && !filteredCampaigns.length ? <div className="rounded-[24px] border border-dashed border-slate-200 bg-white p-9 text-center"><Search className="mx-auto mb-3 h-6 w-6 text-slate-300" /><b className="block text-sm text-slate-900">لا توجد حملات مطابقة</b><p className="mt-2 text-xs text-slate-500">غيّر عبارة البحث أو حالة الحملة لعرض نتائج أخرى.</p><Link href="/dashboard/whatsapp/campaigns" className="mt-4 inline-flex rounded-xl bg-[#e9fbf8] px-4 py-2 text-xs font-black text-[#008f87]">عرض كل الحملات</Link></div> : null}
    </section>
  </div>;
}

function Kpi({ icon, label, value, helper }: { icon: React.ReactNode; label: string; value: string; helper: string }) {
  return <article className="min-w-0 rounded-[20px] border border-slate-200 bg-white p-3 sm:p-4"><div className="flex items-center gap-2 text-[#008f87]">{icon}<span className="text-[9px] font-bold text-slate-400">{label}</span></div><b className="mt-2 block break-words text-xl font-black text-slate-900">{value}</b><span className="mt-1 block text-[8px] leading-4 text-slate-400">{helper}</span></article>;
}

function CampaignReadiness({ connections, templates, eligibleContacts }: { connections: number; templates: number; eligibleContacts: number }) {
  const checks = [
    { ready: connections > 0, label: "رقم WhatsApp Business متصل", href: "/dashboard/whatsapp/setup" },
    { ready: templates > 0, label: "قالب Meta معتمد ومتزامن", href: "/dashboard/whatsapp/templates" },
    { ready: eligibleContacts > 0, label: "جهات اتصال بموافقة فعالة", href: "/dashboard/whatsapp/contacts" },
  ];
  return <div className="rounded-[26px] border border-slate-200 bg-white p-5"><h2 className="font-black text-slate-900">أكمل جاهزية الحملة</h2><p className="mt-2 text-xs leading-6 text-slate-500">سيظهر معالج الإنشاء فور اكتمال المتطلبات الثلاثة.</p><div className="mt-4 space-y-2">{checks.map((check) => <Link key={check.label} href={check.href} className={`flex items-center justify-between rounded-xl border p-3 text-xs font-black ${check.ready ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}><span>{check.ready ? "✓" : "○"} {check.label}</span><span>{check.ready ? "مكتمل" : "إكمال ←"}</span></Link>)}</div></div>;
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
  const labels: Record<CampaignStatusFilter, string> = { all: "كل الحالات", ready: "جاهزة", scheduled: "مجدولة", running: "قيد الإرسال", paused: "متوقفة مؤقتًا", completed: "مكتملة", failed: "متعذرة", cancelled: "ملغاة" };
  return labels[status];
}

function campaignTimingLabel(campaign: { createdAt: Date; scheduledAt: Date | null; startedAt: Date | null; completedAt: Date | null }) {
  if (campaign.completedAt) return `اكتملت ${campaign.completedAt.toLocaleString("ar-SA")}`;
  if (campaign.startedAt) return `بدأت ${campaign.startedAt.toLocaleString("ar-SA")}`;
  if (campaign.scheduledAt) return `مجدولة ${campaign.scheduledAt.toLocaleString("ar-SA")}`;
  return `أُنشئت ${campaign.createdAt.toLocaleString("ar-SA")}`;
}

function templateCategoryLabel(category: string) {
  const labels: Record<string, string> = { marketing: "تسويقي", utility: "خدمي", authentication: "مصادقة", MARKETING: "تسويقي", UTILITY: "خدمي", AUTHENTICATION: "مصادقة" };
  return labels[category] ?? "معتمد";
}

function campaignOperationMessage(operation: string | undefined, readiness: WhatsAppCampaignLaunchReadiness) {
  if (operation === "worker-unavailable") return `الإرسال متوقف بأمان: ${readinessLabel(readiness)}. لم تتم إضافة أي رسائل جديدة للإرسال.`;
  if (operation === "canary-launched") return "بدأت الدفعة التجريبية الآمنة بحد أقصى 5 مستلمين. سننتظر تأكيد التسليم أو القراءة من Meta قبل توسيع الإرسال.";
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
  if (operation === "launch") return "تم قبول طلب بدء الإرسال بأمان.";
  return "تعذرت العملية؛ تحقق من الاتصال والقالب والموافقات وحالة الحملة.";
}

function readinessLabel(readiness: WhatsAppCampaignLaunchReadiness) {
  if (readiness.ready) return "خدمة الإرسال جاهزة";
  if (readiness.code === "web_release_unavailable") return "تعذر التحقق من إصدار المنصة الحالي";
  if (readiness.code === "worker_release_mismatch") return "خدمة الإرسال تحتاج إلى التحديث لتطابق إصدار المنصة";
  if (readiness.code === "worker_not_started") return "خدمة الإرسال لم تسجل تشغيلًا ناجحًا بعد";
  if (readiness.code === "worker_failed") return "آخر دورة تشغيل لخدمة الإرسال لم تكتمل بنجاح";
  if (readiness.code === "worker_stale") return "آخر تحقق ناجح لخدمة الإرسال قديم ويحتاج إلى تجديد";
  return "تعذر التحقق من الحالة التشغيلية لخدمة الإرسال";
}

function CampaignButton({ id, operation, label, icon, danger = false, launchReady }: { id: string; operation: string; label: string; icon: React.ReactNode; danger?: boolean; launchReady: boolean }) {
  const classes = `inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-[#e9fbf8] text-[#008f87] hover:bg-[#d8f7f2]"}`;
  if (operation === "launch") return <form action={launchWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><ConfirmSubmitButton label={label} showIcon={false} disabled={!launchReady} className={classes} confirmMessage="سيبدأ الإرسال الرسمي وقد تترتب رسوم من Meta. هل تؤكد أن جميع المستلمين وافقوا صراحة على استلام الرسائل؟" /></form>;
  return <form action={operateWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><input type="hidden" name="operation" value={operation} /><button className={classes}>{icon}{label}</button></form>;
}

function Mini({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-slate-100 bg-slate-50 p-2 text-center"><span className="block text-[9px] text-slate-400">{label}</span><b className="text-sm text-slate-900">{value}</b></div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat("ar-SA", { style: "percent", maximumFractionDigits: 1 }).format(Math.min(1, Math.max(0, value)));
}
