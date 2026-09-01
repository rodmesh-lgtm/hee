"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] render_failed", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main dir="rtl" className="min-h-screen bg-[#f7f8fb] px-4 py-12 text-[#1f2552] sm:px-6">
      <section className="mx-auto max-w-xl rounded-[26px] border border-rose-200 bg-white p-6 text-center shadow-sm sm:p-8" role="alert" aria-live="assertive">
        <span className="text-2xl font-black tracking-[-.08em] text-[#6f3bd2]">iR</span>
        <h1 className="mt-4 text-xl font-black">تعذر تحميل إدارة المنصة</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">لم يتم تنفيذ أي إجراء إداري من هذه الشاشة. أعد المحاولة، وإذا استمرت المشكلة راجع سجلات التشغيل قبل اعتماد أي طلب.</p>
        {error.digest ? <p className="mt-2 text-[11px] text-slate-400">مرجع الخطأ: {error.digest}</p> : null}
        <button type="button" onClick={reset} className="mt-5 rounded-xl bg-[#6f3bd2] px-5 py-2.5 text-sm font-black text-white">إعادة المحاولة</button>
      </section>
    </main>
  );
}
