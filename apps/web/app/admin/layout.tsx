import type { Metadata } from "next";
import Link from "next/link";
import { BarChart3, Boxes, ChevronLeft, CircleHelp, CreditCard, ExternalLink, FileText, KeyRound, LayoutDashboard, LogOut, MessageCircleMore, Palette, Search, ShoppingBag, Sparkles, Users } from "lucide-react";
import { adminLogoutAction } from "../actions/admin-auth";
import { requireAdmin } from "../lib/admin";

export const metadata:Metadata={title:"إدارة INFRO",robots:{index:false,follow:false,noarchive:true,nocache:true}};

const nav=[
  {href:"/admin",label:"نظرة عامة",icon:LayoutDashboard},
  {href:"/admin/customers",label:"العملاء والحسابات",icon:Users},
  {href:"/admin/design",label:"التصميم والهوية",icon:Palette,badge:"NEW"},
  {href:"/admin/billing",label:"الاشتراكات والفوترة",icon:CreditCard},
  {href:"/admin/store-products",label:"منتجات المتجر",icon:Boxes},
  {href:"/admin/store-orders",label:"طلبات المتجر",icon:ShoppingBag},
  {href:"/admin/requests",label:"طلبات الإدارة",icon:FileText},
  {href:"/admin/access-codes",label:"أكواد الاشتراك",icon:KeyRound},
  {href:"/admin/support",label:"دعم العملاء",icon:CircleHelp},
  {href:"/admin/whatsapp",label:"تشغيل واتساب",icon:MessageCircleMore},
];

function NavItem({href,label,icon:Icon,badge}:{href:string;label:string;icon:typeof LayoutDashboard;badge?:string}){
  return <Link href={href} className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae]/40"><Icon className="h-[18px] w-[18px] shrink-0 text-slate-400 transition group-hover:text-[#009e95]"/><span className="flex-1">{label}</span>{badge&&<span className="rounded-full bg-[#dffbf6] px-2 py-0.5 text-[9px] font-black tracking-wider text-[#00877f]">{badge}</span>}<ChevronLeft className="h-3.5 w-3.5 text-slate-300 opacity-0 transition group-hover:opacity-100"/></Link>
}

export default async function AdminLayout({children}:{children:React.ReactNode}){
  const admin=await requireAdmin();
  return <div dir="rtl" className="min-h-screen bg-[#f7f9fa] text-slate-950">
    <aside className="fixed inset-y-0 right-0 z-50 hidden w-[272px] border-l border-slate-200/80 bg-white lg:flex lg:flex-col">
      <div className="flex h-[72px] items-center gap-3 border-b border-slate-100 px-5">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#07181b] shadow-sm"><span className="text-lg font-black tracking-[-0.08em] text-[#21e0c2]">iR</span></div>
        <div className="min-w-0"><div className="flex items-center gap-2"><span className="text-[17px] font-black tracking-tight">INFRO</span><span className="rounded-md border border-slate-200 px-1.5 py-0.5 text-[8px] font-black text-slate-400">ADMIN</span></div><p className="mt-0.5 text-[10px] font-semibold text-slate-400">مركز تشغيل المنصة</p></div>
      </div>
      <div className="px-4 pt-4"><button type="button" className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2.5 text-right text-xs font-semibold text-slate-400 shadow-sm transition hover:border-slate-300 hover:bg-white"><Search className="h-4 w-4"/><span className="flex-1">بحث في الإدارة...</span><kbd className="rounded border bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-400">⌘ K</kbd></button></div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4" aria-label="تنقل إدارة المنصة"><p className="px-3 pb-2 text-[9px] font-black tracking-[.12em] text-slate-300">إدارة INFRO</p>{nav.map(item=><NavItem key={item.href} {...item}/>)}</nav>
      <div className="border-t border-slate-100 p-3"><a href="https://ir.sa" target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"><ExternalLink className="h-4 w-4"/>فتح منصة العملاء</a><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-2.5"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-xs font-black text-[#008f87] shadow-sm">RA</div><div className="min-w-0 flex-1"><p className="truncate text-[11px] font-black">مدير المنصة</p><p className="truncate text-[9px] font-medium text-slate-400">{admin.email}</p></div><form action={adminLogoutAction}><button aria-label="تسجيل الخروج" className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"><LogOut className="h-4 w-4"/></button></form></div></div>
    </aside>

    <div className="lg:mr-[272px]">
      <header className="sticky top-0 z-40 flex h-[64px] items-center border-b border-slate-200/70 bg-white/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="lg:hidden"><span className="text-base font-black">INFRO</span></div><div className="hidden items-center gap-2 text-xs font-semibold text-slate-400 lg:flex"><Sparkles className="h-4 w-4 text-[#00b9aa]"/><span>مركز التحكم</span><span className="text-slate-200">/</span><span className="text-slate-700">إدارة المنصة</span></div></div><div className="flex items-center gap-2"><div className="hidden rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 sm:block">● الأنظمة تعمل</div><a href="/admin/design" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-600 shadow-sm transition hover:border-[#9fe8df] hover:text-[#008f87]">تخصيص الهوية</a></div></header>
      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  </div>
}
