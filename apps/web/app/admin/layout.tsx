import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "../lib/admin";

export const metadata: Metadata = {
  title: "إدارة HEE",
  robots: { index: false, follow: false, noarchive: true, nocache: true },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Protect the entire /admin subtree. Individual pages/actions may still call
  // requireAdmin defensively, but no future admin route can accidentally omit it.
  await requireAdmin();
  return (
    <div dir="rtl">
      <nav className="sticky top-0 z-40 border-b border-[#e7e4f0] bg-white/95 backdrop-blur" aria-label="تنقل إدارة المنصة">
        <div className="mx-auto flex max-w-7xl items-center gap-2 overflow-x-auto px-4 py-2 sm:px-6">
          <Link href="/admin" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#514b63] hover:bg-[#f5f2ff]">نظرة عامة</Link>
          <Link href="/admin/requests" className="whitespace-nowrap rounded-xl px-3 py-2 text-xs font-black text-[#5d49cc] hover:bg-[#f5f2ff]">طلبات الإدارة</Link>
          <Link href="/dashboard" className="mr-auto whitespace-nowrap rounded-xl border border-[#e3dfed] px-3 py-2 text-xs font-black text-[#5d49cc]">لوحة العميل</Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
