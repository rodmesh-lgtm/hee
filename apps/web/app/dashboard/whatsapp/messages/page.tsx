import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, Search } from "lucide-react";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext, roleCan } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { messageLogFilters, MESSAGE_LOG_STATES } from "../../../lib/whatsapp/message-log-domain";
import { messageLogSelect, messageLogWhere } from "../../../lib/whatsapp/message-log";
import { WorkspaceHeading, WorkspaceMetric, WorkspaceEmpty } from "../_components/workspace-ui";
import { LiveReportRefresh } from "../live-report-refresh";
const date = (value: Date) => new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }).format(value);
export default async function MessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const filters = messageLogFilters(await searchParams);
  const where = await messageLogWhere(context.businessId, filters);
  const [messages, total, counts] = await Promise.all([
    db.whatsAppMessage.findMany({ where, select: messageLogSelect, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 25, skip: (filters.page - 1) * 25 }),
    db.whatsAppMessage.count({ where }),
    db.whatsAppMessage.groupBy({ by: ["status"], where, _count: { _all: true } }),
  ]);
  const count = (...states: string[]) => counts.filter(row => states.includes(row.status)).reduce((sum, row) => sum + row._count._all, 0);
  const query = new URLSearchParams({ status: filters.status, direction: filters.direction, days: String(filters.days), q: filters.query });
  const pageHref = (page: number) => `/dashboard/whatsapp/messages?${query}&page=${page}`;
  return <div className="wa-page" dir="rtl">
    <WorkspaceHeading eyebrow="تتبّع الرسائل" title="سجل الرسائل" description="الوارد والصادر من أرقام منشأتك، مع آخر حالة تسليم موثّقة وإمكانية فتح المحادثة." action={roleCan(context.role, "campaign.manage") ? <a className="wa-button" href={`/api/dashboard/whatsapp/message-export?${query}`}><Download size={17}/>تصدير النتائج CSV</a> : undefined}/>
    <LiveReportRefresh observedAt={new Date().toISOString()} compact/>
    <section className="wa-metrics" aria-label="ملخص نتائج الرسائل"><WorkspaceMetric label="النتائج المطابقة" value={total}/><WorkspaceMetric label="تم التسليم" value={count("delivered", "read")} hint="تشمل الرسائل المقروءة"/><WorkspaceMetric label="تمت القراءة" value={count("read")}/><WorkspaceMetric label="تعذر التسليم" value={count("failed")}/></section>
    <section className="wa-panel"><div className="wa-section-title"><h2>أرشيف الرسائل</h2><span>آخر {filters.days} يومًا · حسب البحث والتصفية</span></div>
      <form className="wa-filters"><label className="wa-search">البحث<input name="q" defaultValue={filters.query} maxLength={80} placeholder="العميل، الرقم، نص الرسالة أو المرجع"/></label><label>الحالة<select name="status" defaultValue={filters.status}>{Object.entries(MESSAGE_LOG_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label>الاتجاه<select name="direction" defaultValue={filters.direction}><option value="all">الوارد والصادر</option><option value="inbound">واردة</option><option value="outbound">صادرة</option></select></label><label>الفترة<select name="days" defaultValue={filters.days}>{[7,30,90].map(days => <option key={days} value={days}>آخر {days} يومًا</option>)}</select></label><button className="wa-button"><Search size={16}/>تطبيق</button></form>
      <p className="wa-note">قبول Meta للرسالة يسبق التسليم. قد لا يوجد نص معاينة للرسائل التي تحتوي على وسائط أو قوالب.</p>
      {!messages.length ? <WorkspaceEmpty title="لا توجد رسائل مطابقة" description="غيّر الفترة أو البحث، أو افتح المحادثات لمراجعة نشاط العملاء." href="/dashboard/whatsapp/inbox" label="فتح المحادثات"/> : <div className="wa-message-list">{messages.map(message => <article className="wa-message-row" key={message.id}><div className="wa-message-person"><strong>{message.conversation.customerDisplayName || "عميل واتساب"}</strong><span dir="ltr">{message.conversation.customerPhoneE164}</span><small>{message.direction === "inbound" ? "واردة" : "صادرة"} · {message.messageType}</small></div><div className="wa-message-content"><p>{message.textBody || "رسالة قالبية أو وسائط"}</p><time dateTime={message.createdAt.toISOString()}>{date(message.createdAt)}</time></div><div className="wa-message-result"><span className="wa-badge" data-status={message.status}>{MESSAGE_LOG_STATES[message.status as keyof typeof MESSAGE_LOG_STATES] ?? "حالة غير معروفة"}</span>{message.errorCode && /^\d{1,10}$/.test(message.errorCode) ? <small>رمز Meta: {message.errorCode}</small> : null}<Link href={`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(message.conversation.id)}`} className="wa-text-link">فتح المحادثة ←</Link></div></article>)}</div>}
      <nav aria-label="صفحات سجل الرسائل" className="wa-pagination"><span>{total.toLocaleString("ar-SA")} نتيجة · صفحة {filters.page.toLocaleString("ar-SA")}</span><div>{filters.page > 1 ? <Link className="wa-button wa-secondary" href={pageHref(filters.page-1)}>السابق</Link> : null}{filters.page*25 < total ? <Link className="wa-button wa-secondary" href={pageHref(filters.page+1)}>التالي</Link> : null}</div></nav>
    </section>
  </div>;
}
