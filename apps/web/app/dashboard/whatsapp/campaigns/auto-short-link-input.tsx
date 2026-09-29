"use client";
import { useEffect, useRef, useState } from "react";
import { shortenMessageLinks } from "../../../actions/shorten-message-links";
import { longLinksInText } from "../../../lib/short-link-domain";

export function AutoShortLinkInput({ value, onChange, label, className, enabled }: { value: string; onChange: (value: string) => void; label: string; className: string; enabled: boolean }) {
  const [status, setStatus] = useState("");
  const latest = useRef({ value, onChange });
  useEffect(() => { latest.current = { value, onChange }; }, [value, onChange]);
  useEffect(() => {
    if (!enabled || !longLinksInText(value).length) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("جارٍ اختصار الروابط…");
      try {
        const result = await shortenMessageLinks(value);
        if (cancelled || latest.current.value !== value) return;
        if (result.text !== undefined) { latest.current.onChange(result.text); setStatus("تم اختصار الرابط وحفظ وجهته الأصلية في قسم الروابط المختصرة."); }
        else setStatus(result.error ?? "تعذر اختصار الرابط؛ بقي النص الأصلي.");
      } catch { if (!cancelled) setStatus("تعذر الاتصال؛ بقي النص الأصلي. عدّل الحقل لإعادة المحاولة."); }
    }, 900);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [value, enabled]);
  return <><input aria-label={label} maxLength={1024} value={value} onChange={event => { latest.current.value = event.target.value; setStatus(""); onChange(event.target.value); }} className={className}/>{enabled ? <span role="status" className="mt-1 block text-xs leading-6 text-slate-500">{status || "تُختصر الروابط الطويلة تلقائيًا إلى ir.sa بعد الانتهاء من الكتابة."}</span> : null}</>;
}
