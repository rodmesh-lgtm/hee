import Link from "next/link";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { Activity, BarChart3, Megaphone, Pause, Play, StopCircle } from "lucide-react";
import { launchWhatsAppCampaignAction } from "../../../actions/whatsapp-campaign-launch";
import { operateWhatsAppCampaignAction } from "../../../actions/whatsapp-marketing";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { db } from "../../../lib/db";
import { getWhatsAppCampaignLaunchReadiness, type WhatsAppCampaignLaunchReadiness } from "../../../lib/whatsapp/campaign-launch-readiness";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { CampaignWizard } from "./campaign-wizard";

export default async function WhatsAppCampaignsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const context = await getWhatsAppReadContext("campaign.manage");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const now = new Date();
  const [connections, templates, segments, campaigns, eligibleConsents, launchReadiness] = await Promise.all([
    db.whatsAppConnection.findMany({ where: { businessId: context.businessId, provider: "meta", status: "connected", disabledAt: null }, select: { id: true, verifiedName: true, displayPhoneNumber: true } }),
    db.whatsAppTemplate.findMany({ where: { businessId: context.businessId, provider: "meta", status: "approved" }, select: { id: true, connectionId: true, name: true, language: true, category: true, components: true }, orderBy: { name: "asc" } }),
    db.whatsAppSegment.findMany({ where: { businessId: context.businessId, kind: "static" }, select: { id: true, name: true, _count: { select: { memberships: true } } }, orderBy: { name: "asc" }, take: 100 }),
    db.whatsAppCampaign.findMany({ where: { businessId: context.businessId }, orderBy: { createdAt: "desc" }, take: 100, select: { id: true, name: true, status: true, totalRecipients: true, scheduledAt: true, startedAt: true, completedAt: true, createdAt: true, template: { select: { name: true, language: true } } } }),
    db.whatsAppConsent.count({ where: { businessId: context.businessId, revokedAt: null, consentedAt: { lte: now } } }),
    getWhatsAppCampaignLaunchReadiness(),
  ]);
  const wizardTemplates = templates.map((template) => ({ ...template, category: templateCategoryLabel(template.category), ...templatePreview(template.components) }));
  const recipientGroups = campaigns.length ? await db.whatsAppCampaignRecipient.groupBy({ by: ["campaignId", "status"], where: { businessId: context.businessId, campaignId: { in: campaigns.map((item) => item.id) } }, _count: { _all: true } }) : [];
  const recipientCounts = new Map(recipientGroups.map((item) => [`${item.campaignId}:${item.status}`, item._count._all]));
  const operationSucceeded = ["launch", "schedule", "pause", "resume", "cancel", "canary-launched", "canary-awaiting"].includes(params.operation || "");
  const operationMessage = campaignOperationMessage(params.operation, launchReadiness);

  return <div className="space-y-4 pb-5">
    <header className="rounded-[24px] border bg-white p-5">
      <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-[#6543ce]" /><h1 className="text-xl font-black text-[#20264f]">حملات واتساب</h1></div>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">أنشئ حملاتك من جهات الاتصال التي وافقت على الاستلام، واختر رقم واتساب الرسمي والقالب المعتمد، ثم راقب نتائج الإرسال والتسليم والقراءة من مكان واحد.</p>
    </header>

    <section className={`rounded-[20px] border p-4 ${launchReadiness.ready ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
      <div className="flex items-start gap-3"><Activity className={`mt-0.5 h-5 w-5 shrink-0 ${launchReadiness.ready ? "text-emerald-600" : "text-amber-600"}`} /><div><b className="text-sm text-[#20264f]">{launchReadiness.ready ? "الإرسال جاهز" : "الإرسال متوقف مؤقتًا للحماية"}</b><p className="mt-1 text-xs leading-6 text-slate-600">{launchReadiness.ready ? `آخر تحقق تشغيلي ناجح: ${launchReadiness.lastSucceededAt.toLocaleString("ar-SA")}. قبل الإرسال سيعاد التحقق من الموافقة، وإلغاء الاشتراك، والاتصال، واعتماد القالب لكل مستلم.` : `${readinessLabel(launchReadiness)}. يمكنك تجهيز الحملة ومراجعتها الآن، وسيظل الإطلاق متوقفًا حتى تعود حالة التشغيل إلى الوضع السليم.`}</p></div></div>
    </section>

    {params.create || params.operation ? <p aria-live="polite" className={`rounded-2xl p-3 text-xs font-bold ${(params.create === "complete" || operationSucceeded) ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>{params.create === "complete" ? "أُنشئت الحملة وثُبتت قائمة المستلمين المؤهلين. راجع العدد والبيانات قبل الإطلاق." : params.create ? campaignErrorMessage(params.reason) : operationMessage}</p> : null}

    <section className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
      <div>
              {connections.length && templates.length && eligibleConsents ? <CampaignWizard
                connections={connections.map((item) => ({ id: item.id, label: item.verifiedName || item.displayPhoneNumber || "رقم واتساب متصل" }))}
                templates={wizardTemplates}
                segments={segments.map((segment) => ({ id: segment.id, name: segment.name, members: segment._count.memberships }))}
                eligibleContacts={eligibleConsents}
              /> : <CampaignReadiness connections={connections.length} templates={templates.length} eligibleContacts={eligibleConsents} />}
            </div>

      <div className="rounded-[24px] border border-violet-200 bg-violet-50 p-5 text-xs leading-7 text-violet-950">
        <b className="text-sm">مرحلة إرسال تجريبية آمنة</b>
        <p className="mt-2">قبل بدء الحملة نتأكد من جاهزية خدمة الإرسال، ومن استمرار اتصال الرقم واعتماد القالب وصلاحية قائمة المستلمين والموافقات. وقد تترتب رسوم فعلية من Meta عند إرسال الرسائل.</p>
        <p className="mt-2 font-bold">في أول تشغيل فعلي نبدأ بحد أقصى 5 مستلمين. بعد وصول تأكيد تسليم أو قراءة من Meta تصبح الحملات التالية مؤهلة للإرسال المعتاد.</p>
      </div>
    </section>

    <section className="space-y-3">{campaigns.map((campaign) => {
      const count = (status: string) => recipientCounts.get(`${campaign.id}:${status}`) ?? 0;
      const sent = count("sent") + count("delivered") + count("read");
      return <article key={campaign.id} className="rounded-[24px] border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="flex items-center gap-2"><b className="text-[#20264f]">{campaign.name}</b><span className="rounded-full bg-[#f2eeff] px-2.5 py-1 text-[10px] font-black text-[#6543ce]">{campaignStatusLabel(campaign.status)}</span></div><span className="mt-1 block text-xs text-slate-400">{campaign.template.name} · {campaign.template.language} · {campaign.createdAt.toLocaleString("ar-SA")}</span></div>
          <div className="flex flex-wrap gap-2">{campaign.status === "ready" ? <><CampaignButton id={campaign.id} operation="launch" label="بدء الإرسال" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /><form action={operateWhatsAppCampaignAction} className="flex gap-1"><input type="hidden" name="campaignId" value={campaign.id} /><input type="hidden" name="operation" value="schedule" /><input name="scheduledAt" type="datetime-local" required className="h-9 rounded-lg border px-2 text-[10px]" /><button className="rounded-lg border px-3 text-[10px] font-black">جدولة</button></form></> : null}{campaign.status === "running" ? <CampaignButton id={campaign.id} operation="pause" label="إيقاف مؤقت" icon={<Pause className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}{campaign.status === "paused" ? <CampaignButton id={campaign.id} operation="resume" label="استئناف" icon={<Play className="h-3.5 w-3.5" />} launchReady={launchReadiness.ready} /> : null}{!["completed", "cancelled", "failed"].includes(campaign.status) ? <CampaignButton id={campaign.id} operation="cancel" label="إلغاء" icon={<StopCircle className="h-3.5 w-3.5" />} danger launchReady={launchReadiness.ready} /> : null}</div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6"><Mini label="المستلمون" value={campaign.totalRecipients} /><Mini label="تم الإرسال" value={sent} /><Mini label="تم التسليم" value={count("delivered") + count("read")} /><Mini label="تمت القراءة" value={count("read")} /><Mini label="تعذر الإرسال" value={count("failed")} /><Mini label="مستبعدون" value={count("skipped_opt_out")} /></div>
      </article>;
    })}{!campaigns.length ? <div className="rounded-[24px] border border-dashed bg-white p-10 text-center"><BarChart3 className="mx-auto mb-3 h-7 w-7 text-slate-300" /><b className="block text-sm text-[#20264f]">لا توجد حملات بعد</b><p className="mx-auto mt-2 max-w-md text-xs leading-6 text-slate-500">ابدأ بربط رقم واتساب رسمي ومزامنة قالب معتمد وإضافة جهات اتصال بموافقة صريحة، ثم أنشئ حملتك الأولى من النموذج أعلاه.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Link href="/dashboard/whatsapp/setup" className="rounded-xl border px-3 py-2 text-xs font-black text-[#5d49cc]">ربط واتساب</Link><Link href="/dashboard/whatsapp/contacts" className="rounded-xl border px-3 py-2 text-xs font-black text-[#5d49cc]">جهات الاتصال</Link><Link href="/dashboard/whatsapp/templates" className="rounded-xl border px-3 py-2 text-xs font-black text-[#5d49cc]">القوالب</Link></div></div> : null}</section>
  </div>;
}

function CampaignReadiness({ connections, templates, eligibleContacts }: { connections: number; templates: number; eligibleContacts: number }) {
  const checks = [
    { ready: connections > 0, label: "رقم WhatsApp Business متصل", href: "/dashboard/whatsapp/setup" },
    { ready: templates > 0, label: "قالب Meta معتمد ومتزامن", href: "/dashboard/whatsapp/templates" },
    { ready: eligibleContacts > 0, label: "جهات اتصال بموافقة فعالة", href: "/dashboard/whatsapp/contacts" },
  ];
  return <div className="rounded-[26px] border bg-white p-5"><h2 className="font-black text-[#20264f]">أكمل جاهزية الحملة</h2><p className="mt-2 text-xs leading-6 text-slate-500">سيظهر معالج الإنشاء فور اكتمال المتطلبات الثلاثة.</p><div className="mt-4 space-y-2">{checks.map((check) => <Link key={check.label} href={check.href} className={`flex items-center justify-between rounded-xl p-3 text-xs font-black ${check.ready ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}><span>{check.ready ? "✓" : "○"} {check.label}</span><span>{check.ready ? "مكتمل" : "إكمال ←"}</span></Link>)}</div></div>;
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
  const classes = `inline-flex h-9 items-center gap-1 rounded-lg px-3 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "bg-rose-50 text-rose-700" : "bg-[#f2eeff] text-[#6543ce]"}`;
  if (operation === "launch") return <form action={launchWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><ConfirmSubmitButton label={label} showIcon={false} disabled={!launchReady} className={classes} confirmMessage="سيبدأ الإرسال الرسمي وقد تترتب رسوم من Meta. هل تؤكد أن جميع المستلمين وافقوا صراحة على استلام الرسائل؟" /></form>;
  return <form action={operateWhatsAppCampaignAction}><input type="hidden" name="campaignId" value={id} /><input type="hidden" name="operation" value={operation} /><button className={classes}>{icon}{label}</button></form>;
}

function Mini({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-[#faf9fd] p-2 text-center"><span className="block text-[9px] text-slate-400">{label}</span><b className="text-sm text-[#20264f]">{value}</b></div>; }
