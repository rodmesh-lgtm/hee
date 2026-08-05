"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const isStaleActionError = error.message.includes("Failed to find Server Action");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 text-white">
      <div className="w-full rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-2xl font-black">
          {isStaleActionError ? "تم تحديث الصفحة، يلزم إعادة التحميل" : "حدث خطأ غير متوقع"}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          {isStaleActionError
            ? "النسخة المفتوحة من النموذج قديمة. أعد تحميل الصفحة ثم أعد إرسال البيانات."
            : "حدث خطأ أثناء تنفيذ الطلب. يمكنك إعادة المحاولة الآن."}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold hover:bg-indigo-500"
          >
            إعادة تحميل الصفحة
          </button>

          <button
            type="button"
            onClick={reset}
            className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/5"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    </main>
  );
}
