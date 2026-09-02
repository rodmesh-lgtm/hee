"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, CircleHelp, CreditCard, FileText, KeyRound, LayoutDashboard, MessageCircleMore, Palette, ShoppingBag, Users, Building2, ArrowUpLeft, type LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: string };
type NavGroup = { label: string; eyebrow: string; items: NavItem[] };

const groups: NavGroup[] = [
  { label: "المنصة", eyebrow: "PLATFORM", items: [{ href: "/admin", label: "مركز القيادة", icon: LayoutDashboard }, { href: "/admin/design", label: "التصميم والهوية", icon: Palette, badge: "STUDIO" }, { href: "/admin/businesses", label: "المنشآت", icon: Building2 }] },
  { label: "العملاء والإيراد", eyebrow: "CUSTOMERS & REVENUE", items: [{ href: "/admin/customers", label: "العملاء والحسابات", icon: Users }, { href: "/admin/billing", label: "الاشتراكات والفوترة", icon: CreditCard }, { href: "/admin/access-codes", label: "أكواد الاشتراك", icon: KeyRound }] },
  { label: "التجارة", eyebrow: "COMMERCE", items: [{ href: "/admin/store-products", label: "منتجات المتجر", icon: Boxes }, { href: "/admin/store-orders", label: "طلبات المتجر", icon: ShoppingBag }, { href: "/admin/requests", label: "طلبات الإدارة", icon: FileText }] },
  { label: "التشغيل", eyebrow: "OPERATIONS", items: [{ href: "/admin/whatsapp", label: "تشغيل واتساب", icon: MessageCircleMore }, { href: "/admin/support", label: "دعم العملاء", icon: CircleHelp }] },
];

function activeFor(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function Item({ href, label, icon: Icon, badge, compact = false }: NavItem & { compact?: boolean }) {
  const pathname = usePathname();
  const active = activeFor(pathname, href);
  return <Link href={href} aria-current={active ? "page" : undefined} className={`group relative flex items-center gap-3 overflow-hidden rounded-[14px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#35e4cb]/50 ${compact ? "min-h-10 px-3 text-[10px]" : "min-h-[44px] px-3.5 text-[12px]"} ${active ? "bg-white/[.09] text-white shadow-[inset_0_0_0_1px_rgba(110,234,216,.12)]" : "text-slate-400 hover:bg-white/[.055] hover:text-white"}`}>
    {active ? <span className="absolute inset-y-2 right-0 w-[3px] rounded-l-full bg-[#35e4cb] shadow-[0_0_18px_rgba(53,228,203,.65)]" /> : null}
    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-[9px] transition ${active ? "bg-[#35e4cb]/12 text-[#6eead8]" : "bg-white/[.035] text-slate-500 group-hover:bg-white/[.07] group-hover:text-[#6eead8]"}`}><Icon className="h-[15px] w-[15px]" /></span>
    <span className="flex-1 whitespace-nowrap">{label}</span>
    {badge ? <span className={`rounded-full px-2 py-0.5 text-[7px] font-black tracking-[.12em] ${active ? "bg-[#35e4cb]/12 text-[#8ff5e6]" : "bg-white/[.05] text-slate-500"}`}>{badge}</span> : !compact && active ? <ArrowUpLeft className="h-3 w-3 text-[#35e4cb]" /> : null}
  </Link>;
}

export function AdminDesktopNavigation() {
  return <nav className="flex-1 overflow-y-auto px-3.5 py-4 [scrollbar-width:thin]" aria-label="تنقل إدارة المنصة">{groups.map((group, index) => <section key={group.eyebrow} className={index ? "mt-6" : ""}><div className="mb-2 flex items-center justify-between px-3"><p className="text-[8px] font-black tracking-[.18em] text-slate-600" dir="ltr">{group.eyebrow}</p><span className="text-[8px] font-bold text-slate-600">{group.label}</span></div><div className="space-y-1">{group.items.map((item) => <Item key={item.href} {...item} />)}</div></section>)}</nav>;
}

export function AdminMobileNavigation() {
  const mobileItems = groups.reduce<NavItem[]>((items, group) => items.concat(group.items), []);
  return <nav aria-label="تنقل الإدارة على الجوال" className="overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden"><div className="flex min-w-max gap-1">{mobileItems.map((item) => <Link key={item.href} href={item.href} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 text-[10px] font-black text-slate-600"><item.icon className="h-3.5 w-3.5"/>{item.label}</Link>)}</div></nav>;
}
