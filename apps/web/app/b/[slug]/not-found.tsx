import Link from "next/link";

export default function PublicBusinessNotFound() {
  return (
    <main dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.24),_transparent_45%),linear-gradient(180deg,#020617_0%,#09090b_100%)] px-3 py-10 text-white sm:px-4 lg:px-8">
      <div className="mx-auto w-full max-w-[580px] rounded-[32px] border border-white/10 bg-slate-950/70 p-6 text-center shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur lg:max-w-[520px]">
        <h1 className="text-2xl font-black">الصفحة غير متاحة</h1>
        <p className="mt-3 text-sm leading-8 text-slate-300">
          هذا الرابط غير موجود حالياً أو أن النشاط لم يتم نشره بعد.
        </p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/" className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-bold text-white">
            العودة للرئيسية
          </Link>
          <Link href="/login" className="rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold text-slate-200">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </main>
  );
}
