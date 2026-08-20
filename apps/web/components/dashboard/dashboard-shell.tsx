"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../../app/actions/auth";
import { switchActiveBusinessAction } from "../../app/actions/active-business";
import { Building2, ExternalLink, LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { dashboardNavItems } from "./dashboard-nav";

type BusinessOption = { id: string; name: string; slug: string };
type DashboardShellProps = { children: React.ReactNode; businessId: string | null; businessName: string; businessSlug: string | null; isPublished: boolean; businesses: BusinessOption[]; showQaBadge?: boolean; showAdminLink?: boolean };

const pageTitles: Record<string, string> = {
  "/dashboard": "الرئيسية",
  "/dashboard/my-page": "صفحتي",
  "/dashboard/inbox": "الطلبات والحجوزات",
  "/dashboard/branding": "المظهر",
  "/dashboard/directory": "الفروع والفريق",
  "/dashboard/services": "الخدمات",
  "/dashboard/working-hours": "ساعات العمل",
  "/dashboard/analytics": "الأداء",
  "/dashboard/settings": "الحساب والباقات",
};

function getCurrentPageTitle(pathname: string) {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const found = Object.entries(pageTitles).filter(([path]) => path !== "/dashboard").find(([path]) => pathname.startsWith(`${path}/`));
  return found?.[1] ?? "لوحة التحكم";
}

function BusinessSwitcher({ businesses, businessId, compact = false }: { businesses: BusinessOption[]; businessId: string | null; compact?: boolean }) {
  if (businesses.length <= 1) return null;
  return (
    <form action={switchActiveBusinessAction} className={cn("rounded-xl border border-[#e7e3f0] bg-[#faf9fd] p-2", compact ? "mb-4" : "mb-4") }>
      <label className="mb-1 flex items-center gap-1.5 text-[10px] font-black text-slate-500"><Building2 className="h-3.5 w-3.5" />المنشأة النشطة</label>
      <div className="flex gap-2">
        <select name="businessId" defaultValue={businessId ?? ""} className="min-w-0 flex-1 rounded-lg border border-[#e1ddec] bg-white px-2 py-2 text-xs font-bold text-[#1f2552]" aria-label="اختيار المنشأة">
          {businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-[#6f3bd2] px-3 text-[11px] font-black text-white">تبديل</button>
      </div>
    </form>
  );
}

export function DashboardShell({ children, businessId, businessName, businessSlug, isPublished, businesses, showQaBadge = false, showAdminLink = false }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = getCurrentPageTitle(pathname);

  const nav = (mobile = false) => dashboardNavItems.map((item) => {
    const Icon = item.icon;
    const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return <Link key={item.href} href={item.href} onClick={mobile ? () => setMobileOpen(false) : undefined} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-xl px-4 text-sm font-bold transition", mobile ? "py-3" : "h-11", active ? "bg-[#f1edff] text-[#5b3fd6]" : "text-slate-600 hover:bg-[#f8f6fc] hover:text-[#1f2552]")}><Icon className="h-4 w-4" />{item.label}</Link>;
  });

  return (
    <div data-dashboard-path={pathname} data-active-business={businessId ?? ""} className="min-h-screen bg-[#f8f9fd] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] lg:grid lg:grid-cols-[minmax(0,1fr)_252px] lg:[direction:ltr]">
        <aside className="order-2 hidden border-l border-[#edf0fb] bg-white px-4 py-6 lg:flex lg:flex-col lg:[direction:rtl]">
          <Link href="/dashboard" className="mb-4 block px-2"><div className="text-[28px] font-black tracking-[-.06em] text-[#6f3bd2]">HEE</div><p className="mt-1 text-xs font-semibold text-slate-500">هوية أعمال رقمية</p>{businessName ? <p className="mt-3 truncate text-xs font-bold text-[#1f2552]">{businessName}</p> : null}</Link>
          <BusinessSwitcher businesses={businesses} businessId={businessId} />
          <nav className="space-y-1">{nav()}</nav>
          {businessSlug ? <Link href={isPublished ? `/${businessSlug}` : "/preview"} target="_blank" className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5f1ff] px-4 py-3 text-center text-xs font-black text-[#6543ce]"><ExternalLink className="h-3.5 w-3.5" />{isPublished ? "فتح الصفحة" : "معاينة الصفحة"}</Link> : null}
          {showAdminLink ? <Link href="/admin" className="mt-2 inline-flex items-center justify-center gap-2 rounded-xl border border-[#ddd5fb] bg-white px-4 py-3 text-center text-xs font-black text-[#5d49cc]"><ShieldCheck className="h-3.5 w-3.5" />إدارة المنصة</Link> : null}
          <div className="mt-auto border-t border-[#edf0fb] pt-5"><form action={logoutAction}><button type="submit" className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e7eaf6] bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" />تسجيل الخروج</button></form></div>
        </aside>

        <div className="order-1 relative min-w-0 lg:[direction:rtl]">
          <header className="sticky top-0 z-20 border-b border-[#edf0fb] bg-white/95 px-4 py-3 backdrop-blur lg:border-b-0 lg:bg-[#f8f9fd]/95 xl:px-7">
            <div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="truncate text-base font-black text-[#1f2552] sm:text-lg">{pageTitle}</div>{showQaBadge ? <span className="mt-1 inline-flex rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700">وضع المعاينة QA</span> : null}</div><Button type="button" variant="secondary" size="sm" icon={mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />} onClick={() => setMobileOpen((v) => !v)} className="border-[#e9e7fb] bg-white text-slate-700 lg:hidden">القائمة</Button></div>
          </header>
          <main className="min-w-0 p-4 sm:p-5 xl:p-6">{children}</main>
        </div>

        <aside className={cn("fixed inset-y-0 right-0 z-40 flex w-[86vw] max-w-[300px] flex-col border-l border-[#eceffc] bg-white p-4 shadow-[0_25px_60px_-35px_rgba(48,46,89,.55)] transition-transform duration-200 lg:hidden", mobileOpen ? "translate-x-0" : "translate-x-full")}>
          <div className="mb-5 flex items-center justify-between"><Link href="/dashboard" onClick={() => setMobileOpen(false)}><div className="text-[28px] font-black tracking-[-.06em] text-[#6f3bd2]">HEE</div><div className="text-xs text-slate-500">هوية أعمال رقمية</div></Link><button type="button" onClick={() => setMobileOpen(false)} className="grid h-10 w-10 place-items-center rounded-2xl border border-[#eceffc] bg-white text-slate-600" aria-label="إغلاق القائمة"><X className="h-5 w-5" /></button></div>
          <BusinessSwitcher businesses={businesses} businessId={businessId} compact />
          {businessSlug ? <Link href={isPublished ? `/${businessSlug}` : "/preview"} target="_blank" onClick={() => setMobileOpen(false)} className="mb-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#f5f1ff] px-4 py-3 text-sm font-black text-[#6543ce]"><ExternalLink className="h-4 w-4" />معاينة صفحتي</Link> : null}
          {showAdminLink ? <Link href="/admin" onClick={() => setMobileOpen(false)} className="mb-3 inline-flex items-center justify-center gap-2 rounded-xl border border-[#ddd5fb] bg-white px-4 py-3 text-sm font-black text-[#5d49cc]"><ShieldCheck className="h-4 w-4" />إدارة المنصة</Link> : null}
          <nav className="space-y-1 overflow-y-auto pb-4">{nav(true)}</nav>
          <div className="mt-auto border-t border-[#eceffc] pt-4"><form action={logoutAction}><button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#eceffc] bg-white px-4 py-3 text-sm font-bold text-slate-700"><LogOut className="h-4 w-4" />تسجيل الخروج</button></form></div>
        </aside>
        {mobileOpen ? <button type="button" aria-label="إغلاق خلفية القائمة" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-sm lg:hidden" /> : null}
      </div>
    </div>
  );
}
