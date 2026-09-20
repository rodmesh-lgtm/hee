import Link from "next/link";
import { updateWhatsAppConversationContactTagAction } from "../../../actions/whatsapp";

type Props = {
  conversationId: string;
  canManage: boolean;
  outcome?: string;
  customer: { displayName: string | null; createdAt: Date; optedOutAt: Date | null; tagMemberships: { tag: { id: string; name: string } }[] } | null;
  history: { id: string; lastMessageAt: Date | null }[];
};
const date = (value: Date | null) => value ? new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }).format(value) : "لا يوجد نشاط مسجل";

const outcomes: Record<string, string> = { added: "تمت إضافة الوسم.", removed: "تمت إزالة الوسم.", limit: "بلغت الوسوم الحد المسموح.", invalid: "تحقق من اسم الوسم.", unavailable: "تعذر تحديث الوسم الآن. أعد المحاولة." };

export function InboxCustomerContext({ conversationId, canManage, outcome, customer, history }: Props) {
  return <details open={Boolean(outcome)} className="border-b border-slate-200 bg-slate-50 p-4">
    <summary className="min-h-11 cursor-pointer rounded-lg py-3 text-sm font-bold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">سجل العميل والوسوم</summary>
    <div className="mt-3 grid min-w-0 gap-4 sm:grid-cols-2">
      <section aria-label="بيانات العميل" className="min-w-0 space-y-3">
        {customer ? <><p className="text-xs text-slate-600">جهة اتصال منذ {date(customer.createdAt)}</p><p className={`text-xs font-bold ${customer.optedOutAt ? "text-rose-700" : "text-slate-600"}`}>{customer.optedOutAt ? "ألغى العميل الاشتراك؛ تبقى ضوابط الإرسال مطبقة." : "تخضع الرسائل للموافقة وصلاحية نافذة الخدمة."}</p></> : <p className="text-xs text-slate-500">لا توجد جهة اتصال محفوظة لهذا الرقم.</p>}
        {outcome && outcomes[outcome] ? <p role="status" className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">{outcomes[outcome]}</p> : null}
        <ul aria-label="وسوم العميل" className="flex flex-wrap gap-2">
          {customer?.tagMemberships.map(({ tag }) => <li key={tag.id} className="flex max-w-full items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700">
            <span className="min-w-0 break-words py-2">{tag.name}</span>
            {canManage ? <form action={updateWhatsAppConversationContactTagAction}>
              <input type="hidden" name="conversationId" value={conversationId}/>
              <input type="hidden" name="tagName" value={tag.name}/>
              <input type="hidden" name="mode" value="remove"/>
              <button type="submit" aria-label={`إزالة وسم ${tag.name}`} className="min-h-11 min-w-11 rounded-lg text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600">×</button>
            </form> : null}
          </li>)}
        </ul>
        {!customer?.tagMemberships.length ? <p className="text-xs text-slate-500">لا توجد وسوم مسجلة.</p> : null}
        {canManage ? <form action={updateWhatsAppConversationContactTagAction} className="flex flex-col gap-2 sm:flex-row">
          <input type="hidden" name="conversationId" value={conversationId}/>
          <input type="hidden" name="mode" value="add"/>
          <label className="sr-only" htmlFor="inbox-contact-tag">اسم الوسم</label>
          <input id="inbox-contact-tag" name="tagName" required maxLength={80} placeholder="أضف وسمًا لخدمة العميل" className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"/>
          <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-[#07181b] px-4 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600">إضافة الوسم</button>
        </form> : <p className="text-xs text-slate-500">تعديل الوسوم يحتاج صلاحية إدارة صندوق المحادثات.</p>}
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
