import Link from "next/link";
import { ArrowRight, Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-12 text-slate-900">
      <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-slate-200 bg-white p-7 text-center shadow-sm sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-700">
            <SearchX className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-sm font-black tracking-[0.2em] text-slate-400">404</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">الصفحة غير متاحة</h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-600">
            قد يكون الرابط غير صحيح، أو أن صفحة النشاط لم تُنشر بعد، أو لم تعد متاحة.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">
              <Home className="h-4 w-4" aria-hidden="true" />
              العودة للرئيسية
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              تسجيل الدخول
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
