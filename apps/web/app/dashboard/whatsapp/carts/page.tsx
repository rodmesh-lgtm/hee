import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingCart, Workflow, Plug, Search } from "lucide-react";
import { Prisma } from "@prisma/client";
import { db } from "../../../lib/db";
import { getWhatsAppReadContext } from "../../../lib/whatsapp/rbac";
import { hasActiveWhatsAppMarketingEntitlement } from "../../../lib/whatsapp/feature-entitlement";
import { CART_STATES, cartReportFilters, type CartState } from "../../../lib/whatsapp/cart-report-domain";

const panel = "rounded-2xl border border-slate-200 bg-white p-5";
const control = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500";
const date = (value: Date) => new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }).format(value);

export default async function CartReportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getWhatsAppReadContext("view");
  if (!context) redirect("/dashboard/whatsapp?access=denied");
  if (!await hasActiveWhatsAppMarketingEntitlement({ businessId: context.businessId })) redirect("/dashboard/billing/manage?feature=whatsapp-marketing");
  const { state, days, page, query } = cartReportFilters(await searchParams);
  const [clock] = await db.$queryRaw<Array<{ since: Date }>>(Prisma.sql`SELECT CURRENT_TIMESTAMP - (${days} * INTERVAL '1 day') AS "since"`);
  if (!clock) throw new Error("CART_REPORT_CLOCK_UNAVAILABLE");
  const since = clock.since;
  const scope = { businessId: context.businessId, occurredAt: { gte: since } };
  const where: Prisma.WhatsAppAutomationCartWhereInput = { ...scope,
    ...(state !== "all" ? { state } : {}),
    ...(query ? { OR: [{ cartId: { contains: query, mode: "insensitive" } }, { contact: { businessId: context.businessId, OR: [{ displayName: { contains: query, mode: "insensitive" } }, { phoneE164: { contains: query } }] } }] } : {}),
  };
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
    <header className="rounded-[28px] bg-[#07181b] p-6 text-white sm:p-8">
      <ShoppingCart className="mb-4 h-7 w-7 text-teal-300" aria-hidden="true"/>
      <h1 className="text-2xl font-black sm:text-3xl">السلال المتروكة والمتابعة</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-200">تابع السلال المستلمة من التكاملات، واعرف من يحتاج متابعة وما تغيّرت حالته. البيانات خاصة بمساحة عملك الحالية.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href="/dashboard/whatsapp/automations#automation-create" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-teal-300 px-4 font-bold text-slate-950"><Workflow className="h-4 w-4"/>إعداد رسالة السلة</Link><Link href="/dashboard/whatsapp/integrations" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-500 px-4 text-sm font-bold"><Plug className="h-4 w-4"/>إدارة مصدر البيانات</Link></div>
    </header>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="حالات السلال">{Object.entries(CART_STATES).map(([key, label]) => <div key={key} className={panel}><p className="text-sm font-bold text-slate-600">{label}</p><p className="mt-2 text-3xl font-black text-slate-900">{count(key).toLocaleString("ar-SA")}</p></div>)}</section>
    <div className={panel}><p className="text-sm leading-7 text-slate-700">الأعداد حسب الحالة الحالية للسلال التي تغيّرت خلال آخر {days} يومًا؛ الاستعادة لا تثبت أن رسالة واتساب سببت الشراء. قيمة السلة والإيراد لا يعرضان حتى يتوفر مصدر مالي موثوق.</p><p className="mt-2 text-sm font-bold text-teal-800">مسارات تذكير السلة المفعّلة: {automationCount}</p><p className="mt-2 text-sm leading-7 text-slate-600">يدعم السجل أحداث السلال من سلة وShopify وواجهة أحداث INFRO. لسلة: فعّل أحداث السلة المتروكة وتحديثها وشرائها في تطبيق شركاء سلة؛ ربط الطلبات وحده لا يكفي. التذكير يتطلب موافقة صالحة وقالبًا معتمدًا، وتُلغى الرسائل المعلقة عند استعادة السلة.</p></div>
    <section className={panel}><h2 className="text-lg font-black text-slate-900">سجل السلال</h2><form className="my-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(200px,1fr)_auto_auto_auto]"><label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700 sm:col-span-2 lg:col-span-1">البحث<input name="q" defaultValue={query} maxLength={80} placeholder="العميل، الجوال، أو معرف السلة" className={`${control} w-full`}/></label><label className="grid gap-2 text-sm font-bold text-slate-700">الحالة<select name="state" defaultValue={state} className={control}><option value="all">كل الحالات</option>{Object.entries(CART_STATES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="grid gap-2 text-sm font-bold text-slate-700">الفترة<select name="days" defaultValue={days} className={control}>{[7,30,90].map(value => <option key={value} value={value}>آخر {value} يومًا</option>)}</select></label><button className="inline-flex min-h-11 items-center gap-2 self-end rounded-xl bg-[#008f87] px-5 font-bold text-white"><Search className="h-4 w-4"/>بحث</button></form>
      {!carts.length ? <p className="rounded-xl bg-slate-50 p-8 text-center text-sm leading-7 text-slate-600">لا توجد سلال مطابقة. تحقق من ربط مصدر الأحداث واختيار الفترة والحالة.</p> : <div className="space-y-3">{carts.map(cart => <article key={cart.id} className="grid min-w-0 gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_auto]"><div className="min-w-0"><h3 className="break-words font-bold text-slate-900">{cart.contact.displayName || "عميل بدون اسم"}</h3><p dir="ltr" className="mt-1 text-right text-sm text-slate-600">{cart.contact.phoneE164}</p><p className="mt-2 break-all text-xs text-slate-500">السلة: {cart.cartId}</p></div><div className="text-sm leading-7 text-slate-600"><p>{cart.events[0]?.integration?.displayName || (cart.events[0]?.source === "shopify.webhook" ? "Shopify" : "واجهة أحداث INFRO")}</p><time dateTime={cart.occurredAt.toISOString()}>{date(cart.occurredAt)}</time>{cart.contact.optedOutAt ? <p className="font-bold text-rose-700">منسحب من الرسائل</p> : null}</div><span className="h-fit rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-800">{CART_STATES[cart.state as CartState] ?? "غير معروفة"}</span></article>)}</div>}
      <nav aria-label="صفحات السلال" className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-700"><span>{total.toLocaleString("ar-SA")} نتيجة · الصفحة {page}</span><div className="flex gap-2">{page > 1 ? <Link className={`${control} inline-flex items-center`} href={href(page-1)}>السابق</Link> : null}{page * 25 < total ? <Link className={`${control} inline-flex items-center`} href={href(page+1)}>التالي</Link> : null}</div></nav>
    </section>
    <section className={panel}><h2 className="text-lg font-black text-slate-900">أكثر العملاء ذوي السلال المتروكة</h2><p className="mt-2 text-sm text-slate-500">أعلى خمسة حسب عدد السلال المتروكة ضمن الفترة، بصرف النظر عن تصفية السجل.</p><div className="mt-4 space-y-3">{leaders.map(item => { const contact = contacts.find(row => row.id === item.contactId); return contact ? <div key={item.contactId} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-800"><span>{contact.displayName || contact.phoneE164}</span><b>{item._count._all} سلة</b></div> : null; })}{!leaders.length ? <p className="text-sm text-slate-500">لا توجد سلال متروكة خلال هذه الفترة.</p> : null}</div></section>
  </div>;
}
