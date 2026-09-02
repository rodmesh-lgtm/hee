"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, CircleHelp, CreditCard, FileText, KeyRound, LayoutDashboard, MessageCircleMore, Palette, ShoppingBag, Users, Building2, type LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "PLATFORM", items: [{ href: "/admin", label: "نظرة عامة", icon: LayoutDashboard }, { href: "/admin/design", label: "التصميم والهوية", icon: Palette, badge: "NEW" }, { href: "/admin/businesses", label: "المنشآت", icon: Building2 }] },
  { label: "CUSTOMERS & REVENUE", items: [{ href: "/admin/customers", label: "العملاء والحسابات", icon: Users }, { href: "/admin/billing", label: "الاشتراكات والفوترة", icon: CreditCard }, { href: "/admin/access-codes", label: "أكواد الاشتراك", icon: KeyRound }] },
  { label: "COMMERCE", items: [{ href: "/admin/store-products", label: "منتجات المتجر", icon: Boxes }, { href: "/admin/store-orders", label: "طلبات المتجر", icon: ShoppingBag }, { href: "/admin/requests", label: "طلبات الإدارة", icon: FileText }] },
  { label: "OPERATIONS", items: [{ href: "/admin/whatsapp", label: "تشغيل واتساب", icon: MessageCircleMore }, { href: "/admin/support", label: "دعم العملاء", icon: CircleHelp }] },
];

function activeFor(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function Item({ href, label, icon: Icon, badge, compact = false }: NavItem & { compact?: boolean }) {
  const pathname = usePathname();
  const active = activeFor(pathname, href);
  return <Link href={href} aria-current={active ? "page" : undefined} className={`group flex items-center gap-2.5 rounded-xl font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae]/40 ${compact ? "min-h-10 px-3 text-[10px]" : "px-3 py-2.5 text-[12px]"} ${active ? "bg-[#07181b] text-white shadow-sm" : "text-slate-500 hover:bg-[#f1faf8] hover:text-slate-950"}`}>
    <Icon className={`h-[16px] w-[16px] shrink-0 ${active ? "text-[#6eead8]" : "text-slate-400 group-hover:text-[#009e95]"}`} />
    <span className="whitespace-nowrap">{label}</span>{badge ? <span className={`rounded-full px-2 py-0.5 text-[8px] font-black tracking-wider ${active ? "bg-white/10 text-[#8ff5e6]" : "bg-[#dffbf6] text-[#00877f]"}`}>{badge}</span> : null}
  </Link>;
}

export function AdminDesktopNavigation() {
  return <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="تنقل إدارة المنصة">{groups.map((group, index) => <section key={group.label} className={index ? "mt-5" : ""}><p className="px-3 pb-1.5 text-[8px] font-black tracking-[.17em] text-slate-300" dir="ltr">{group.label}</p><div className="space-y-0.5">{group.items.map((item) => <Item key={item.href} {...item} />)}</div></section>)}</nav>;
}

export function AdminMobileNavigation() {
  const mobileItems = groups.reduce<NavItem[]>((items, group) => items.concat(group.items), []);
  return <nav aria-label="تنقل الإدارة على الجوال" className="overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden"><div className="flex min-w-max gap-1">{mobileItems.map((item) => <Item key={item.href} {...item} compact />)}</div></nav>;
}
