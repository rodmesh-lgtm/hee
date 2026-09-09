import Link from "next/link";
import { Inbox, ListChecks } from "lucide-react";

export default function WhatsAppInboxLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-w-0 space-y-3">
    <nav aria-label="مساحة خدمة العملاء" className="flex min-w-0 flex-wrap gap-2 rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_12px_30px_-26px_rgba(7,24,27,.35)]">
      <Link href="/dashboard/whatsapp/inbox" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-[10px] font-black text-slate-600 transition hover:bg-slate-50 hover:text-[#008f87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae]">
        <Inbox className="h-4 w-4" aria-hidden="true" />صندوق المحادثات
      </Link>
      <Link href="/dashboard/whatsapp/inbox/operations" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#e9fbf8] px-3 text-[10px] font-black text-[#007d75] transition hover:bg-[#dff8f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae]">
        <ListChecks className="h-4 w-4" aria-hidden="true" />لوحة الفرز والمتابعة
      </Link>
    </nav>
    {children}
  </div>;
}
