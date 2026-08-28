import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCheck, Clock3, Inbox, MessageCircle, Search, Send, UserRound } from "lucide-react";
import { getOwnedBusinessForRead } from "../../../lib/ownership";
import { getWhatsAppInbox } from "../../../lib/whatsapp/inbox";

type SearchParams = Promise<{ conversation?: string | string[]; q?: string | string[] }>;
const value = (input?: string | string[]) => Array.isArray(input) ? input[0] : input;
const formatDate = (input: Date | null) => input ? new Intl.DateTimeFormat("ar-SA", { timeZone: "Asia/Riyadh", dateStyle: "short", timeStyle: "short" }).format(input) : "—";
const statusLabel: Record<string, string> = { received: "واردة", queued: "في الانتظار", sent: "مرسلة", delivered: "تم التسليم", read: "مقروءة", failed: "فشلت" };
const typeLabel: Record<string, string> = { text: "رسالة نصية", template: "قالب", image: "صورة", video: "فيديو", audio: "صوت", document: "ملف", location: "موقع", contacts: "جهة اتصال", interactive: "تفاعلية", sticker: "ملصق", unknown: "رسالة" };

function messagePreview(message: { textBody: string | null; messageType: string; direction: string } | undefined) {
  if (!message) return "لا توجد رسالة محفوظة";
  const body = message.textBody?.trim();
  return `${message.direction === "outbound" ? "أنت: " : ""}${body || typeLabel[message.messageType] || "رسالة"}`;
}

