import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Eye,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { db } from "../../../lib/db";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";

const allowedWindows = [7, 30, 90] as const;
type ReportWindow = (typeof allowedWindows)[number];

type CampaignPerformanceRow = {
  campaignId: string;
  name: string;
  createdAt: Date;
  totalRecipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
};

type DailyPerformanceRow = {
  day: Date;
  sent: number;
  delivered: number;
  read: number;
};

export default async function WhatsAppInsightsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) {
    redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  }

  const params = await searchParams;
  const requestedWindow = Number(params.days ?? 30);
  const days: ReportWindow = allowedWindows.includes(requestedWindow as ReportWindow) ? requestedWindow as ReportWindow : 30;
  const sinceRows = await db.$queryRaw<Array<{ since: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP - (${days} * INTERVAL '1 day') AS "since"`);
  const since = sinceRows[0]?.since ?? new Date(0);

  const [campaigns, messageCounts, audienceRows, automationJobs, dailyPerformance] = await Promise.all([
    db.$queryRaw<CampaignPerformanceRow[]>(Prisma.sql`
      SELECT
        campaign."id" AS "campaignId",
        campaign."name",
        campaign."createdAt",
        campaign."totalRecipients"::int AS "totalRecipients",
        COUNT(recipient."id") FILTER (WHERE recipient."status" IN ('sent','delivered','read'))::int AS "sent",
        COUNT(recipient."id") FILTER (WHERE recipient."status" IN ('delivered','read'))::int AS "delivered",
        COUNT(recipient."id") FILTER (WHERE recipient."status" = 'read')::int AS "read",
        COUNT(recipient."id") FILTER (WHERE recipient."status" = 'failed')::int AS "failed"
      FROM "WhatsAppCampaign" campaign
      LEFT JOIN "WhatsAppCampaignRecipient" recipient
        ON recipient."businessId" = campaign."businessId"
        AND recipient."campaignId" = campaign."id"
      WHERE campaign."businessId" = ${context.businessId}
        AND campaign."createdAt" >= ${since}
      GROUP BY campaign."id", campaign."name", campaign."createdAt", campaign."totalRecipients"
      ORDER BY campaign."createdAt" DESC
      LIMIT 100
    `),
    db.whatsAppMessage.groupBy({
      by: ["direction"],
      where: { businessId: context.businessId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.$queryRaw<Array<{ total: number; eligible: number; optedOut: number }>>(Prisma.sql`
      SELECT
        COUNT(*)::int AS "total",
        COUNT(*) FILTER (
          WHERE contact."optedOutAt" IS NULL
            AND consent."revokedAt" IS NULL
            AND consent."consentedAt" <= CURRENT_TIMESTAMP
        )::int AS "eligible",
        COUNT(*) FILTER (WHERE contact."optedOutAt" IS NOT NULL)::int AS "optedOut"
      FROM "WhatsAppContact" contact
      LEFT JOIN "WhatsAppConsent" consent
        ON consent."businessId" = contact."businessId"
        AND consent."phoneE164" = contact."phoneE164"
      WHERE contact."businessId" = ${context.businessId}
    `),
    db.whatsAppAutomationJob.groupBy({
      by: ["status"],
      where: { businessId: context.businessId, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    db.$queryRaw<DailyPerformanceRow[]>(Prisma.sql`
      SELECT
        DATE_TRUNC('day', COALESCE(recipient."sentAt", recipient."createdAt")) AS "day",
        COUNT(*) FILTER (WHERE recipient."status" IN ('sent','delivered','read'))::int AS "sent",
        COUNT(*) FILTER (WHERE recipient."status" IN ('delivered','read'))::int AS "delivered",
        COUNT(*) FILTER (WHERE recipient."status" = 'read')::int AS "read"
      FROM "WhatsAppCampaignRecipient" recipient
      WHERE recipient."businessId" = ${context.businessId}
        AND COALESCE(recipient."sentAt", recipient."createdAt") >= ${since}
      GROUP BY DATE_TRUNC('day', COALESCE(recipient."sentAt", recipient."createdAt"))
      ORDER BY "day" ASC
      LIMIT 90
    `),
  ]);

  const campaignTotals = campaigns.reduce((sum, campaign) => ({
    recipients: sum.recipients + campaign.totalRecipients,
    sent: sum.sent + campaign.sent,
    delivered: sum.delivered + campaign.delivered,
    read: sum.read + campaign.read,
    failed: sum.failed + campaign.failed,
  }), { recipients: 0, sent: 0, delivered: 0, read: 0, failed: 0 });
  const deliveryRate = campaignTotals.sent ? campaignTotals.delivered / campaignTotals.sent : 0;
  const readRate = campaignTotals.delivered ? campaignTotals.read / campaignTotals.delivered : 0;
  const inboundMessages = messageCounts.find((row) => row.direction === "inbound")?._count._all ?? 0;
  const outboundMessages = messageCounts.find((row) => row.direction === "outbound")?._count._all ?? 0;
  const audience = audienceRows[0] ?? { total: 0, eligible: 0, optedOut: 0 };
  const automationTotal = automationJobs.reduce((sum, row) => sum + row._count._all, 0);
  const automationSent = automationJobs.filter((row) => ["sent", "delivered", "read"].includes(row.status)).reduce((sum, row) => sum + row._count._all, 0);
  const topCampaigns = [...campaigns]
    .filter((campaign) => campaign.sent > 0)
    .sort((a, b) => campaignScore(b) - campaignScore(a) || b.sent - a.sent)
    .slice(0, 5);
  const maxDaily = Math.max(1, ...dailyPerformance.map((row) => row.sent));

  return <div className="min-w-0 space-y-5 pb-5">
    <header className="relative overflow-hidden rounded-[30px] bg-[#061719] p-5 text-white shadow-[0_30px_80px_-50px_rgba(3,23,25,.9)] sm:p-7">
      <div className="absolute -left-20 -top-24 h-64 w-64 rounded-full bg-[#00d8c6]/20 blur-3xl" />
      <div className="absolute -bottom-24 right-1/3 h-56 w-56 rounded-full bg-[#118cff]/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.18em] text-[#6eead8]" dir="ltr"><BarChart3 className="h-3.5 w-3.5" />WHATSAPP PERFORMANCE CENTER</span><h1 className="mt-3 text-2xl font-black sm:text-3xl">مركز أداء واتساب</h1><p className="mt-3 max-w-3xl text-xs leading-7 text-slate-300">اقرأ ما حدث فعلًا: الإرسال والتسليم والقراءة وحركة المحادثات وصحة الجمهور والأتمتة. لا نعرض إيرادًا أو تحويلًا ما لم يوجد له إسناد حقيقي في البيانات.</p></div>
        <form className="grid min-w-[220px] gap-2 rounded-[22px] border border-white/10 bg-white/[.05] p-3"><label className="text-[9px] font-black text-slate-400" htmlFor="report-window">REPORT WINDOW</label><select id="report-window" name="days" defaultValue={days} className="min-h-10 rounded-xl border border-white/10 bg-[#0b2528] px-3 text-[10px] font-black text-white outline-none focus:border-[#35e4cb]"><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يومًا</option><option value={90}>آخر 90 يومًا</option></select><button className="min-h-10 rounded-xl bg-[#35e4cb] px-3 text-[10px] font-black text-[#061719]">تحديث التقرير</button></form>
      </div>
    </header>

    <section aria-label="مؤشرات أداء واتساب" className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-6">
      <Kpi icon={<Send className="h-4 w-4" />} label="إرسال مؤكد" value={formatNumber(campaignTotals.sent)} helper={`${formatNumber(campaignTotals.recipients)} مستلمًا مثبتًا`} />
      <Kpi icon={<CheckCircle2 className="h-4 w-4" />} label="معدل التسليم" value={formatRate(deliveryRate)} helper={`${formatNumber(campaignTotals.delivered)} تسليم`} good />
      <Kpi icon={<Eye className="h-4 w-4" />} label="معدل القراءة" value={formatRate(readRate)} helper={`${formatNumber(campaignTotals.read)} قراءة`} />
      <Kpi icon={<MessageCircle className="h-4 w-4" />} label="رسائل واردة" value={formatNumber(inboundMessages)} helper={`${formatNumber(outboundMessages)} صادرة`} />
      <Kpi icon={<UsersRound className="h-4 w-4" />} label="جمهور مؤهل الآن" value={formatNumber(audience.eligible)} helper={`${formatNumber(audience.optedOut)} Opt-out`} />
      <Kpi icon={<Sparkles className="h-4 w-4" />} label="تشغيلات الأتمتة" value={formatNumber(automationTotal)} helper={`${formatNumber(automationSent)} إرسال مؤكد`} />
    </section>

    <section className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
      <article className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><span className="text-[9px] font-black text-[#008f87]">DELIVERY TREND</span><h2 className="mt-1 font-black text-slate-900">حركة الإرسال خلال الفترة</h2></div><Activity className="h-5 w-5 text-[#008f87]" /></div>{dailyPerformance.length ? <div className="mt-5 flex h-44 items-end gap-1 overflow-hidden rounded-[18px] border border-slate-100 bg-slate-50/60 p-3" aria-label="مخطط إرسال يومي">{dailyPerformance.map((row) => { const height = Math.max(8, Math.round((row.sent / maxDaily) * 100)); return <div key={row.day.toISOString()} className="group relative flex min-w-0 flex-1 items-end justify-center self-stretch"><div className="w-full max-w-5 rounded-t-md bg-[#00bfae] transition group-hover:bg-[#008f87]" style={{ height: `${height}%` }} title={`${row.day.toLocaleDateString("ar-SA")}: ${row.sent} إرسال · ${row.delivered} تسليم · ${row.read} قراءة`} /></div>; })}</div> : <EmptyState text="لا توجد عمليات إرسال حملة مؤكدة في هذه الفترة بعد." />}</article>
      <aside className="space-y-3"><div className="rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4"><ShieldCheck className="h-4 w-4 text-emerald-700" /><b className="mt-2 block text-xs text-slate-900">صحة الجمهور الحالية</b><p className="mt-2 text-[9px] leading-5 text-slate-600">{formatNumber(audience.eligible)} من أصل {formatNumber(audience.total)} جهة تطابق الآن Contact + Consent الفعال ولم تنسحب. هذه لقطة حالية وليست رقمًا تاريخيًا للفترة.</p><Link href="/dashboard/whatsapp/contacts" className="mt-3 inline-flex items-center gap-1 text-[9px] font-black text-[#008f87]">فتح مساحة الجمهور<ArrowLeft className="h-3 w-3" /></Link></div><div className="rounded-[24px] border border-slate-200 bg-white p-4"><span className="text-[9px] font-black text-slate-400">REPORTING CONTRACT</span><p className="mt-2 text-[9px] leading-5 text-slate-500">الأرقام هنا مشتقة من سجلات نفس النشاط فقط، ولا تعرض نصوص الرسائل أو أرقام العملاء أو أي بيانات اعتماد. نسب القراءة تعتمد على إيصالات Meta التي وصلت فعليًا.</p></div></aside>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <article className="rounded-[26px] border border-slate-200 bg-white p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><span className="text-[9px] font-black text-[#008f87]">CAMPAIGN PERFORMANCE</span><h2 className="mt-1 font-black text-slate-900">أفضل الحملات أداءً</h2></div><Link href="/dashboard/whatsapp/campaigns" className="text-[9px] font-black text-[#008f87]">كل الحملات</Link></div>{topCampaigns.length ? <div className="mt-4 grid gap-2">{topCampaigns.map((campaign, index) => <article key={campaign.campaignId} className="grid gap-3 rounded-[18px] border border-slate-100 bg-[#fbfdfd] p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#e9fbf8] text-[10px] font-black text-[#008f87]">#{index + 1}</span><div className="min-w-0"><b className="block truncate text-xs text-slate-900">{campaign.name}</b><span className="mt-1 block text-[8px] text-slate-400">{campaign.createdAt.toLocaleDateString("ar-SA")} · {formatNumber(campaign.sent)} إرسال</span></div><div className="flex gap-3 text-[9px]"><span><b className="block text-slate-900">{formatRate(campaign.sent ? campaign.delivered / campaign.sent : 0)}</b><span className="text-slate-400">تسليم</span></span><span><b className="block text-slate-900">{formatRate(campaign.delivered ? campaign.read / campaign.delivered : 0)}</b><span className="text-slate-400">قراءة</span></span></div></article>)}</div> : <EmptyState text="لا توجد حملات مرسلة تكفي لترتيب الأداء في هذه الفترة." />}</article>
      <aside className="rounded-[24px] border border-slate-200 bg-white p-4"><span className="text-[9px] font-black text-[#008f87]">PERIOD SUMMARY</span><dl className="mt-3 grid gap-2"><SummaryCell label="الحملات المنشأة" value={formatNumber(campaigns.length)} /><SummaryCell label="فشل الإرسال" value={formatNumber(campaignTotals.failed)} /><SummaryCell label="إجمالي المحادثات" value={formatNumber(inboundMessages + outboundMessages)} /><SummaryCell label="الفترة" value={`${days} يومًا`} /></dl></aside>
    </section>
  </div>;
}

function Kpi({ icon, label, value, helper, good = false }: { icon: React.ReactNode; label: string; value: string; helper: string; good?: boolean }) { return <article className={`rounded-[20px] border p-4 ${good ? "border-emerald-100 bg-emerald-50/50" : "border-slate-200 bg-white"}`}><div className="flex items-center gap-2 text-[#008f87]">{icon}<span className="text-[8px] font-bold text-slate-400">{label}</span></div><b className="mt-2 block text-xl font-black text-slate-900">{value}</b><span className="mt-1 block text-[8px] leading-4 text-slate-400">{helper}</span></article>; }
function SummaryCell({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3"><dt className="text-[8px] text-slate-400">{label}</dt><dd className="mt-1 text-xs font-black text-slate-900">{value}</dd></div>; }
function EmptyState({ text }: { text: string }) { return <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-[10px] leading-6 text-slate-500">{text}</div>; }
function formatNumber(value: number) { return new Intl.NumberFormat("ar-SA").format(value); }
function formatRate(value: number) { return new Intl.NumberFormat("ar-SA", { style: "percent", maximumFractionDigits: 1 }).format(value); }
function campaignScore(campaign: CampaignPerformanceRow) { const delivery = campaign.sent ? campaign.delivered / campaign.sent : 0; const read = campaign.delivered ? campaign.read / campaign.delivered : 0; return delivery * 0.6 + read * 0.4; }
