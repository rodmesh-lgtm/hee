import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, BookOpen, Headphones, MessageCircle } from "lucide-react";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { botSchemaReady } from "../../../lib/whatsapp/bot-store";
import { botAiReady } from "../../../lib/whatsapp/bot-ai";
import { getBotReport, type BotReportRow } from "../../../lib/whatsapp/bot-report";
import { WorkspaceEmpty, WorkspaceHeading, WorkspaceMetric } from "../_components/workspace-ui";
import { LiveReportRefresh } from "../live-report-refresh";

const reasons: Record<string, string> = {
  ANSWER_UNAVAILABLE: "تعذر تجهيز إجابة. راجع معرفة البوت وحالة الخدمة.",
  PROCESSING_EXPIRED: "انتهت مهلة تجهيز الرد.",
  INELIGIBLE: "تُركت المحادثة للفريق أو لم تعد مؤهلة للرد التلقائي.",
  CONFIGURATION_CHANGED: "تغيّرت إعدادات البوت قبل تجهيز الرد.",
};
function deliveryLabel(row: BotReportRow) {
  if (row.deliveryStatus === "sent") return "قبلتها Meta";
  if (row.deliveryStatus === "failed") return "تعذر الإرسال";
  if (row.deliveryStatus === "cancelled") return "أُلغي الإرسال";
  if (row.deliveryStatus === "delivery_unknown") return "نتيجة الإرسال غير مؤكدة";
  if (row.deliveryStatus) return "بانتظار الإرسال";
  return row.status === "failed" ? "تعذر تجهيز الرد" : row.status === "skipped" ? "لم يُجهّز رد" : "قيد تجهيز الرد";
}
export default async function AiPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams;
  const requested = typeof params.days === "string" ? Number(params.days) : 7;
  const days = [1, 7, 30].includes(requested) ? requested : 7;
  const ready = await botSchemaReady();
  const report = ready ? await getBotReport(context.businessId, days) : { summary: { total: 0, sent: 0, handoff: 0, failed: 0 }, bots: [], turns: [] };
  const aiAvailable = botAiReady();
  return <div className="wa-page" dir="rtl">
    <WorkspaceHeading eyebrow="مساعد منشأتك" title="مركز الذكاء الاصطناعي" description="تابع بوتات خدمة العملاء، حدود الاستخدام ونتائج الردود من مكان واحد." action={<Link href="/dashboard/whatsapp/bots" className="wa-button">إعداد البوت والمعرفة</Link>} />
    <LiveReportRefresh observedAt={new Date().toISOString()} />
    <section className="wa-panel wa-stack" aria-label="جاهزية المساعد">
      <div className="wa-section-title"><h2><MessageCircle size={20} aria-hidden="true"/>جاهزية المساعد</h2><span className="wa-badge">{aiAvailable ? "الرد بالذكاء الاصطناعي متاح" : "الرد بالذكاء الاصطناعي غير مفعّل"}</span></div>
      <p className="wa-note">{aiAvailable ? "الخدمة مهيأة. يلزم إعداد معرفة المنشأة وتفعيل البوت للرقم المطلوب، ويظهر نجاح كل رد في سجل النشاط أدناه." : "يمكنك تجهيز المعرفة والأسئلة المعتمدة الآن. بوت الأسئلة المعتمدة يعمل بعد إعداده وتفعيله، ولا يتطلب تفعيل الرد بالذكاء الاصطناعي."}</p>
      {!ready ? <p className="wa-notice">مركز المتابعة ينتظر اكتمال إعداد تخزين البوت.</p> : null}
    </section>
    <section className="wa-panel">
      <form className="wa-filters"><label htmlFor="ai-report-days">فترة التقرير<select id="ai-report-days" name="days" defaultValue={days}><option value={1}>آخر 24 ساعة</option><option value={7}>آخر 7 أيام</option><option value={30}>آخر 30 يومًا</option></select></label><button className="wa-button wa-secondary">عرض التقرير</button></form>
      <div className="wa-metrics"><WorkspaceMetric label="محاولات المعالجة" value={report.summary.total} hint="تشمل المعالجة والتجاوز والتحويل"/><WorkspaceMetric label="ردود قبلتها Meta" value={report.summary.sent} hint="لا يعني قبول الرسالة وصولها أو قراءتها"/><WorkspaceMetric label="تحويل إلى الفريق" value={report.summary.handoff} hint="ضمن الفترة المحددة"/><WorkspaceMetric label="تعذر التجهيز أو الإرسال" value={report.summary.failed} hint="راجع سجل النشاط للمتابعة"/></div>
      <p className="wa-note mt-4">الأرقام تشمل الأسئلة المعتمدة والردود الذكية؛ لا تمثل عدد رموز الذكاء الاصطناعي أو فاتورة استخدامه.</p>
    </section>
    <div className="wa-split">
      <section className="wa-panel wa-stack"><h2><BarChart3 size={20} aria-hidden="true"/>الاستخدام اليومي لكل رقم</h2><p className="wa-note">يتجدد الحد يوميًا الساعة ٣:٠٠ صباحًا بتوقيت الرياض. يشمل جميع محاولات المعالجة، ويظل مستقلًا عن فترة التقرير.</p>
        {!report.bots.length ? <WorkspaceEmpty title="ابدأ بإعداد مساعدك" description="أضف أسئلة العملاء وإجاباتها، واختبرها قبل تفعيل البوت." href="/dashboard/whatsapp/bots" label="إعداد أول بوت"/> : report.bots.map(bot => <article className="wa-ai-bot" key={bot.connectionId}>
          <div className="wa-block-row"><div><strong>{bot.name}</strong><span dir="ltr">{bot.phone ?? "رقم المنشأة"}</span><small>{bot.mode === "ai" ? "معرفة المنشأة والذكاء الاصطناعي" : "الأسئلة المعتمدة"}</small></div><span className="wa-badge">{!bot.connected ? "الرقم غير متصل" : !bot.enabled ? "متوقف" : bot.mode === "ai" && !aiAvailable ? "يحتاج تفعيل الخدمة" : "مفعّل"}</span></div>
          <div className="wa-ai-usage"><span>{bot.used.toLocaleString("ar-SA")} من {bot.dailyLimit.toLocaleString("ar-SA")} محاولة</span><span>{Math.max(0, bot.dailyLimit - bot.used).toLocaleString("ar-SA")} متبقية</span></div><meter min={0} max={bot.dailyLimit} value={Math.min(bot.used, bot.dailyLimit)} aria-label={`استخدام ${bot.name} اليومي`}/>
        </article>)}
      </section>
      <aside className="wa-stack"><section className="wa-panel wa-stack"><h2><BookOpen size={20} aria-hidden="true"/>معرفة أوضح، ردود أدق</h2><p className="wa-note">دوّن ساعات العمل والخدمات والسياسات والأسئلة الشائعة. جرّب سؤالًا مطابقًا وآخر خارج المعرفة للتأكد من التحويل للفريق.</p><Link className="wa-text-link" href="/dashboard/whatsapp/bots">تحرير المعرفة وتجربة الردود ←</Link></section><section className="wa-panel wa-stack"><h2><Headphones size={20} aria-hidden="true"/>الفريق يكمل المحادثة</h2><p className="wa-note">راجع المحادثات المحالة، ثم استأنف البوت عندما تنتهي المتابعة. المحادثات المسندة إلى موظف تبقى تحت إدارته.</p><Link className="wa-text-link" href="/dashboard/whatsapp/inbox/operations">فتح الفرز والمتابعة ←</Link></section></aside>
    </div>
    <section className="wa-panel wa-stack"><div className="wa-section-title"><h2>سجل نشاط البوت</h2><span>أحدث ٥٠ محاولة ضمن الفترة · توقيت الرياض</span></div>
      {!report.turns.length ? <WorkspaceEmpty title="لا يوجد نشاط في هذه الفترة" description="سيظهر هنا تجهيز الردود والإرسال والتحويل للفريق عند تشغيل البوت واستقبال رسائل العملاء."/> : report.turns.map(row => <article className="wa-block-row" key={row.messageId}><div><strong>{row.name}</strong><span dir="ltr">{row.phone}</span><small><time dateTime={row.createdAt.toISOString()}>{row.createdAt.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh", calendar: "gregory", dateStyle: "medium", timeStyle: "short" })}</time></small>{row.reason ? <p className="wa-note">{reasons[row.reason] ?? "تحتاج هذه المحاولة إلى مراجعة المحادثة."}</p> : null}</div><div><span className="wa-badge" data-status={row.status === "failed" || row.deliveryStatus === "failed" ? "failed" : undefined}>{deliveryLabel(row)}</span>{row.status === "handoff" ? <small>أُحيلت المحادثة للفريق</small> : null}<Link className="wa-text-link" href={`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(row.conversationId)}`}>فتح المحادثة ←</Link></div></article>)}
    </section>
  </div>;
}
