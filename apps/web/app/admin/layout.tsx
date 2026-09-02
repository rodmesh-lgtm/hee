import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, LogOut, Settings2, Sparkles } from "lucide-react";
import { adminLogoutAction } from "../actions/admin-auth";
import { requireAdmin } from "../lib/admin";
import { AdminDesktopNavigation, AdminMobileNavigation } from "./admin-navigation";

export const metadata: Metadata = { title: "إدارة INFRO", robots: { index: false, follow: false, noarchive: true, nocache: true } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <div dir="rtl" className="min-h-screen bg-[#f7f9fa] text-slate-950 selection:bg-[#bdf5ed] selection:text-[#063c3b]">
    <aside className="fixed inset-y-0 right-0 z-50 hidden w-[280px] border-l border-slate-200/80 bg-white lg:flex lg:flex-col">
      <div className="flex h-[76px] items-center gap-3 border-b border-slate-100 px-5">
        <div className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[13px] bg-[#07181b] shadow-[0_8px_24px_rgba(7,24,27,.12)]"><div className="absolute -left-2 -top-2 h-6 w-6 rounded-full bg-[#00d8c6]/40 blur-md"/><span className="relative text-lg font-black tracking-[-0.08em] text-[#35e4cb]">iR</span></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[17px] font-black tracking-tight">INFRO</span><span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[8px] font-black text-slate-400">CONTROL</span></div><p className="mt-0.5 text-[10px] font-semibold text-slate-400">Digital Operations Platform</p></div>
      </div>
      <AdminDesktopNavigation />
      <div className="border-t border-slate-100 p-3">
        <a href="https://ir.sa" target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"><ExternalLink className="h-4 w-4"/>فتح منصة العملاء</a>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-white text-xs font-black text-[#008f87] shadow-sm">RA</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black">مدير المنصة</p><p className="truncate text-[9px] font-medium text-slate-400">{admin.email}</p></div><form action={adminLogoutAction}><button aria-label="تسجيل الخروج" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4"/></button></form></div>
      </div>
    </aside>
    <div className="lg:mr-[280px]">
      <header className="sticky top-0 z-40 flex h-[64px] items-center border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3"><div className="lg:hidden"><span className="text-base font-black">INFRO</span><span className="mr-2 rounded-md border border-slate-200 px-1.5 py-0.5 text-[8px] font-black text-slate-400">CONTROL</span></div><div className="hidden items-center gap-2 text-[11px] font-semibold text-slate-400 lg:flex"><Sparkles className="h-4 w-4 text-[#00b9aa]"/><span>Control Center</span><span className="text-slate-200">/</span><span className="text-slate-700">إدارة المنصة</span></div></div>
        <div className="flex items-center gap-2"><Link href="/admin/design" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-black text-slate-600 shadow-sm transition hover:border-[#9fe8df] hover:text-[#008f87]"><Settings2 className="h-3.5 w-3.5"/>تخصيص الهوية</Link></div>
      </header>
      <AdminMobileNavigation />
      <main className="mx-auto w-full max-w-[1520px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  </div>;
}
