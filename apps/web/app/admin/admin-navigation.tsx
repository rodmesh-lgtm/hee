"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, CircleHelp, CreditCard, FileText, KeyRound, LayoutDashboard, MessageCircleMore, Palette, ShoppingBag, Users, Building2, ArrowUpLeft, MoreHorizontal, X, type LucideIcon } from "lucide-react";

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

const mobilePrimary: NavItem[] = [
  { href: "/admin", label: "القيادة", icon: LayoutDashboard },
  { href: "/admin/customers", label: "العملاء", icon: Users },
  { href: "/admin/requests", label: "الطلبات", icon: FileText },
  { href: "/admin/whatsapp", label: "واتساب", icon: MessageCircleMore },
];

export function AdminMobileNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  return <>
    <nav aria-label="التنقل السريع للإدارة" className="fixed inset-x-0 bottom-0 z-[70] border-t border-slate-200/80 bg-white/95 px-2 pt-2 shadow-[0_-18px_44px_-34px_rgba(7,24,27,.55)] backdrop-blur-xl lg:hidden" style={{paddingBottom:"max(env(safe-area-inset-bottom), .55rem)"}}>
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {mobilePrimary.map((item)=>{const Icon=item.icon;const active=activeFor(pathname,item.href);return <Link key={item.href} href={item.href} aria-current={active?"page":undefined} className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black transition ${active?"bg-[#07181b] text-white":"text-slate-500"}`}><Icon className={`h-4 w-4 ${active?"text-[#66e7d5]":"text-slate-400"}`}/><span>{item.label}</span></Link>})}
        <button type="button" onClick={()=>setOpen(true)} aria-expanded={open} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[9px] font-black text-slate-500"><MoreHorizontal className="h-4 w-4 text-slate-400"/><span>المزيد</span></button>
      </div>
    </nav>
    {open?<><button aria-label="إغلاق قائمة الإدارة" onClick={()=>setOpen(false)} className="fixed inset-0 z-[78] bg-[#061619]/40 backdrop-blur-[2px] lg:hidden"/><aside role="dialog" aria-modal="true" className="fixed inset-x-3 bottom-[calc(74px+env(safe-area-inset-bottom))] z-[80] max-h-[72dvh] overflow-y-auto rounded-[26px] border border-slate-200 bg-white p-4 shadow-[0_30px_80px_rgba(7,24,27,.24)] lg:hidden"><div className="mb-4 flex items-center justify-between"><div><p className="text-[8px] font-black tracking-[.16em] text-[#008f87]" dir="ltr">INFRO CONTROL</p><h2 className="mt-1 text-base font-black text-slate-950">كل أدوات الإدارة</h2></div><button type="button" onClick={()=>setOpen(false)} aria-label="إغلاق" className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600"><X className="h-4 w-4"/></button></div><div className="space-y-5">{groups.map(group=><section key={group.eyebrow}><div className="mb-2 flex items-center justify-between"><span className="text-[8px] font-black tracking-[.13em] text-slate-400" dir="ltr">{group.eyebrow}</span><span className="text-[9px] font-bold text-slate-400">{group.label}</span></div><div className="grid gap-2 sm:grid-cols-2">{group.items.map(item=>{const Icon=item.icon;const active=activeFor(pathname,item.href);return <Link key={item.href} href={item.href} onClick={()=>setOpen(false)} className={`flex min-h-12 items-center gap-3 rounded-2xl border px-3 text-xs font-black ${active?"border-[#9fe8df] bg-[#effbf9] text-[#075d58]":"border-slate-100 bg-[#fbfdfd] text-slate-700"}`}><span className={`grid h-9 w-9 place-items-center rounded-xl ${active?"bg-[#07181b] text-[#66e7d5]":"bg-white text-slate-400"}`}><Icon className="h-4 w-4"/></span><span className="flex-1">{item.label}</span>{item.badge?<span className="rounded-full bg-[#dffbf6] px-2 py-0.5 text-[7px] text-[#00877f]">{item.badge}</span>:null}</Link>})}</div></section>)}</div></aside></>:null}
  </>;
}
