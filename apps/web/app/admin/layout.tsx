import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "../lib/admin";

export const metadata: Metadata = {
  title: "إدارة HEE",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
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
          <Link href="/dashboard" className="mr-auto whitespace-nowrap rounded-xl border border-[#e3dfed] px-3 py-2 text-xs font-black text-[#5d49cc]">لوحة العميل</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
