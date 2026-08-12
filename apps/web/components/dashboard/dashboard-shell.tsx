"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "../../app/actions/auth";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { dashboardNavItems } from "./dashboard-nav";

type DashboardShellProps = {
  children: React.ReactNode;
  businessName: string;
  businessSlug: string | null;
  isPublished: boolean;
  showQaBadge?: boolean;
};

const pageTitles: Record<string, string> = {
  "/dashboard/my-page": "صفحتي",
  "/dashboard/page-builder": "البناء الكامل",
  "/dashboard/analytics": "الأداء",
  "/dashboard/tools": "أدوات HEE",
  "/dashboard/settings": "حسابي",
};

function getCurrentPageTitle(pathname: string) {
  const exact = pageTitles[pathname];
  if (exact) {
    return exact;
  }

  const found = Object.entries(pageTitles).find(([path]) => pathname.startsWith(`${path}/`));
  return found?.[1] ?? "لوحة التحكم";
}

export function DashboardShell({ children, businessName: _businessName, businessSlug: _businessSlug, isPublished: _isPublished, showQaBadge = false }: DashboardShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = getCurrentPageTitle(pathname);

  return (
    <div className="min-h-screen bg-[#f8f9fd] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-[1680px] lg:grid lg:grid-cols-[minmax(0,1fr)_272px] lg:[direction:ltr]">
        <aside className="order-2 hidden border-l border-[#edf0fb] bg-white px-5 py-6 lg:flex lg:flex-col lg:[direction:rtl]">
          <div className="mb-7">
            <div className="text-2xl font-black tracking-tight text-[#1f2552]">HEE</div>
            <p className="mt-1 text-sm text-slate-500">صفحة أعمالك الذكية</p>
          </div>

          <nav className="space-y-2">
            {dashboardNavItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6f5cf6]",
                    active
                      ? "bg-[#f2efff] text-[#4c3fd9]"
                      : "text-slate-600 hover:bg-[#f7f8ff] hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[#edf0fb] pt-5">
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#e7eaf6] bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </form>
          </div>
        </aside>

        <div className="order-1 relative min-w-0 lg:[direction:rtl]">
          <header className="sticky top-0 z-20 border-b border-[#edf0fb] bg-white/95 px-4 py-3 backdrop-blur xl:px-7 lg:border-b-0 lg:bg-transparent lg:py-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 lg:opacity-0 lg:pointer-events-none">
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                  <h1 className="truncate text-base font-black text-[#1f2552] sm:text-lg">{pageTitle}</h1>
                  {showQaBadge ? <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700">وضع المعاينة QA</span> : null}
                </div>
              </div>

              <div className="flex items-center gap-2 lg:hidden">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                  onClick={() => setMobileOpen((value) => !value)}
                  className="border-[#e9e7fb] bg-white text-slate-700"
                >
                  القائمة
                </Button>
              </div>
            </div>
          </header>

          <main className="min-w-0 p-4 sm:p-5 xl:p-6">{children}</main>
        </div>

        <aside
          className={cn(
            "fixed inset-y-0 right-0 z-40 flex w-[86vw] max-w-[310px] flex-col border-l border-[#eceffc] bg-white p-4 shadow-[0_25px_60px_-35px_rgba(48,46,89,0.55)] transition-transform duration-200 lg:hidden",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="text-2xl font-black tracking-tight text-[#1f2552]">HEE</div>
              <div className="mt-1 text-sm text-slate-500">صفحة أعمالك الذكية</div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eceffc] bg-white text-slate-600"
              aria-label="إغلاق القائمة"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="space-y-2 overflow-y-auto pb-4">
            {dashboardNavItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition",
                    active
                      ? "bg-[#f2efff] text-[#4c3fd9]"
                      : "text-slate-600 hover:bg-[#f8f7ff] hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-[#eceffc] pt-4">
            <form action={logoutAction}>
              <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#eceffc] bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
                <LogOut className="h-4 w-4" />
                تسجيل الخروج
              </button>
            </form>
          </div>
        </aside>

        {mobileOpen ? (
          <button
            type="button"
            aria-label="إغلاق خلفية القائمة"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          />
        ) : null}
      </div>
    </div>
  );
}
