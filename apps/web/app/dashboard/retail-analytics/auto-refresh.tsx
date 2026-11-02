'use client';
import { useEffect, useEffectEvent, useState } from 'react';
import { createRefreshCycle } from '../../lib/retail-analytics/refresh-cycle';

/** Only the visible dashboard polls. Failed cycles back off; no overlapping cycles. */
export function useAutoRefresh(scope: string, enabled: boolean, refresh: (signal: AbortSignal) => Promise<boolean>, interval = 15000) {
  const [automatic, setAutomatic] = useState(true);
  const [status, setStatus] = useState({ remaining: 0, online: true, visible: true });
  const read = useEffectEvent(refresh);
  useEffect(() => {
    const cycle = createRefreshCycle(signal => read(signal), interval);
    async function tick() {
      const online = navigator.onLine, visible = document.visibilityState === 'visible';
      setStatus({ remaining: cycle.remaining(), online, visible });
      await cycle.tick(enabled && automatic && online && visible);
    }
    const timer = window.setInterval(() => { void tick(); }, 1000);
    const initial = window.setTimeout(() => { void tick(); }, 0);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('online', tick);
    window.addEventListener('offline', tick);
    return () => { cycle.dispose(); clearInterval(timer); clearTimeout(initial); document.removeEventListener('visibilitychange', tick); window.removeEventListener('online', tick); window.removeEventListener('offline', tick); };
  }, [scope, enabled, automatic, interval]);
  return { automatic, setAutomatic, ...status };
}
export function RefreshStatus({ state, busy, english }: { state: ReturnType<typeof useAutoRefresh>; busy: boolean; english: boolean }) {
  const t = (ar: string, en: string) => english ? en : ar;
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/5 p-4">
    <div><p className="font-bold">{!state.online ? t('انقطع الإنترنت — البيانات المعروضة آخر قراءة', 'Offline — showing the last snapshot') : !state.automatic ? t('التحديث التلقائي متوقف', 'Automatic refresh paused') : !state.visible ? t('التحديث متوقف أثناء إخفاء الصفحة', 'Refresh paused while hidden') : busy ? t('جارٍ التحديث من المصدر…', 'Refreshing from source…') : t(`التحديث التالي خلال ${state.remaining} ثانية`, `Next refresh in ${state.remaining}s`)}</p><p className="mt-1 text-sm">{t('قراءة تلقائية أثناء فتح اللوحة، وليست بثًا مضمونًا كل ثانية. وقت القراءة يظهر لكل حساب. قد تطول المهلة عند ازدحام المزود.', 'Automatic reads while this dashboard is open, not guaranteed second-by-second streaming. Each account shows its fetch time. Provider limits may delay refresh.')}</p></div>
    <button className="min-h-11 shrink-0 rounded-xl border border-slate-500/30 px-4 font-bold" aria-pressed={state.automatic} onClick={() => state.setAutomatic(!state.automatic)}>{state.automatic ? t('إيقاف التحديث التلقائي', 'Pause automatic refresh') : t('تشغيل التحديث التلقائي', 'Resume automatic refresh')}</button>
  </div>;
}
