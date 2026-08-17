"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../../app/actions/auth";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { dashboardNavItems } from "./dashboard-nav";

type DashboardShellProps = { children: React.ReactNode; businessName: string; businessSlug: string | null; isPublished: boolean; showQaBadge?: boolean };

const pageTitles: Record<string, string> = {
  "/dashboard": "الرئيسية",
  "/dashboard/my-page": "صفحتي",
  "/dashboard/branding": "المظهر والباقات",
  "/dashboard/directory": "الفروع والتواصل",
  "/dashboard/page-builder": "محتوى الصفحة",
  "/dashboard/analytics": "الأداء",
  "/dashboard/tools": "أدوات HEE",
  "/dashboard/settings": "حسابي",
};

function getCurrentPageTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const found = Object.entries(pageTitles).filter(([path]) => path !== "/dashboard").find(([path]) => pathname.startsWith(`${path}/`));
  return found?.[1] ?? "لوحة التحكم";
}

const legacyLightCss = `
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-slate-950/70"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-slate-950/75"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-slate-900/60"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-slate-900"] { background-color:#fff!important; }
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-white/5"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-white/10"] { background-color:#faf8fd!important; }
[data-dashboard-path^="/dashboard/page-builder"] [class~="border-white/10"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="border-white/15"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="border-white/20"] { border-color:#e7e1ef!important; }
[data-dashboard-path^="/dashboard/page-builder"] [class~="text-slate-200"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="text-slate-300"] { color:#5f5666!important; }
[data-dashboard-path^="/dashboard/page-builder"] [class~="text-slate-400"] { color:#7b7280!important; }
[data-dashboard-path^="/dashboard/page-builder"] h1[class~="text-white"],
[data-dashboard-path^="/dashboard/page-builder"] h2[class~="text-white"],
[data-dashboard-path^="/dashboard/page-builder"] h3[class~="text-white"] { color:#1f2552!important; }
[data-dashboard-path^="/dashboard/page-builder"] [class~="text-indigo-100"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="text-indigo-200"] { color:#5b3fd6!important; }
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-indigo-500/20"],
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-indigo-500/15"] { background-color:#f1edff!important; }
[data-dashboard-path^="/dashboard/page-builder"] [class~="bg-indigo-600"] { background-color:#6f3bd2!important; color:#fff!important; }
[data-dashboard-path^="/dashboard/page-builder"] input,
[data-dashboard-path^="/dashboard/page-builder"] textarea,
[data-dashboard-path^="/dashboard/page-builder"] select { color:#252a4a!important; background-color:#fff!important; border-color:#ded8e8!important; }
[data-dashboard-path="/dashboard/directory"] [class~="bg-emerald-600"] { background-color:#6f3bd2!important; }
[data-dashboard-path="/dashboard/directory"] [class~="text-emerald-600"],
[data-dashboard-path="/dashboard/directory"] [class~="text-emerald-700"] { color:#6543ce!important; }
[data-dashboard-path="/dashboard/directory"] [class~="border-emerald-100"],
[data-dashboard-path="/dashboard/directory"] [class~="border-emerald-200"] { border-color:#ded7f1!important; }
[data-dashboard-path="/dashboard/directory"] [class~="bg-emerald-50"] { background-color:#f5f1ff!important; }
[data-dashboard-path="/dashboard/directory"] [class~="from-emerald-50"] { --tw-gradient-from:#f5f1ff var(--tw-gradient-from-position)!important; }
`;

