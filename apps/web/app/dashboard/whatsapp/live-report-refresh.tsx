"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function LiveReportRefresh({ observedAt, compact = false, intervalSeconds = 10 }: { observedAt: string; compact?: boolean; intervalSeconds?: 5 | 10 }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!enabled || pending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      // Preserve edits in the campaign wizard and report filters.
      if (document.activeElement?.matches("input, textarea, select, [contenteditable='true']")) return;
      startTransition(() => router.refresh());
    }, intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [enabled, pending, router, intervalSeconds]);

  return <section aria-label="تحديث تحليلات الحملة" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-700">
    <div>
      <b className="block text-emerald-800">{pending ? "جارٍ تحديث البيانات…" : enabled ? `تحديث تلقائي كل ${intervalSeconds} ثوانٍ` : "التحديث التلقائي متوقف"}</b>
      <span className="mt-1 block">آخر قراءة للبيانات: <time data-testid="report-observed-at" dateTime={observedAt}>{new Date(observedAt).toLocaleTimeString("ar-SA", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time> · توقيت الرياض</span>
      {!compact ? <p className="mt-1 text-slate-500">التسليم والقراءة بحسب إيصالات Meta المستلمة؛ تحديث الشاشة لا يسرّع الإرسال. يتوقف التحديث في الخلفية وأثناء إدخال البيانات.</p> : null}
    </div>
    <div className="flex gap-2">
      <button type="button" aria-pressed={enabled} onClick={() => setEnabled((current) => !current)} className="min-h-11 rounded-xl border border-slate-300 px-3 font-bold">{enabled ? "إيقاف التحديث التلقائي" : "تشغيل التحديث التلقائي"}</button>
      <button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="min-h-11 rounded-xl bg-[#008f87] px-3 font-bold text-white disabled:opacity-50">تحديث الآن</button>
    </div>
  </section>;
}
