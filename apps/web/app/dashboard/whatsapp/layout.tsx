import Link from "next/link";
import { ArrowRight, ChevronLeft, LayoutDashboard, MessageCircle } from "lucide-react";
import { WhatsAppSectionNav } from "./_components/whatsapp-section-nav";

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return <div className="space-y-4">
    <div className="rounded-[22px] border bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-500">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 hover:text-[#20264f]"><LayoutDashboard className="h-3.5 w-3.5" />لوحة التحكم</Link>
          <ChevronLeft className="h-3.5 w-3.5 text-slate-300" />
          <Link href="/dashboard/whatsapp" className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[#6543ce] transition hover:bg-[#f6f3ff]"><MessageCircle className="h-3.5 w-3.5" />تسويق واتساب</Link>
        </nav>
        <Link href="/dashboard/whatsapp" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ddd6fe] bg-[#faf9ff] px-3 text-xs font-black text-[#5d49cc] transition hover:border-[#b9a9f4] hover:bg-[#f2eeff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f3bd2] focus-visible:ring-offset-2">
          <ArrowRight className="h-4 w-4" aria-hidden="true" />العودة إلى مركز واتساب
        </Link>
      </div>
    </div>
    <WhatsAppSectionNav />
    {children}
  </div>;
}