export function DashboardShell({ children, businessName, businessSlug, isPublished, showQaBadge = false }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = getCurrentPageTitle(pathname);

  const nav = (mobile = false) => dashboardNavItems.map((item) => {
    const Icon = item.icon;
    const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return <Link key={item.href} href={item.href} onClick={mobile ? () => setMobileOpen(false) : undefined} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-4 text-sm font-bold transition", mobile ? "py-3" : "h-11", active ? "bg-[#f1edff] text-[#5b3fd6]" : "text-slate-600 hover:bg-[#f8f6fc] hover:text-[#1f2552]")}><Icon className="h-4 w-4" />{item.label}</Link>;
  });

  return (
    <div data-dashboard-path={pathname} className="min-h-screen bg-[#f8f9fd] text-slate-900">
      <style>{legacyLightCss}</style>
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] lg:grid lg:grid-cols-[minmax(0,1fr)_272px] lg:[direction:ltr]">
        <aside className="order-2 hidden border-l border-[#edf0fb] bg-white px-5 py-6 lg:flex lg:flex-col lg:[direction:rtl]">
          <Link href="/dashboard" className="mb-7 block"><div className="text-[28px] font-black tracking-[-.06em] text-[#6f3bd2]">HEE</div><p className="mt-1 text-xs font-semibold text-slate-500">هوية أعمال رقمية</p>{businessName ? <p className="mt-3 truncate text-xs font-bold text-[#1f2552]">{businessName}</p> : null}</Link>
          <nav className="space-y-1.5">{nav()}</nav>
          {businessSlug && isPublished ? <Link href={`/${businessSlug}`} target="_blank" className="mt-5 rounded-xl bg-[#faf8fd] px-4 py-3 text-center text-xs font-black text-[#6543ce]">فتح الصفحة العامة</Link> : null}
          <div className="mt-auto border-t border-[#edf0fb] pt-5"><form action={logoutAction}><button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e7eaf6] bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />تسجيل الخروج</button></form></div>
        </aside>

        <div className="order-1 relative min-w-0 lg:[direction:rtl]">
          <header className="sticky top-0 z-20 border-b border-[#edf0fb] bg-white/95 px-4 py-3 backdrop-blur lg:border-b-0 lg:bg-[#f8f9fd]/95 xl:px-7">
            <div className="flex items-center justify-between gap-3"><div className="min-w-0"><h1 className="truncate text-base font-black text-[#1f2552] sm:text-lg">{pageTitle}</h1>{showQaBadge ? <span className="mt-1 inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">وضع المعاينة QA</span> : null}</div><Button type="button" variant="secondary" size="sm" icon={mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} onClick={() => setMobileOpen((v) => !v)} className="border-[#e9e7fb] bg-white text-slate-700 lg:hidden">القائمة</Button></div>
          </header>
          <main className="min-w-0 p-4 sm:p-5 xl:p-6">{children}</main>
        </div>

        <aside className={cn("fixed inset-y-0 right-0 z-40 flex w-[86vw] max-w-[310px] flex-col border-l border-[#eceffc] bg-white p-4 shadow-[0_25px_60px_-35px_rgba(48,46,89,.55)] transition-transform duration-200 lg:hidden", mobileOpen ? "translate-x-0" : "translate-x-full")}>
          <div className="mb-5 flex items-center justify-between"><Link href="/dashboard" onClick={() => setMobileOpen(false)}><div className="text-[28px] font-black tracking-[-.06em] text-[#6f3bd2]">HEE</div><div className="text-xs text-slate-500">هوية أعمال رقمية</div></Link><button type="button" onClick={() => setMobileOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-[#eceffc] bg-white text-slate-600" aria-label="إغلاق القائمة"><X className="h-5 w-5" /></button></div>
          <nav className="space-y-1.5 overflow-y-auto pb-4">{nav(true)}</nav>
          <div className="mt-auto border-t border-[#eceffc] pt-4"><form action={logoutAction}><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#eceffc] bg-white px-4 py-3 text-sm font-bold text-slate-700"><LogOut className="h-4 w-4" />تسجيل الخروج</button></form></div>
        </aside>
        {mobileOpen ? <button type="button" aria-label="إغلاق خلفية القائمة" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-sm lg:hidden" /> : null}
      </div>
    </div>
  );
}
