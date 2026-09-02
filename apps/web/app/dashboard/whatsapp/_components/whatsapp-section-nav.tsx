"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ContactRound, FileText, Inbox, Link2, Megaphone, ShieldCheck, ShoppingBag, Workflow } from "lucide-react";

const items = [
  ["/dashboard/whatsapp/contacts", "جهات الاتصال", ContactRound],
  ["/dashboard/whatsapp/templates", "القوالب", FileText],
  ["/dashboard/whatsapp/campaigns", "الحملات", Megaphone],
  ["/dashboard/whatsapp/automations", "الأتمتة", Workflow],
  ["/dashboard/whatsapp/integrations", "التكاملات", ShoppingBag],
  ["/dashboard/whatsapp/inbox", "المحادثات", Inbox],
  ["/dashboard/whatsapp/setup", "ربط واتساب", Link2],
  ["/dashboard/whatsapp/audit", "سجل التدقيق", ShieldCheck],
] as const;

export function WhatsAppSectionNav() {
  const pathname = usePathname();
  return <nav aria-label="أقسام تسويق واتساب" className="overflow-x-auto rounded-[18px] border border-slate-200 bg-white p-1.5 shadow-[0_8px_28px_rgba(15,23,42,.035)]">
    <div className="flex min-w-max gap-1">
      {items.map(([href, label, Icon]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-[10px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-1 ${active ? "bg-[#07181b] text-white shadow-sm" : "text-slate-500 hover:bg-[#effbf9] hover:text-[#008f87]"}`}>
          <Icon className={`h-3.5 w-3.5 ${active ? "text-[#6eead8]" : ""}`} /><span>{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
