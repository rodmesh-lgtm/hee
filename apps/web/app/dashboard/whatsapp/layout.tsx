import { UiText, UiAttributes } from "../../../components/i18n/locale-provider";
import Link from "next/link";
import {getWhatsAppReadContext} from "../../lib/whatsapp/rbac";
import {whatsappManagementAccess} from "../../lib/whatsapp/management-access";
import type { ReactNode } from "react";
import { ChevronLeft, LayoutDashboard, MessageCircle } from "lucide-react";
import { WhatsAppSectionNav } from "./_components/whatsapp-section-nav";

import "./workspace.css";

export default async function WhatsAppLayout({ children }: { children: ReactNode }) {
  const context=await getWhatsAppReadContext("view");
  const access=context?await whatsappManagementAccess(context.businessId):null;
  const operational=access?.allowed&&!access.marketing;
  return <div className="wa-workspace space-y-4">
    <div className="rounded-[20px] border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-[0_8px_30px_rgba(15,23,42,.035)] backdrop-blur sm:px-4">
      <UiAttributes><nav aria-label="مسار التنقل" className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[10px] font-bold text-slate-400">
        <Link href="/dashboard" className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-1"><LayoutDashboard className="h-3.5 w-3.5" /><UiText>{"لوحة التحكم"}</UiText></Link>
        <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden="true" />
        <Link href={operational?"/dashboard/whatsapp/setup":"/dashboard/whatsapp"} aria-current="location" className="inline-flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[#008f87] transition hover:bg-[#effbf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-1"><MessageCircle className="h-3.5 w-3.5 shrink-0" /><span className="truncate"><UiText>{operational?"إشعارات الخدمة":"مركز واتساب"}</UiText></span></Link>
      </nav></UiAttributes>
    </div>
    {operational?<UiAttributes><nav aria-label="إدارة إشعارات الخدمة" className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4 text-sm font-bold text-teal-800"><Link href="/dashboard/whatsapp/setup"><UiText>{"ربط الرقم"}</UiText></Link><Link href="/dashboard/whatsapp/templates"><UiText>{"قوالب الخدمة"}</UiText></Link><Link href="/dashboard/whatsapp/messages"><UiText>{"حالات تسليم الرسائل"}</UiText></Link>{access.cashier?<Link href="/Laundromat/Notifications"><UiText>{"إشعارات الكاشير"}</UiText></Link>:null}{access.bookings?<Link href="/dashboard/working-hours"><UiText>{"المواعيد"}</UiText></Link>:null}{access.liveView?<Link href="/dashboard/live-view"><UiText>{"المشاهدة"}</UiText></Link>:null}</nav></UiAttributes>:<WhatsAppSectionNav />}
    {children}
  </div>;
}
