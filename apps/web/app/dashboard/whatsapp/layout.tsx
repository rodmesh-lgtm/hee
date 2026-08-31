import Link from "next/link";
import { ChevronLeft, MessageCircle } from "lucide-react";

export default function WhatsAppSectionLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <nav aria-label="التنقل داخل تسويق واتساب" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/dashboard" className="rounded-lg px-2 py-1.5 font-bold transition hover:bg-slate-50 hover:text-[#5d49cc]">لوحة التحكم</Link>
          <ChevronLeft className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
          <Link href="/dashboard/whatsapp" className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-black text-[#5d49cc] transition hover:bg-[#f5f1ff]">
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            تسويق واتساب
          </Link>
        </div>
        <Link href="/dashboard/whatsapp" className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-[#ddd5fb] bg-[#f8f6ff] px-3 text-xs font-black text-[#5d49cc] transition hover:border-[#bfb0f4] hover:bg-[#f1edff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f3bd2] focus-visible:ring-offset-2">
          <span>العودة لمركز واتساب</span>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Link>
      </nav>
      {children}
    </div>
  );
}
