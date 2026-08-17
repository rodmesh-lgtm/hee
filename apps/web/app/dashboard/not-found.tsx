import Link from "next/link";
import { SearchX } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="rounded-[28px] border border-[#e9e7f3] bg-white p-8 text-center shadow-[0_12px_32px_-28px_rgba(58,35,75,.28)]">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f1edff] text-[#6543ce]">
        <SearchX className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-3xl font-black text-[#1f2552]">الصفحة غير موجودة</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">الصفحة المطلوبة داخل لوحة التحكم غير متاحة. يمكنك العودة إلى الصفحة الرئيسية وإكمال إدارة هويتك الرقمية.</p>
      <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-[#6f3bd2] px-5 text-sm font-bold text-white transition hover:bg-[#5e31b8]">
        العودة إلى لوحة التحكم
      </Link>
    </div>
  );
}
