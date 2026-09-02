import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronLeft, LayoutDashboard, MessageCircle } from "lucide-react";
import { WhatsAppSectionNav } from "./_components/whatsapp-section-nav";

export default function WhatsAppLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-4">
    <div className="rounded-[22px] border border-slate-200 bg-white/95 px-4 py-3 shadow-[0_8px_30px_rgba(15,23,42,.04)] backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-400">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 hover:text-slate-900"><LayoutDashboard className="h-3.5 w-3.5" />لوحة التحكم</Link>
          <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
          <Link href="/dashboard/whatsapp" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[#008f87] transition hover:bg-[#effbf9]"><MessageCircle className="h-3.5 w-3.5" />مركز واتساب</Link>
        </nav>
        <Link href="/dashboard/whatsapp" className="inline-flex min-h-9 items-center gap-2 rounded-xl border border-[#bdebe5] bg-[#effbf9] px-3 text-[10px] font-black text-[#008f87] transition hover:border-[#8ddfd6] hover:bg-[#e5f8f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2">
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />العودة إلى المركز
        </Link>
      </div>
    </div>
    <WhatsAppSectionNav />
    {children}
  </div>;
}
