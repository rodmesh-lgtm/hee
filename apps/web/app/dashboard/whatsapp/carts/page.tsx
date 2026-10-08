import Link from "next/link";
import { redirect } from "next/navigation";
import { Workflow, Plug, Search } from "lucide-react";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext, roleCan } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { WorkspaceHeading, WorkspaceMetric } from "../_components/workspace-ui";
import { CART_STATES, cartReportFilters, type CartState } from "../../../lib/whatsapp/cart-report-domain";

import { cartReportScope } from "../../../lib/whatsapp/cart-report";
import { CsvExportLink } from "../_components/csv-export-link";
import { LiveReportRefresh } from "../live-report-refresh";

const panel = "rounded-2xl border border-slate-200 bg-white p-5";
const control = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";
const date = (value: Date) => new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function CartReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const filters = cartReportFilters(await searchParams);
  const { state, days, page, query } = filters;
  const { scope, where } = await cartReportScope(context.businessId, filters);
  const exportQuery = new URLSearchParams({ days: String(days), state, q: query });
  const [counts, total, carts, automationCount, leaders] = await Promise.all([
    db.whatsAppAutomationCart.groupBy({ by: ["state"], where: scope, _count: { _all: true } }),
    db.whatsAppAutomationCart.count({ where }),
    db.whatsAppAutomationCart.findMany({ where, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], skip: (page - 1) * 25, take: 25,
      select: { id: true, cartId: true, state: true, occurredAt: true, contact: { select: { displayName: true, phoneE164: true, optedOutAt: true } },
        events: { where: { businessId: context.businessId }, orderBy: [{ occurredAt: "desc" }, { id: "desc" }], take: 1, select: { source: true, integration: { select: { displayName: true, provider: true } } } } } }),
    db.whatsAppAutomation.count({ where: { businessId: context.businessId, triggerType: "abandoned_cart", status: "active" } }),
    db.whatsAppAutomationCart.groupBy({ by: ["contactId"], where: { ...scope, state: "abandoned" }, _count: { _all: true }, orderBy: { _count: { contactId: "desc" } }, take: 5 }),
  ]);
  const contacts = leaders.length ? await db.whatsAppContact.findMany({ where: { businessId: context.businessId, id: { in: leaders.map(item => item.contactId) } }, select: { id: true, displayName: true, phoneE164: true } }) : [];
  const count = (key: string) => counts.find(item => item.state === key)?._count._all ?? 0;
  const href = (next: number) => `/dashboard/whatsapp/carts?${new URLSearchParams({ days: String(days), state, q: query, page: String(next) })}`;
  return <div className="min-w-0 space-y-5" dir="rtl">
    <WorkspaceHeading eyebrow="أتمتة المتاجر" title="السلال المتروكة والمتابعة" description="تابع السلال المستلمة من متجرك، وحالات الاستعادة، والعملاء الذين يحتاجون متابعة." action={<div className="wa-actions"><Link href="/dashboard/whatsapp/automations#automation-create" className="wa-button"><Workflow size={17}/>إعداد رسالة السلة</Link><Link href="/dashboard/whatsapp/integrations" className="wa-button wa-secondary"><Plug size={17}/>مصدر البيانات</Link></div>}/>
    <LiveReportRefresh observedAt={new Date().toISOString()} compact/>
    <section className="wa-metrics" aria-label="حالات السلال">{Object.entries(CART_STATES).map(([key, label]) => <WorkspaceMetric key={key} label={label} value={count(key)} hint={`آخر ${days} يومًا`}/>)}</section>
    <section className="wa-panel wa-stack" aria-label="توزيع حالات السلال"><h2>توزيع حالات السلال</h2><p className="wa-note">الحالة الحالية للسلال التي تغيّرت خلال الفترة المختارة.</p>{Object.entries(CART_STATES).map(([key,label]) => { const value=count(key), sum=counts.reduce((n,row)=>n+row._count._all,0), percent=sum ? Math.round(value/sum*100) : 0; return <div key={key} className="wa-cart-bar"><div><span>{label}</span><b>{value.toLocaleString("ar-SA")} · {percent}%</b></div><meter min={0} max={Math.max(sum,1)} value={value} aria-label={label}/></div>; })}</section>
    <div className={panel}><p className="text-sm leading-7 text-slate-700">الأعداد حسب الحالة الحالية للسلال التي تغيّرت خلال آخر {days} يومًا؛ الاستعادة لا تثبت أن رسالة واتساب سببت الشراء. قيمة السلة والإيراد لا يعرضان حتى يتوفر مصدر مالي موثوق.</p><p className="mt-2 text-sm font-bold text-teal-800">مسارات تذكير السلة المفعّلة: {automationCount}</p><p className="mt-2 text-sm leading-7 text-slate-600">يدعم السجل أحداث السلال من سلة وShopify وواجهة أحداث INFRO. لسلة: فعّل أحداث السلة المتروكة وتحديثها وشرائها في تطبيق شركاء سلة؛ ربط الطلبات وحده لا يكفي. التذكير يتطلب موافقة صالحة وقالبًا معتمدًا، وتُلغى الرسائل المعلقة عند استعادة السلة.</p></div>
    <section className={panel} aria-label="سجل السلال"><div className="wa-section-title"><h2>سجل السلال</h2>{roleCan(context.role, "campaign.manage") ? <CsvExportLink key={exportQuery.toString()} href={`/api/dashboard/whatsapp/cart-export?${exportQuery}`} filename="infro-carts.csv"/> : null}</div><p className="wa-note">التصدير يشمل النتائج المطابقة للبحث والحالة والفترة في جميع الصفحات، حتى 5000 سلة في الملف. وقت الحدث في الملف بالتوقيت العالمي UTC.</p><form className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_auto_auto_auto]"><label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700 sm:col-span-2 lg:col-span-1">البحث<input name="q" defaultValue={query} maxLength={80} placeholder="العميل، الجوال، أو معرف السلة" className={`${control} w-full`}/></label><label className="grid gap-2 text-sm font-bold text-slate-700">الحالة<select name="state" defaultValue={state} className={control}><option value="all">كل الحالات</option>{Object.entries(CART_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-2 text-sm font-bold text-slate-700">الفترة<select name="days" defaultValue={days} className={control}>{[7,30,90].map(value => <option key={value} value={value}>آخر {value} يومًا</option>)}</select></label><button className="inline-flex min-h-11 items-center gap-2 self-end rounded-xl bg-[#008f87] px-5 font-bold text-white"><Search className="h-4 w-4"/>بحث</button></form>
      {!carts.length ? <p className="rounded-xl bg-slate-50 p-8 text-center text-sm leading-7 text-slate-600">لا توجد سلال مطابقة. تحقق من ربط مصدر الأحداث واختيار الفترة والحالة.</p> : <div className="space-y-3">{carts.map(cart => <article key={cart.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_auto]"><div className="min-w-0"><h3 className="break-words font-bold text-slate-900">{cart.contact.displayName || "عميل بدون اسم"}</h3><p dir="ltr" className="mt-1 text-right text-sm text-slate-600">{cart.contact.phoneE164}</p><p className="mt-2 break-all text-xs text-slate-500">السلة: {cart.cartId}</p></div><div className="text-sm leading-7 text-slate-600"><p>{cart.events[0]?.integration?.displayName || (cart.events[0]?.source === "shopify.webhook" ? "Shopify" : "واجهة أحداث INFRO")}</p><time dateTime={cart.occurredAt.toISOString()}>{date(cart.occurredAt)}</time>{cart.contact.optedOutAt ? <p className="font-bold text-rose-700">منسحب من الرسائل</p> : null}</div><span className="h-fit rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">{CART_STATES[cart.state as CartState] ?? "غير معروفة"}</span></article>)}</div>}
      <nav aria-label="صفحات السلال" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700"><span>{total.toLocaleString("ar-SA")} نتيجة · الصفحة {page}</span><div className="flex gap-2">{page > 1 ? <Link className={`${control} inline-flex items-center`} href={href(page-1)}>السابق</Link> : null}{page * 25 < total ? <Link className={`${control} inline-flex items-center`} href={href(page+1)}>التالي</Link> : null}</div></nav>
    </section>
    <section className={panel}><h2 className="text-lg font-black text-slate-900">أكثر العملاء ذوي السلال المتروكة</h2><p className="mt-2 text-sm text-slate-500">أعلى خمسة حسب عدد السلال المتروكة ضمن الفترة، بصرف النظر عن تصفية السجل.</p><div className="mt-4 space-y-3">{leaders.map(item => { const contact = contacts.find(row => row.id === item.contactId); return contact ? <div key={item.contactId} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-800"><span>{contact.displayName || contact.phoneE164}</span><b>{item._count._all} سلة</b></div> : null; })}{!leaders.length ? <p className="text-sm text-slate-500">لا توجد سلال متروكة خلال هذه الفترة.</p> : null}</div></section>
  </div>;
}
