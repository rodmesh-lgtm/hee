import type { Metadata } from "next";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { adminLogoutAction } from "../actions/admin-auth";
import { requireAdmin } from "../lib/admin";

export const metadata: Metadata = {
  title: "إدارة HEE",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div dir="rtl">
      <nav className="sticky top-0 z-40 border-b border-[#e7e4f0] bg-white/95 backdrop-blur" aria-label="تنقل إدارة المنصة">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
          <Link href="/admin" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#514b63] hover:bg-[#f5f2ff]">نظرة عامة</Link>
          <Link href="/admin/customers" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">العملاء والحسابات</Link>
          <Link href="/admin/billing" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">الاشتراكات والفوترة</Link>
          <Link href="/admin/store-products" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">منتجات المتجر</Link>
          <Link href="/admin/store-orders" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">طلبات المتجر</Link>
          <Link href="/admin/requests" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">طلبات الإدارة</Link>
          <Link href="/admin/access-codes" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">أكواد الاشتراك</Link>
          <Link href="/admin/support" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">دعم العملاء</Link>
          <Link href="/admin/whatsapp" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-50">تشغيل واتساب</Link>
          <div className="mr-auto flex items-center gap-2 whitespace-nowrap border-r border-[#ebe7f1] pr-3">
            <span className="hidden text-[10px] font-bold text-slate-400 lg:inline">{admin.email}</span>
            <a href="https://ir.sa" target="_blank" rel="noreferrer" className="rounded-xl border border-[#e3dfed] px-3 py-2 text-xs font-black text-[#5d49cc]">منصة العملاء</a>
            <form action={adminLogoutAction}><button className="inline-flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"><LogOut className="h-3.5 w-3.5" />خروج الإدارة</button></form>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
