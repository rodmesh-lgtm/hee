import Link from "next/link";

type Props = {
  customer: { displayName: string | null; createdAt: Date; optedOutAt: Date | null; tagMemberships: { tag: { name: string } }[] } | null;
  history: { id: string; lastMessageAt: Date | null }[];
};
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }).format(value) : "لا يوجد نشاط مسجل";

export function InboxCustomerContext({ customer, history }: Props) {
  return <details className="border-b border-slate-200 bg-slate-50 p-4">
    <summary className="min-h-11 cursor-pointer rounded-lg py-3 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">سجل العميل والوسوم</summary>
    <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
      <section aria-label="بيانات العميل" className="min-w-0 space-y-3">
        {customer ? <><p className="text-xs text-slate-600">جهة اتصال منذ {date(customer.createdAt)}</p><p className={`text-xs font-bold ${customer.optedOutAt ? "text-rose-700" : "text-slate-600"}`}>{customer.optedOutAt ? "ألغى العميل الاشتراك؛ تبقى ضوابط الإرسال مطبقة." : "تخضع الرسائل للموافقة وصلاحية نافذة الخدمة."}</p><ul aria-label="وسوم العميل" className="flex flex-wrap gap-2">{customer.tagMemberships.map(({ tag }, index) => <li key={`${tag.name}-${index}`} className="max-w-full break-words rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700">{tag.name}</li>)}</ul>{!customer.tagMemberships.length ? <p className="text-xs text-slate-500">لا توجد وسوم مسجلة.</p> : null}</> : <p className="text-xs text-slate-500">لا توجد جهة اتصال محفوظة لهذا الرقم.</p>}
        <Link href="/dashboard/whatsapp/contacts" className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">عرض جهات الاتصال</Link>
      </section>
      <section aria-label="محادثات العميل الأخرى" className="min-w-0">
        <h2 className="text-xs font-bold text-slate-900">محادثات العميل الأخرى لدى المنشأة</h2>
        <p className="mt-2 text-xs leading-6 text-slate-500">أحدث 10 محادثات للرقم نفسه عبر أرقام المنشأة.</p>
        <ul className="mt-2 space-y-1">{history.map(item => <li key={item.id}><Link href={`/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(item.id)}`} className="inline-flex min-h-11 items-center rounded-lg px-2 text-xs font-bold text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">فتح المحادثة · {date(item.lastMessageAt)}</Link></li>)}</ul>
        {!history.length ? <p className="mt-2 text-xs text-slate-500">لا توجد محادثات أخرى محفوظة.</p> : null}
      </section>
    </div>
  </details>;
}
