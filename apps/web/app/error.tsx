"use client";

import { useEffect } from "react";
import { claimStaleActionReload, isStaleServerAction } from "./lib/stale-action-recovery";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isStaleActionError = isStaleServerAction(error);

  useEffect(() => {
    console.error(error);
    if (!isStaleActionError) return;
    const timer = window.setTimeout(() => {
      try {
        if (claimStaleActionReload(window.sessionStorage)) window.location.reload();
      } catch { /* Manual reload remains available if storage is restricted. */ }
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [error, isStaleActionError]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-4 py-10 text-white">
      <div className="w-full rounded-3xl border border-white/10 bg-slate-900 p-6">
        <h1 className="text-2xl font-black">
          {isStaleActionError ? "تتوفر نسخة أحدث من المنصة" : "حدث خطأ غير متوقع"}
        </h1>

        <p className="mt-3 text-sm leading-7 text-slate-300">
          {isStaleActionError
            ? "لم يُنفّذ الطلب لأن الصفحة تستخدم نسخة قديمة. سنحاول تحديثها تلقائيًا مرة واحدة؛ إن بقيت هذه الرسالة اضغط إعادة تحميل الصفحة، ثم راجع بياناتك وأرسل الطلب مجددًا."
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

          {!isStaleActionError ? <button
            type="button"
            onClick={reset}
            className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold hover:bg-white/5"
          >
            إعادة المحاولة
          </button> : null}
        </div>
      </div>
    </main>
  );
}
