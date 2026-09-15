"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Loader2, RotateCcw } from "lucide-react";
import type { BottomActionConfig, BottomActionId } from "../../app/lib/page-modules";

type Props = { initialActions?: BottomActionConfig[] };
const DEFAULT: Array<{id: BottomActionId;label:string;description:string}> = [
  { id: "whatsapp", label: "واتساب", description: "محادثة مباشرة" },
  { id: "phone", label: "اتصال", description: "رقم الهاتف الرئيسي" },
  { id: "email", label: "بريد", description: "البريد الرسمي" },
  { id: "website", label: "الموقع", description: "الموقع الإلكتروني" },
  { id: "share", label: "مشاركة", description: "مشاركة الهوية" },
];

export function BottomActionBarEditor({ initialActions = [] }: Props) {
  const normalize = (value: BottomActionConfig[]) => {
    const map = new Map(value.map((item) => [item.id, item]));
    return DEFAULT.map((item, index) => ({ ...item, enabled: map.get(item.id)?.enabled ?? true, sortOrder: map.get(item.id)?.sortOrder ?? index }));
  };
  const [actions, setActions] = useState(() => normalize(initialActions));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const drag = useRef<BottomActionId | null>(null);
  const move = (id: BottomActionId, delta: number) => setActions((current) => {
    const from = current.findIndex((item) => item.id === id), to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) return current;
    const next = [...current]; [next[from], next[to]] = [next[to], next[from]]; return next.map((item, index) => ({ ...item, sortOrder: index }));
  });
  const persist = async (next = actions) => {
    setSaving(true); setSaved(false);
    try {
      const response = await fetch("/api/dashboard/page-modules/bottom-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ actions: next.map((item, index) => ({ id: item.id, enabled: item.enabled, sortOrder: index, label: item.label })) }) });
      if (!response.ok) throw new Error("تعذر الحفظ");
      setSaved(true); window.setTimeout(() => setSaved(false), 1800);
    } finally { setSaving(false); }
  };
  const enabledCount = useMemo(() => actions.filter((item) => item.enabled).length, [actions]);
  return <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white" dir="rtl">
    <div className="bg-[#07181b] p-5 text-white"><span className="text-[10px] font-black tracking-[.16em] text-[#5cebd7]" dir="ltr">04 · ACTION BAR</span><h2 className="mt-2 text-xl font-black">تحكم في شريط التواصل</h2><p className="mt-2 text-xs leading-6 text-slate-300">اختر ما يظهر لعملائك ورتّبه كما تريد. يظهر فقط الزر الذي تتوفر بياناته في الهوية.</p></div>
    <div className="p-3 sm:p-5"><div className="space-y-2">{actions.map((item, index) => <div key={item.id} draggable onDragStart={() => { drag.current = item.id; }} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (drag.current && drag.current !== item.id) { const from = actions.findIndex((entry) => entry.id === drag.current), to = index; const next = [...actions]; const [picked] = next.splice(from, 1); next.splice(to, 0, picked); setActions(next.map((entry, i) => ({ ...entry, sortOrder: i }))); } drag.current = null; }} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-[#fbfdfd] p-2.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#effbf9] text-[#008f87]"><GripVertical className="h-4 w-4"/></span><span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{item.label}</b><small className="text-[11px] text-slate-500">{item.description}</small></span>
      <button type="button" onClick={() => setActions((current) => current.map((entry) => entry.id === item.id ? { ...entry, enabled: !entry.enabled } : entry))} aria-pressed={item.enabled} className={`grid h-10 w-10 place-items-center rounded-xl border transition ${item.enabled ? "border-[#a9e8de] bg-[#effbf9] text-[#008f87]" : "border-slate-200 bg-white text-slate-300"}`} aria-label={`${item.label} ${item.enabled ? "مفعّل" : "متوقف"}`}><Check className="h-4 w-4"/></button>
      <button type="button" disabled={index===0} onClick={() => move(item.id, -1)} aria-label={`نقل ${item.label} للأعلى`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button><button type="button" disabled={index===actions.length-1} onClick={() => move(item.id, 1)} aria-label={`نقل ${item.label} للأسفل`} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button>
    </div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-[11px] text-slate-500">{enabledCount} أزرار مفعّلة · اسحب لترتيبها</span><div className="flex gap-2"><button type="button" onClick={() => setActions(normalize([]))} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600"><RotateCcw className="h-3.5 w-3.5"/>إعادة الافتراضي</button><button type="button" disabled={saving || enabledCount === 0} onClick={() => void persist()} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#00bfae] px-4 text-xs font-black text-white disabled:opacity-50">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : saved ? <Check className="h-3.5 w-3.5"/> : null}{saving ? "جارٍ الحفظ" : saved ? "تم الحفظ" : "حفظ الشريط"}</button></div></div></div>
  </section>;
}
