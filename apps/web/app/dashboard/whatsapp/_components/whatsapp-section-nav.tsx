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
  return <nav aria-label="أقسام تسويق واتساب" className="overflow-x-auto rounded-2xl border bg-white p-2 shadow-sm">
    <div className="flex min-w-max gap-1">
      {items.map(([href, label, Icon]) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold transition ${active ? "bg-[#f2eeff] text-[#6543ce]" : "text-slate-600 hover:bg-slate-50 hover:text-[#20264f]"}`}>
          <Icon className="h-4 w-4" /><span>{label}</span>
        </Link>;
      })}
    </div>
  </nav>;
}
