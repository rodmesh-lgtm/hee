import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ExternalLink, LogOut, Settings2, Sparkles, ShieldCheck, Command } from "lucide-react";
import { adminLogoutAction } from "../actions/admin-auth";
import { requireAdmin } from "../lib/admin";
import { AdminDesktopNavigation, AdminMobileNavigation } from "./admin-navigation";

export const metadata: Metadata = { title: "إدارة INFRO", robots: { index: false, follow: false, noarchive: true, nocache: true } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return <div dir="rtl" className="min-h-screen bg-[#f3f6f6] text-slate-950 selection:bg-[#bdf5ed] selection:text-[#063c3b]">
    <aside className="fixed inset-y-0 right-0 z-50 hidden w-[296px] overflow-hidden border-l border-white/[.06] bg-[#061619] text-white lg:flex lg:flex-col">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#00d8c6]/10 blur-3xl"/>
      <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-[#00b4d8]/7 blur-3xl"/>
      <div className="relative flex h-[88px] items-center gap-3.5 border-b border-white/[.06] px-5">
        <div className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-[15px] border border-[#6eead8]/15 bg-[#0a2528] shadow-[0_12px_32px_rgba(0,0,0,.22)]"><div className="absolute -left-2 -top-2 h-7 w-7 rounded-full bg-[#00d8c6]/30 blur-md"/><span className="relative text-lg font-black tracking-[-0.08em] text-[#6eead8]">iR</span></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[18px] font-black tracking-tight">INFRO</span><span className="rounded-md border border-[#6eead8]/15 bg-[#35e4cb]/5 px-1.5 py-0.5 text-[7px] font-black tracking-[.12em] text-[#8ff5e6]">CONTROL</span></div><p className="mt-1 text-[9px] font-semibold tracking-[.08em] text-slate-500" dir="ltr">DIGITAL OPERATIONS OS</p></div>
      </div>
      <div className="relative mx-4 mt-4 rounded-[18px] border border-white/[.07] bg-white/[.035] p-3.5"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[#35e4cb]/10 text-[#6eead8]"><Command className="h-4 w-4"/></span><div><p className="text-[9px] font-black tracking-[.13em] text-[#6eead8]" dir="ltr">CONTROL ROOM</p><p className="mt-1 text-[10px] font-semibold text-slate-400">إدارة المنصة والعمليات من مركز واحد</p></div></div></div>
      <AdminDesktopNavigation />
      <div className="relative border-t border-white/[.06] p-3.5">
        <a href="https://ir.sa" target="_blank" rel="noreferrer" className="mb-2.5 flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-[11px] font-bold text-slate-400 transition hover:bg-white/[.05] hover:text-white"><ExternalLink className="h-4 w-4 text-[#6eead8]"/>فتح منصة العملاء</a>
        <div className="flex items-center gap-3 rounded-[16px] border border-white/[.07] bg-white/[.035] p-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] bg-[#35e4cb]/10 text-xs font-black text-[#6eead8]">RA</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black text-white">مدير المنصة</p><p className="truncate text-[8px] font-medium text-slate-500">{admin.email}</p></div><form action={adminLogoutAction}><button aria-label="تسجيل الخروج" className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"><LogOut className="h-4 w-4"/></button></form></div>
      </div>
    </aside>
    <div className="lg:mr-[296px]">
      <header className="sticky top-0 z-40 flex h-[72px] items-center border-b border-slate-200/70 bg-[#f8fbfb]/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3"><div className="lg:hidden"><span className="text-base font-black">INFRO</span><span className="mr-2 rounded-md border border-slate-200 px-1.5 py-0.5 text-[8px] font-black text-slate-400">CONTROL</span></div><div className="hidden items-center gap-3 lg:flex"><span className="grid h-8 w-8 place-items-center rounded-xl border border-[#bdebe5] bg-white text-[#008f87]"><Sparkles className="h-3.5 w-3.5"/></span><div><p className="text-[8px] font-black tracking-[.16em] text-[#008f87]" dir="ltr">INFRO COMMAND LAYER</p><p className="mt-0.5 text-[11px] font-bold text-slate-600">مركز قيادة المنصة</p></div></div></div>
        <div className="flex items-center gap-2"><span className="hidden items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1.5 text-[8px] font-black text-emerald-700 sm:inline-flex"><ShieldCheck className="h-3 w-3"/>ADMIN SESSION</span><Link href="/admin/design" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[10px] font-black text-slate-700 shadow-[0_4px_14px_rgba(15,23,42,.04)] transition hover:border-[#9fe8df] hover:text-[#008f87]"><Settings2 className="h-3.5 w-3.5"/>استوديو الهوية</Link></div>
      </header>
      <AdminMobileNavigation />
      <main className="mx-auto w-full max-w-[1580px] px-4 py-6 sm:px-6 lg:px-9 lg:py-9">{children}</main>
    </div>
  </div>;
}
