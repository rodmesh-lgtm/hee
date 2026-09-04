"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContactRound, FileText, Inbox, LayoutDashboard, Link2, Megaphone, Plug, ShieldCheck, Workflow } from "lucide-react";

const items = [
  ["/dashboard/whatsapp", "نظرة عامة", LayoutDashboard, true],
  ["/dashboard/whatsapp/contacts", "جهات الاتصال", ContactRound, false],
  ["/dashboard/whatsapp/templates", "القوالب", FileText, false],
  ["/dashboard/whatsapp/campaigns", "الحملات", Megaphone, false],
  ["/dashboard/whatsapp/automations", "الأتمتة", Workflow, false],
  ["/dashboard/whatsapp/integrations", "التكاملات", Plug, false],
  ["/dashboard/whatsapp/inbox", "المحادثات", Inbox, false],
  ["/dashboard/whatsapp/setup", "ربط واتساب", Link2, false],
  ["/dashboard/whatsapp/audit", "سجل التدقيق", ShieldCheck, false],
] as const;

export function WhatsAppSectionNav() {
  const pathname = usePathname();
  return <nav aria-label="أقسام تسويق واتساب" className="overflow-x-auto overscroll-x-contain rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-[0_8px_28px_rgba(15,23,42,.035)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
    <div className="flex min-w-max snap-x snap-mandatory gap-1">
      {items.map(([href, label, Icon, exact]) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 snap-start items-center gap-2 rounded-xl px-3 text-[10px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-1 ${active ? "bg-[#07181b] text-white shadow-sm" : "text-slate-500 hover:bg-[#effbf9] hover:text-[#008f87]"}`}>
          <Icon className={`h-3.5 w-3.5 ${active ? "text-[#6eead8]" : ""}`} /><span>{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
