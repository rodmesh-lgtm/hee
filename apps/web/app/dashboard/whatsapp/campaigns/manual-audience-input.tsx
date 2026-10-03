"use client";
import { useEffect, useRef, useState } from "react";
import { previewManualCampaignAudienceAction } from "../../../actions/whatsapp-marketing";
import type { ManualAudienceSummary } from "../../../lib/whatsapp/manual-audience";

export function ManualAudienceInput({ value, onChange, summary, onVerified }: { value: string; onChange: (value: string) => void; summary: ManualAudienceSummary | null; onVerified: (summary: ManualAudienceSummary | null) => void }) {
  const version = useRef(0);
  useEffect(() => () => { version.current++; }, []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function verify() {
    const request = ++version.current;
    setPending(true); setError(""); onVerified(null);
    try {
      const result = await previewManualCampaignAudienceAction(value);
      if (request !== version.current) return;
      if (result.ok) onVerified(result.summary); else setError(result.error);
    } catch { if (request === version.current) setError("تعذر الاتصال. أعد فحص الأرقام."); }
    finally { if (request === version.current) setPending(false); }
  }
  return <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <label className="block text-sm font-bold text-slate-900">أرقام المستلمين المحددين<textarea dir="ltr" rows={6} maxLength={300_000} value={value} onChange={event => { version.current++; setPending(false); setError(""); onVerified(null); onChange(event.target.value); }} placeholder={"05xxxxxxxx\n+9665xxxxxxxx"} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae]" /></label>
    <p className="text-xs leading-6 text-slate-600">الصق رقمًا في كل سطر، أو افصل الأرقام بفاصلة. تُقبل الأرقام السعودية المحلية والدولية والأرقام العربية. تُستخدم جهات منشأتك ذات الموافقة التسويقية الحالية فقط؛ الإدخال هنا لا يضيف موافقة.</p>
    <button type="button" disabled={pending || !value.trim()} onClick={verify} className="min-h-11 rounded-xl bg-[#07181b] px-4 text-sm font-bold text-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#00bfae]">{pending ? "جارٍ فحص الأرقام…" : "فحص الأرقام المحددة"}</button>
    <div role="status" aria-live="polite">{error ? <p className="text-sm text-rose-700">{error}</p> : null}{summary ? <><dl className="grid grid-cols-2 gap-2 text-sm">{[["مؤهل للإرسال", summary.eligible], ["مكرر مستبعد", summary.duplicates], ["صيغة غير صالحة", summary.invalid], ["غير موجود في جمهورك", summary.unavailable], ["منسحب", summary.optedOut], ["بلا موافقة تسويقية", summary.noConsent]].map(([label,count]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-3"><dt className="text-slate-600">{label}</dt><dd className="mt-1 font-bold text-slate-900">{count}</dd></div>)}</dl><p className="mt-3 text-xs leading-6 text-slate-600">ستُنشأ الحملة للمؤهلين فقط ({summary.eligible}). بقية الأرقام مستبعدة. يعاد التحقق عند الإنشاء والإرسال.</p></> : null}</div>
  </div>;
}
