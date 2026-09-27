"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { uploadPlatformAsset } from "../../app/actions/admin-platform-assets";
import { platformAssetUrl } from "../../lib/platform-asset-url";

export function PlatformAssetField({ name, label, value, fallback = "/brand/infro-symbol-approved.png", onValueChange, onUploadChange }: { name: string; label: string; value: string; fallback?: string; onValueChange?: (url: string) => void; onUploadChange?: (uploading: boolean) => void }) {
  const [url, setUrl] = useState(value);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function changeUrl(next: string) { setUrl(next); onValueChange?.(next); }
  return <fieldset className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-700 dark:bg-slate-900">
    <legend className="px-2 text-sm font-bold">{label}</legend>
    <div className="mb-3 flex h-28 items-center justify-center rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
      <Image src={platformAssetUrl(url) || fallback} alt={`معاينة ${label}`} width={240} height={96} unoptimized className="h-full w-auto max-w-full object-contain"/>
    </div>
    <label className="block text-xs font-bold">رفع صورة
      <input type="file" accept="image/png,image/jpeg,image/webp" disabled={pending} className="mt-2 block w-full text-xs" onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        setError("");
        onUploadChange?.(true);
        startTransition(async () => {
          const data = new FormData(); data.set("file", file);
          try { const result = await uploadPlatformAsset(data); if (result.url) changeUrl(result.url); else setError(result.error ?? "تعذر الرفع"); }
          catch { setError("تعذر الرفع. تحقق من الاتصال وصلاحية الجلسة."); }
          finally { onUploadChange?.(false); }
        });
      }}/>
    </label>
    <p className="mt-2 text-xs text-slate-500">PNG / JPG / WebP · حتى 2 ميجابايت. تُطبّق بعد نشر التعديلات.</p>
    <label className="mt-3 block text-xs">أو رابط الصورة
      <input name={name} value={url} onChange={event => changeUrl(event.target.value)} dir="ltr" className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent p-2"/>
    </label>
    <button type="button" disabled={pending} onClick={() => changeUrl("")} className="mt-2 text-xs font-bold text-teal-700 dark:text-teal-300">استخدام الافتراضي</button>
    <p role="status" className="mt-2 text-xs">{pending ? "جارٍ رفع الصورة…" : error}</p>
  </fieldset>;
}
