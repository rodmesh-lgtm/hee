"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, ContactRound, FileText, Inbox, LayoutDashboard, Link2, Megaphone, Plug, ShieldCheck, ShoppingCart, Workflow, BookOpen, ShieldBan, ListFilter, SlidersHorizontal, Clock3, Headphones, CreditCard, Monitor } from "lucide-react";
const groups = [
  { label: "الجمهور والحملات", items: [
    ["/dashboard/whatsapp", "نظرة عامة", LayoutDashboard], ["/dashboard/whatsapp/contacts", "جهات الاتصال", ContactRound],
    ["/dashboard/whatsapp/templates", "القوالب", FileText], ["/dashboard/whatsapp/carousel", "كاروسيل المنتجات", ShoppingCart], ["/dashboard/whatsapp/campaigns", "الحملات", Megaphone], ["/dashboard/whatsapp/insights", "الأداء", BarChart3],
  ] },
  { label: "الرسائل وخدمة العملاء", items: [
    ["/dashboard/whatsapp/messages", "سجل الرسائل", ListFilter], ["/dashboard/whatsapp/inbox", "المحادثات", Inbox],
    ["/dashboard/whatsapp/inbox/operations", "الفرز والمتابعة", Headphones], ["/dashboard/whatsapp/blacklist", "منع الإرسال", ShieldBan],
  ] },
  { label: "الأتمتة والمتاجر", items: [
    ["/dashboard/whatsapp/automations", "الأتمتة", Workflow], ["/dashboard/whatsapp/bots", "بوت المحادثات", Headphones], ["/dashboard/whatsapp/ai", "مركز الذكاء الاصطناعي", BarChart3], ["/dashboard/whatsapp/carts", "السلال المتروكة", ShoppingCart],
    ["/dashboard/whatsapp/integrations", "التكاملات", Plug], ["/dashboard/whatsapp/links", "الروابط المختصرة", Link2], ["/dashboard/reminders", "التذكيرات", Clock3],
  ] },
  { label: "التشغيل والمساعدة", items: [
    ["/dashboard/whatsapp/tools", "جميع الأدوات", SlidersHorizontal], ["/dashboard/whatsapp/setup", "ربط واتساب", Link2], ["/dashboard/whatsapp/audit", "سجل التدقيق", ShieldCheck],
    ["/dashboard/whatsapp/guides", "الشروحات", BookOpen], ["/dashboard/settings/sessions", "جلسات الدخول", Monitor], ["/dashboard/billing/manage", "الفوترة", CreditCard],
  ] },
] as const;
export function WhatsAppSectionNav() {
  const pathname = usePathname();
  const [selected, setSelected] = useState<number | null>(null);
  const active = (href: string) => pathname === href || (href !== "/dashboard/whatsapp" && pathname.startsWith(href + "/") && !groups.some(group => group.items.some(item => item[0] !== href && item[0].startsWith(href + "/") && pathname.startsWith(item[0]))));
  const currentGroup = groups.findIndex(group => group.items.some(([href]) => active(href)));
  const visibleGroup = selected ?? Math.max(0, currentGroup);
  return <nav aria-label="أقسام تسويق واتساب" className="wa-navigation"><div className="wa-nav-groups" role="group" aria-label="مجموعات أدوات واتساب">{groups.map((group, index) => <button key={group.label} type="button" aria-pressed={visibleGroup === index} onClick={() => setSelected(index)}>{group.label}{currentGroup === index ? <span className="wa-nav-dot" aria-hidden="true"/> : null}</button>)}</div><div className="wa-nav-links">{groups[visibleGroup].items.map(([href, label, Icon]) => <Link key={href} href={href} onClick={() => setSelected(null)} aria-current={active(href) ? "page" : undefined}><Icon size={16} aria-hidden="true"/>{label}</Link>)}</div></nav>;
}
