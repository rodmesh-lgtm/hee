"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TemplateStatusRefresh({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine && !document.activeElement?.closest("#template-studio")) router.refresh();
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [enabled, router]);
  return enabled ? <p className="text-sm text-slate-600" role="status">تتحدث حالة القوالب قيد المراجعة تلقائيًا كل دقيقة أثناء فتح الصفحة، حسب آخر نتيجة مزامنة من Meta.</p> : null;
}
