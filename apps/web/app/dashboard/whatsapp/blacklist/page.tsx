import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, ShieldBan, Search } from "lucide-react";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext, roleCan } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { WorkspaceHeading, WorkspaceMetric, WorkspaceEmpty } from "../_components/workspace-ui";
import { blockWhatsAppContactAction } from "./actions";
export default async function BlacklistPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; result?: string }> }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const params = await searchParams, query = String(params.q ?? "").trim().slice(0, 80);
  const rawPage = Number(params.page), page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 10000) : 1;
  const scope = { businessId: context.businessId, optedOutAt: { not: null } };
  const where = { ...scope, ...(query ? { OR: [{ displayName: { contains: query, mode: "insensitive" as const } }, { phoneE164: { contains: query } }] } : {}) };
  const [total, matching, contacts] = await Promise.all([db.whatsAppContact.count({ where: scope }), db.whatsAppContact.count({ where }), db.whatsAppContact.findMany({ where, select: { id: true, displayName: true, phoneE164: true, optedOutAt: true }, orderBy: [{ optedOutAt: "desc" }, { id: "desc" }], take: 25, skip: (page - 1)*25 })]);
  const href = (next: number) => `/dashboard/whatsapp/blacklist?${new URLSearchParams({ q: query, page: String(next) })}`;
  return <div className="wa-page" dir="rtl"><WorkspaceHeading eyebrow="حماية الجمهور" title="قائمة منع الإرسال" description="الأرقام المنسحبة أو الممنوعة من رسائل المنشأة في مكان واحد. يُعاد فحص المنع قبل كل إرسال." action={<Link className="wa-button wa-secondary" href="/dashboard/whatsapp/contacts">إدارة الجمهور</Link>}/>
    {params.result ? <p role="status" className="wa-notice">{params.result === "blocked" ? "أضيف الرقم إلى منع الإرسال وسُحبت موافقته داخل هذه المنشأة." : params.result === "limited" ? "وصلت إلى حد التعديلات المؤقت. حاول لاحقًا." : "أدخل رقمًا صالحًا وأكّد منع الإرسال."}</p> : null}
    <section className="wa-metrics" aria-label="حالة منع الإرسال"><WorkspaceMetric label="أرقام ممنوعة" value={total}/><WorkspaceMetric label="مطابقة للبحث" value={matching}/><WorkspaceMetric label="فحص المنع" value="تلقائي" hint="قبل كل رسالة"/><WorkspaceMetric label="أوامر الانسحاب" value="فعّالة" hint="إيقاف · stop · unsubscribe"/></section>
    <div className="wa-split"><section className="wa-panel"><div className="wa-section-title"><h2><ShieldBan size={20}/>الأرقام التي لن تُرسل إليها الرسائل</h2></div><form className="wa-filters"><label className="wa-search">البحث<input name="q" defaultValue={query} maxLength={80} placeholder="اسم العميل أو رقم الجوال"/></label><button className="wa-button"><Search size={16}/>بحث</button></form>{!contacts.length ? <WorkspaceEmpty title="لا توجد أرقام مطابقة" description="تظهر هنا الأرقام الممنوعة يدويًا أو التي ألغت الاشتراك من واتساب."/> : <div className="wa-message-list">{contacts.map(contact => <article key={contact.id} className="wa-block-row"><div><strong>{contact.displayName || "بدون اسم"}</strong><span dir="ltr">{contact.phoneE164}</span></div><div><span className="wa-badge" data-status="failed">ممنوع من الإرسال</span><small>{contact.optedOutAt?.toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}</small></div></article>)}</div>}<nav className="wa-pagination" aria-label="صفحات قائمة المنع"><span>صفحة {page} · {matching} نتيجة</span><div>{page > 1 ? <Link className="wa-button wa-secondary" href={href(page-1)}>السابق</Link> : null}{page*25 < matching ? <Link className="wa-button wa-secondary" href={href(page+1)}>التالي</Link> : null}</div></nav></section>
    <aside className="wa-stack">{roleCan(context.role, "campaign.manage") ? <form action={blockWhatsAppContactAction} className="wa-panel wa-stack"><h2>منع رقم من الإرسال</h2><label>رقم واتساب<input name="phone" type="tel" inputMode="tel" dir="ltr" placeholder="05xxxxxxxx" maxLength={24} required/></label><label className="wa-check"><input name="confirm" type="checkbox" required/>أؤكد منع رسائل المنشأة إلى هذا الرقم وسحب موافقته.</label><button className="wa-button"><ShieldBan size={17}/>إضافة إلى قائمة المنع</button></form> : null}<section className="wa-panel wa-stack"><ShieldCheck className="wa-accent" size={25}/><h2>حماية مستمرة</h2><p className="wa-note">حذف جهة الاتصال أو استيراد الرقم مجددًا لا يعيد الموافقة. الرسالة التي قبلتها Meta بالفعل قد تصل بعد تسجيل المنع.</p><Link className="wa-text-link" href="/dashboard/whatsapp/audit">مراجعة سجل العمليات ←</Link></section></aside></div>
  </div>;
}
