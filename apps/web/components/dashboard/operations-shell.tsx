"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, PanelsTopLeft } from "lucide-react";
import { DashboardThemeToggle } from "./dashboard-theme-toggle";

const titles: Record<string, string> = {
  "/Laundromat": "نقطة البيع وإدارة المغسلة",
  "/Laundromat/Staff": "الفريق والصلاحيات",
  "/Laundromat/Notifications": "إشعارات الكاشير والعملاء",
  "/Laundromat/Accounting": "حسابات المنشأة",
  "/Laundromat/Operations": "العملاء والمخزون",
  "/Laundromat/Delivery": "إدارة التوصيل",
  "/Accounting": "البرنامج المحاسبي",
};
export function OperationsShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return <div data-dashboard-path={path} data-dashboard-theme="light" data-operations-shell dir="rtl">
    <header className="infro-operations-header">
      <Link href="/dashboard" className="infro-operations-brand"><span aria-hidden="true">iR</span><div><b>INFRO</b><small>{titles[path] ?? "مساحة الأعمال"}</small></div></Link>
      <nav aria-label="تنقل مساحة الأعمال"><Link href="/Accounting"><PanelsTopLeft size={17} aria-hidden="true" />البرنامج المحاسبي</Link><Link href="/dashboard"><ArrowRight size={17} aria-hidden="true" />لوحة التحكم</Link><DashboardThemeToggle showLabel /></nav>
    </header>
    {children}
  </div>;
}
