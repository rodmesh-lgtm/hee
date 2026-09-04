import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, LogOut, Settings2, Sparkles, ShieldCheck, Command } from "lucide-react";
import { adminLogoutAction } from "../actions/admin-auth";
import { requireAdmin } from "../lib/admin";
import { IrLogo } from "../../components/brand/ir-logo";
import { DashboardThemeToggle } from "../../components/dashboard/dashboard-theme-toggle";
import { AdminDesktopNavigation, AdminMobileNavigation } from "./admin-navigation";
import "../dashboard/dashboard-theme.css";

export const metadata: Metadata = { title: "إدارة INFRO", robots: { index: false, follow: false, noarchive: true, nocache: true } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <div data-admin-shell dir="rtl" className="min-h-screen bg-[#f3f6f6] text-slate-950 selection:bg-[#bdf5ed] selection:text-[#063c3b]">
    <a href="#admin-main-content" className="fixed right-4 top-3 z-[100] -translate-y-24 rounded-xl bg-[#07181b] px-4 py-2 text-sm font-black text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2">الانتقال إلى المحتوى الرئيسي</a>
    <aside className="fixed inset-y-0 right-0 z-50 hidden w-[296px] overflow-hidden border-l border-white/[.06] bg-[#061619] text-white lg:flex lg:flex-col">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#00d8c6]/10 blur-3xl"/>
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#00b4d8]/7 blur-3xl"/>
      <div className="relative flex h-[88px] items-center border-b border-white/[.06] px-5">
        <IrLogo className="h-11 text-white" priority showTagline />
      </div>
      <div className="relative mx-4 mt-4 rounded-[18px] border border-white/[.07] bg-white/[.035] p-3.5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#35e4cb]/10 text-[#6eead8]"><Command className="h-4 w-4"/></span><div><p className="text-[9px] font-black tracking-[.13em] text-[#6eead8]" dir="ltr">CONTROL ROOM</p><p className="mt-1 text-[10px] font-semibold text-slate-400">إدارة المنصة والعمليات من مركز واحد</p></div></div></div>
      <AdminDesktopNavigation />
      <div className="relative border-t border-white/[.06] p-3.5">
        <div className="mb-2.5 flex items-center justify-between rounded-[13px] border border-white/[.07] bg-white/[.035] px-3 py-2"><span className="text-[9px] font-bold text-slate-400">مظهر INFRO</span><DashboardThemeToggle /></div>
        <a href="https://ir.sa" target="_blank" rel="noreferrer" className="mb-2.5 flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-[11px] font-bold text-slate-400 transition hover:bg-white/[.05] hover:text-white"><ExternalLink className="h-4 w-4 text-[#6eead8]"/>فتح منصة العملاء</a>
        <div className="flex items-center gap-3 rounded-[16px] border border-white/[.07] bg-white/[.035] p-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#35e4cb]/10 text-xs font-black text-[#6eead8]">RA</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-white">مدير المنصة</p><p className="truncate text-[8px] font-medium text-slate-500">{admin.email}</p></div><form action={adminLogoutAction}><button aria-label="تسجيل الخروج" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"><LogOut className="h-4 w-4"/></button></form></div>
      </div>
    </aside>
    <div className="lg:mr-[296px]">
      <header className="sticky top-0 z-40 flex min-h-[68px] items-center border-b border-slate-200/70 bg-[#f8fbfb]/90 px-3.5 py-2.5 backdrop-blur-xl sm:px-6 lg:h-[72px] lg:px-8 lg:py-0">
        <div className="flex min-w-0 flex-1 items-center gap-3"><div className="lg:hidden"><IrLogo className="h-9 text-slate-950" priority /></div><div className="hidden items-center gap-3 lg:flex"><span className="grid h-8 w-8 place-items-center rounded-xl border border-[#bdebe5] bg-white text-[#008f87]"><Sparkles className="h-3.5 w-3.5"/></span><div><p className="text-[8px] font-black tracking-[.16em] text-[#008f87]" dir="ltr">INFRO COMMAND LAYER</p><p className="mt-0.5 text-[11px] font-bold text-slate-600">مركز قيادة المنصة</p></div></div></div>
        <div className="flex shrink-0 items-center gap-2"><DashboardThemeToggle/><span className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[8px] font-black text-emerald-700 md:inline-flex"><ShieldCheck className="h-3 w-3"/>ADMIN SESSION</span><Link href="/admin/design" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[10px] font-black text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,.04)] transition hover:border-[#9fe8df] hover:text-[#008f87]"><Settings2 className="h-3.5 w-3.5"/><span className="hidden min-[420px]:inline">استوديو الهوية</span><span className="min-[420px]:hidden">الهوية</span></Link></div>
      </header>
      <AdminMobileNavigation />
      <main id="admin-main-content" tabIndex={-1} className="mx-auto w-full max-w-[1580px] px-3.5 py-4 pb-28 outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-4 sm:px-5 sm:py-6 sm:pb-28 lg:px-9 lg:py-9 lg:pb-9">{children}</main>
    </div>
  </div>;
}
