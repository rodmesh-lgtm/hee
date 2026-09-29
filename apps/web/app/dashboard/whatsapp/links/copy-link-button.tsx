"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
export function CopyLinkButton({ url }: { url: string }) {
  const [status, setStatus] = useState("");
  return <span className="inline-flex flex-col gap-1"><button type="button" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-800 focus-visible:ring-2 focus-visible:ring-teal-500" onClick={async () => { try { await navigator.clipboard.writeText(url); setStatus("تم النسخ"); } catch { setStatus("تعذر النسخ؛ حدد الرابط وانسخه يدويًا"); } }}>{status === "تم النسخ" ? <Check className="h-4 w-4" aria-hidden="true"/> : <Copy className="h-4 w-4" aria-hidden="true"/>}نسخ</button>{status ? <span role="status" className="text-xs text-slate-600">{status}</span> : null}</span>;
}
