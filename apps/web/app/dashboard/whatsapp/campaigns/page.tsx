import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, BarChart3, Megaphone, Pause, Play, StopCircle } from "lucide-react";
import { launchWhatsAppCampaignAction } from "../../../actions/whatsapp-campaign-launch";
import { createWhatsAppCampaignAction, operateWhatsAppCampaignAction } from "../../../actions/whatsapp-marketing";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { db } from "../../../lib/db";
import { getWhatsAppCampaignLaunchReadiness, type WhatsAppCampaignLaunchReadiness } from "../../../lib/whatsapp/campaign-launch-readiness";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";

export default async function WhatsAppCampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const [connections, templates, campaigns, eligibleConsents, launchReadiness] = await Promise.all([
    db.whatsAppConnection.findMany({ where: { businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null }, select: { id: true, verifiedName: true, displayPhoneNumber: true } }),
    db.whatsAppTemplate.findMany({ where: { businessId: context.businessId, provider: "meta", status: "approved" }, select: { id: true, connectionId: true, name: true, language: true, category: true }, orderBy: { name: "asc" } }),
    db.whatsAppCampaign.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, status: true, totalRecipients: true, scheduledAt: true, startedAt: true, completedAt: true, createdAt: true, template: { select: { name: true, language: true } } } }),
    db.whatsAppConsent.count({ where: { businessId: context.businessId, revokedAt: null, consentedAt: { lte: new Date() } } }),
    getWhatsAppCampaignLaunchReadiness(),
  ]);
  const recipientGroups = campaigns.length ? await db.whatsAppCampaignRecipient.groupBy({ by: ["campaignId", "status"], where: { businessId: context.businessId, campaignId: { in: campaigns.map((item) => item.id) } }, _count: { _all: true } }) : [];
  const recipientCounts = new Map(recipientGroups.map((item) => [`${item.campaignId}:${item.status}`, item._count._all]));
  const operationSucceeded = ["launch", "schedule", "pause", "resume", "cancel", "canary-launched", "canary-awaiting"].includes(params.operation || "");
  const operationMessage = campaignOperationMessage(params.operation, launchReadiness);

  return <div className="space-y-4 pb-5">
    <header className="flex flex-wrap items-start justify-between gap-3 rounded-[24px] border bg-white p-5"><div><div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-[#6543ce]" /><h1 className="text-xl font-black text-[#20264f]">حملات واتساب الجماعية</h1></div><p className="mt-2 text-sm text-slate-500">Snapshot ثابت للمستلمين ثم Queue وWorkers وRate Limiting؛ لا تُرسل آلاف الرسائل داخل طلب HTTP.</p></div><Link href="/dashboard/whatsapp" className="rounded-xl border px-3 py-2 text-xs font-black text-[#5d49cc]">مركز واتساب</Link></header>
    <section className={`rounded-[20px] border p-4 ${launchReadiness.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-start gap-3"><Activity className={`mt-0.5 h-5 w-5 shrink-0 ${launchReadiness.ready ? "text-emerald-600" : "text-amber-600"}`} /><div><b className="text-sm text-[#20264f]">{launchReadiness.ready ? "عامل الإرسال جاهز للإطلاق" : "الإطلاق الفوري مقفل مؤقتًا"}</b><p className="mt-1 text-xs leading-6 text-slate-600">{launchReadiness.ready ? `آخر دورة تشغيل ناجحة: ${launchReadiness.lastSucceededAt.toLocaleString("ar-SA")}. سيعاد فحص الموافقة وOpt-out والاتصال واعتماد القالب قبل إدخال أي مستلم للطابور، ثم مرة أخرى قبل الإرسال.` : `${readinessLabel(launchReadiness)}. يمكنك تجهيز الحملة، لكن زر الإطلاق لن يضيف مستلمين للطابور حتى تعود دورة التشغيل إلى حالة سليمة.`}</p></div></div></section>
    {params.create || params.operation ? <p aria-live="polite" className={`rounded-2xl p-3 text-xs font-bold ${(params.create === "complete" || operationSucceeded) ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{params.create === "complete" ? "أُنشئت الحملة وأُخذت لقطة المستلمين المؤهلين. راجع العدد قبل الإطلاق." : operationMessage}</p> : null}
    <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]"><form action={createWhatsAppCampaignAction} className="rounded-[24px] border bg-white p-5"><h2 className="font-black text-[#20264f]">إنشاء حملة</h2><p className="mt-2 text-xs leading-6 text-slate-500">سيُضمّن فقط أصحاب الموافقة الفعالة وغير المنسحبين. المتاح حاليًا: {eligibleConsents} موافقة.</p><label className="mt-4 block text-xs font-bold">اسم الحملة<input name="name" required maxLength={120} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="mt-3 block text-xs font-bold">الرقم الرسمي<select name="connectionId" required className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">اختر الرقم</option>{connections.map((item) => <option key={item.id} value={item.id}>{item.verifiedName || item.displayPhoneNumber || item.id}</option>)}</select></label><label className="mt-3 block text-xs font-bold">القالب المعتمد<select name="templateId" required className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">اختر القالب</option>{templates.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.language} · {item.category}</option>)}</select></label><button disabled={!connections.length || !templates.length || !eligibleConsents} className="mt-4 min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-xs font-black text-white disabled:bg-slate-300">إنشاء وأخذ Snapshot</button>{!connections.length ? <Link href="/dashboard/whatsapp/setup" className="mt-3 block text-xs font-bold text-emerald-700">اربط رقم WhatsApp Business أولًا ←</Link> : null}{connections.length > 0 && !templates.length ? <Link href="/dashboard/whatsapp/templates" className="mt-3 block text-xs font-bold text-amber-700">زامن قالب Meta معتمد أولًا ←</Link> : null}{connections.length > 0 && templates.length > 0 && !eligibleConsents ? <Link href="/dashboard/whatsapp/contacts" className="mt-3 block text-xs font-bold text-amber-700">أضف جهات اتصال بموافقة صريحة أولًا ←</Link> : null}</form>
      <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5 text-xs leading-7 text-amber-950"><b className="text-sm">اختبار الإطلاق الحقيقي</b><p className="mt-2">زر الإطلاق يضيف المستلمين إلى الطابور فقط بعد إثبات أن عامل WhatsApp أتم دورة تشغيل حديثة بنجاح على إصدار الويب نفسه. عند الضغط يُعاد فحص أن الرقم ما زال متصلًا، وأن القالب ما زال معتمدًا، وأن Snapshot غير فارغ، وأن الموافقة وOpt-out صالحان. وقد تنتج رسوم Meta فعلية عند تشغيل العامل.</p><p className="mt-2 font-bold">أول تشغيل فعلي مقيد بدفعة Canary بحد أقصى 5 مستلمين حتى يصل Delivered أو Read مؤكد.</p></div></section>
    <section className="space-y-3">{campaigns.map((campaign) => { const count = (status: string) => recipientCounts.get(`${campaign.id}:${status}`) ?? 0; const sent = count("sent") + count("delivered") + count("read"); return <article key={campaign.id} className="rounded-[24px] border bg-white p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><b className="text-[#20264f]">{campaign.name}</b><span className="rounded-full bg-[#f2eeff] px-2.5 py-1 text-[10px] font-black text-[#6543ce]">{campaign.status}</span></div><span className="mt-1 block text-xs text-slate-400">{campaign.template.name} · {campaign.template.language} · {campaign.createdAt.toLocaleString("ar-SA")}</span></div><div className="flex flex-wrap gap-2">{campaign.status === "ready" ? <><CampaignButton id={campaign.id} operation="launch" label="إطلاق للطابور" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /><form action={operateWhatsAppCampaignAction} className="flex gap-1"><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="operation" value="schedule" /><input name="scheduledAt" type="datetime-local" required className="h-9 rounded-lg border px-2 text-[10px]" /><button className="rounded-lg border px-3 text-[10px] font-black">جدولة</button></form></> : null}{campaign.status === "running" ? <CampaignButton id={campaign.id} operation="pause" label="إيقاف مؤقت" icon={<Pause className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}{campaign.status === "paused" ? <CampaignButton id={campaign.id} operation="resume" label="استئناف" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}{!["completed", "cancelled", "failed"].includes(campaign.status) ? <CampaignButton id={campaign.id} operation="cancel" label="إلغاء" icon={<StopCircle className="h-3.5 w-3.5" />} danger launchReady={launchReadiness.ready} /> : null}</div></div><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6"><Mini label="المستلمون" value={campaign.totalRecipients} /><Mini label="Sent" value={sent} /><Mini label="Delivered" value={count("delivered") + count("read")} /><Mini label="Read" value={count("read")} /><Mini label="Failed" value={count("failed")} /><Mini label="Opt-out" value={count("skipped_opt_out")} /></div></article>; })}{!campaigns.length ? <div className="rounded-[24px] border border-dashed bg-white p-10 text-center text-sm text-slate-400"><BarChart3 className="mx-auto mb-2 h-7 w-7" />لا توجد حملات بعد.</div> : null}</section>
  </div>;
}

function campaignOperationMessage(operation: string | undefined, readiness: WhatsAppCampaignLaunchReadiness) {
  if (operation === "worker-unavailable") return `الإطلاق متوقف بأمان: ${readinessLabel(readiness)}. لم تُضف أي رسائل جديدة إلى طابور الإرسال.`;
  if (operation === "canary-launched") return "تم إطلاق أول دفعة تجريبية بأمان (حتى 5 مستلمين). لن تُفتح بقية الحملة حتى يصل Delivered أو Read مؤكد من Meta.";
  if (operation === "canary-awaiting") return "دفعة Canary استهلكت الحد الآمن وهي الآن بانتظار تأكيد التسليم من Meta. لم تُضف رسائل جديدة للطابور.";
  if (operation === "connection-not-ready") return "تعذر الإطلاق: رقم WhatsApp الرسمي لم يعد متصلًا. لم تُضف أي رسائل للطابور.";
  if (operation === "template-not-approved") return "تعذر الإطلاق: قالب Meta لم يعد في حالة Approved. زامن القوالب قبل المحاولة مجددًا.";
  if (operation === "empty-snapshot") return "تعذر الإطلاق: لا يحتوي Snapshot الحملة على أي مستلم. أنشئ حملة جديدة من جمهور صالح.";
  if (operation === "not-due") return "هذه الحملة مجدولة لوقت لاحق ولم يحن وقتها بعد.";
  if (operation === "not-queueable") return "حالة الحملة الحالية لا تسمح بإدراج مستلمين جدد في الطابور.";
  if (operation === "not-found") return "تعذر العثور على الحملة ضمن نشاطك الحالي.";
  if (operation && operation !== "failed") return `تم تنفيذ ${operation} بأمان.`;
  return "تعذرت العملية؛ تحقق من الاتصال والقالب والموافقات وحالة الحملة.";
}

function readinessLabel(readiness: WhatsAppCampaignLaunchReadiness) {
  if (readiness.ready) return "عامل WhatsApp جاهز";
  if (readiness.code === "web_release_unavailable") return "تعذر إثبات إصدار الويب الحالي";
  if (readiness.code === "worker_release_mismatch") return "إصدار عامل WhatsApp لا يطابق إصدار الويب الحالي";
  if (readiness.code === "worker_not_started") return "عامل WhatsApp لم يسجل دورة تشغيل ناجحة بعد";
  if (readiness.code === "worker_failed") return "آخر دورة لعامل WhatsApp انتهت بخطأ";
  if (readiness.code === "worker_stale") return "آخر نجاح لعامل WhatsApp أقدم من نافذة السلامة";
  return "تعذر إثبات ساعة قاعدة البيانات لحالة العامل";
}

function CampaignButton({ id, operation, label, icon, danger = false, launchReady }: { id: string; operation: string; label: string; icon: React.ReactNode; danger?: boolean; launchReady: boolean }) {
  const classes = `inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-50 text-rose-700" : "bg-[#f2eeff] text-[#6543ce]"}`;
  if (operation === "launch") return <form action={launchWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><ConfirmSubmitButton label={label} showIcon={false} disabled={!launchReady} className={classes} confirmMessage="سيتم إدراج مستلمي الحملة في طابور الإرسال الرسمي وقد تترتب رسوم Meta. هل تؤكد أن جميع المستلمين وافقوا صراحة؟" /></form>;
  return <form action={operateWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><input type="hidden" name="operation" value={operation} /><button className={classes}>{icon}{label}</button></form>;
}

function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-[#faf9fd] p-2 text-center"><span className="block text-[9px] text-slate-400">{label}</span><b className="text-sm text-[#20264f]">{value}</b></div>; }