export default async function WhatsAppInboxPage({ searchParams }: { searchParams: SearchParams }) {
  const business = await getOwnedBusinessForRead();
  if (!business) redirect("/onboarding");
  const params = await searchParams;
  const inbox = await getWhatsAppInbox({
    businessId: business.id,
    selectedConversationId: value(params.conversation),
    query: value(params.q),
  });

  return <div className="space-y-4 pb-4">
    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><MessageCircle className="h-5 w-5" /></span><div><h1 className="text-xl font-black text-[#20264f]">صندوق واتساب</h1><p className="mt-1 text-sm text-slate-500">المحادثات الواردة والصادرة عبر WhatsApp Business Platform الرسمي.</p></div></div></div><span className="rounded-full bg-[#f3efff] px-3 py-1.5 text-xs font-black text-[#5d49cc]">{inbox.conversations.length} محادثة حديثة</span></div>
    </section>

    <section className="grid min-h-[620px] overflow-hidden rounded-[24px] border border-[#e7e9f4] bg-white lg:grid-cols-[340px_minmax(0,1fr)] lg:[direction:ltr]">
      <aside className="border-b border-[#eceaf3] bg-[#fcfbfe] lg:border-b-0 lg:border-r lg:[direction:rtl]">
        <form className="border-b border-[#eceaf3] p-3" action="/dashboard/whatsapp/inbox">
          <label className="relative block"><Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={inbox.query} maxLength={64} placeholder="بحث بالاسم أو الرقم" className="h-11 w-full rounded-xl border border-[#e5e3ec] bg-white pr-10 pl-3 text-sm outline-none focus:border-[#8b72dc]" /></label>
        </form>
        <div className="max-h-[558px] overflow-y-auto">
          {inbox.conversations.length ? inbox.conversations.map((conversation) => {
            const active = inbox.selected?.id === conversation.id;
            const href = `/dashboard/whatsapp/inbox?conversation=${encodeURIComponent(conversation.id)}${inbox.query ? `&q=${encodeURIComponent(inbox.query)}` : ""}`;
            return <Link key={conversation.id} href={href} className={`block border-b border-[#f0eef5] p-3.5 transition ${active ? "bg-[#f2efff]" : "hover:bg-[#f8f6fc]"}`}><div className="flex items-start gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${active ? "bg-[#6f3bd2] text-white" : "bg-white text-slate-500"}`}><UserRound className="h-4.5 w-4.5" /></span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><b className="truncate text-sm text-[#20264f]">{conversation.customerDisplayName || conversation.customerPhoneE164}</b><span className="shrink-0 text-[9px] text-slate-400">{formatDate(conversation.lastMessageAt)}</span></div><span dir="ltr" className="mt-0.5 block text-right text-[10px] text-slate-400">{conversation.customerPhoneE164}</span><p className="mt-1 truncate text-xs text-slate-500">{messagePreview(conversation.messages[0])}</p></div></div></Link>;
          }) : <div className="px-5 py-12 text-center"><Inbox className="mx-auto h-8 w-8 text-slate-300" /><b className="mt-3 block text-sm text-[#303653]">لا توجد محادثات</b><p className="mt-1 text-xs leading-6 text-slate-500">ستظهر الرسائل بعد وصول Webhook موثّق من Meta.</p></div>}
        </div>
      </aside>

      <div className="flex min-w-0 flex-col lg:[direction:rtl]">
        {inbox.selected ? <><header className="border-b border-[#eceaf3] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><b className="block text-sm text-[#20264f]">{inbox.selected.customerDisplayName || "عميل واتساب"}</b><span dir="ltr" className="mt-1 block text-right text-xs text-slate-400">{inbox.selected.customerPhoneE164}</span></div>{inbox.selected.serviceWindow.open ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700"><Clock3 className="h-3.5 w-3.5" />نافذة الرد مفتوحة حتى {formatDate(inbox.selected.serviceWindow.closesAt)}</span> : <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-black text-amber-700"><AlertTriangle className="h-3.5 w-3.5" />تتطلب رسالة قالب معتمد</span>}</div></header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8f9fd] p-4 sm:p-5">
            {inbox.selected.messages.length ? inbox.selected.messages.map((message) => {
              const outbound = message.direction === "outbound";
              return <article key={message.id} className={`flex ${outbound ? "justify-start" : "justify-end"}`}><div className={`max-w-[85%] rounded-[20px] px-4 py-3 shadow-sm sm:max-w-[72%] ${outbound ? "rounded-bl-md bg-[#6f3bd2] text-white" : "rounded-br-md border border-[#e8e6ef] bg-white text-[#20264f]"}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.textBody || typeLabel[message.messageType] || "رسالة غير نصية"}</p><div className={`mt-2 flex items-center gap-1.5 text-[9px] ${outbound ? "text-white/70" : "text-slate-400"}`}><span>{formatDate(message.providerTimestamp ?? message.createdAt)}</span><span>·</span><span>{statusLabel[message.status] || message.status}</span>{outbound && ["delivered", "read"].includes(message.status) ? <CheckCheck className={`h-3 w-3 ${message.status === "read" ? "text-cyan-200" : ""}`} /> : null}</div>{message.status === "failed" ? <p className={`mt-2 text-[10px] ${outbound ? "text-rose-100" : "text-rose-600"}`}>تعذر الإرسال{message.errorCode ? ` (${message.errorCode})` : ""}</p> : null}</div></article>;
            }) : <div className="grid h-full place-items-center text-center"><div><MessageCircle className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-2 text-xs text-slate-500">لا توجد رسائل محفوظة.</p></div></div>}
          </div>
          <footer className="border-t border-[#eceaf3] bg-white p-3"><div className="flex items-center gap-2 rounded-2xl border border-dashed border-[#dcd8ea] bg-[#faf9fd] p-3 text-xs text-slate-500"><Send className="h-4 w-4 shrink-0 text-[#6f3bd2]" /><span>{inbox.selected.serviceWindow.open ? "عرض المحادثة جاهز. سيُفعّل الرد بعد ربطه بطابور إرسال durable في الجولة التالية." : "انتهت نافذة خدمة العميل؛ لا يجوز إرسال نص حر. يجب استخدام قالب Meta معتمد."}</span></div></footer></> : <div className="grid min-h-[620px] place-items-center p-8 text-center"><div><MessageCircle className="mx-auto h-10 w-10 text-slate-300" /><b className="mt-3 block text-sm text-[#303653]">اختر محادثة</b><p className="mt-1 text-xs text-slate-500">اختر عميلًا من القائمة لعرض الرسائل.</p></div></div>}
      </div>
    </section>
  </div>;
}
