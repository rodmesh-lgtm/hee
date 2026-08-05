import Link from "next/link";
import { SearchX } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
      <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-200">
        <SearchX className="h-6 w-6" />
      </div>
      <h1 className="mt-4 text-3xl font-black text-white">الصفحة غير موجودة</h1>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-400">الصفحة المطلوبة داخل لوحة التحكم غير متاحة، ويمكنك العودة إلى الصفحة الرئيسية للمساحة.</p>
      <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center justify-center rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 text-sm font-bold text-white">
        العودة إلى لوحة التحكم
      </Link>
    </div>
  );
}
