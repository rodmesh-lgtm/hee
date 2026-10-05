"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, RefreshCw } from "lucide-react";

export function WorkspaceRefresh({ observedAt }: { observedAt: string }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(true);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (!enabled || pending) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      if (document.activeElement?.matches("input,textarea,select,[contenteditable='true']")) return;
      startTransition(() => router.refresh());
    }, 30_000);
    return () => window.clearInterval(timer);
  }, [enabled, pending, router]);

  return <section className="infro-workspace-refresh" aria-label="تحديث بيانات مساحة العمل">
    <div><b>{pending ? "جارٍ قراءة البيانات…" : enabled ? "تحديث تلقائي كل 30 ثانية" : "التحديث التلقائي متوقف"}</b><p>آخر قراءة: <time dateTime={observedAt}>{new Date(observedAt).toLocaleTimeString("ar-SA", { timeZone: "Asia/Riyadh", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time> · توقيت الرياض</p></div>
    <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={enabled} onClick={() => setEnabled(current => !current)} className="infro-refresh-toggle">{enabled ? <Pause aria-hidden="true"/> : <Play aria-hidden="true"/>}{enabled ? "إيقاف التحديث" : "تشغيل التحديث"}</button><button type="button" disabled={pending} onClick={() => startTransition(() => router.refresh())} className="infro-primary-action"><RefreshCw aria-hidden="true"/>تحديث البيانات</button></div>
  </section>;
}
