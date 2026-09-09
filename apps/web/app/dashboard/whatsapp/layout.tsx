import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, LayoutDashboard, MessageCircle } from "lucide-react";
import { WhatsAppSectionNav } from "./_components/whatsapp-section-nav";

export default function WhatsAppLayout({ children }: { children: ReactNode }) {
  return <div className="space-y-4">
    <div className="rounded-[20px] border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,.035)] backdrop-blur sm:px-4">
      <nav aria-label="مسار التنقل" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] font-bold text-slate-400">
        <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-1"><LayoutDashboard className="h-3.5 w-3.5" />لوحة التحكم</Link>
        <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
        <Link href="/dashboard/whatsapp" aria-current="location" className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[#008f87] transition hover:bg-[#effbf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-1"><MessageCircle className="h-3.5 w-3.5 shrink-0" /><span className="truncate">مركز واتساب</span></Link>
      </nav>
    </div>
    <WhatsAppSectionNav />
    {children}
  </div>;
}
