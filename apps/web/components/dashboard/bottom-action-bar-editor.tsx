"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, GripVertical, Loader2, RotateCcw } from "lucide-react";
import type { BottomActionConfig, BottomActionId } from "../../app/lib/page-modules";

type Props = { initialActions?: BottomActionConfig[]; initialServiceRequestEnabled?: boolean; initialBookingPlacement?: "panel" | "ribbon" };
const DEFAULT: Array<{id: BottomActionId;label:string;description:string}> = [
  { id: "whatsapp", label: "واتساب", description: "محادثة مباشرة" },
  { id: "phone", label: "اتصال", description: "رقم الهاتف الرئيسي" },
  { id: "email", label: "بريد", description: "البريد الرسمي" },
  { id: "website", label: "الموقع", description: "الموقع الإلكتروني" },
  { id: "share", label: "مشاركة", description: "مشاركة الهوية" },
];

export function BottomActionBarEditor({ initialActions = [], initialServiceRequestEnabled = true, initialBookingPlacement = "panel" }: Props) {
  const [transactionSettings, setTransactionSettings] = useState({ serviceRequestEnabled: initialServiceRequestEnabled, bookingPlacement: initialBookingPlacement });
  const savedSettings = useRef(transactionSettings);
  const normalize = (value: BottomActionConfig[]) => {
    const map = new Map(value.map((item) => [item.id, item]));
    return DEFAULT.map((item, index) => ({ ...item, enabled: map.get(item.id)?.enabled ?? true, sortOrder: map.get(item.id)?.sortOrder ?? index }))
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((item, index) => ({ ...item, sortOrder: index }));
  };
  const [actions, setActions] = useState(() => normalize(initialActions));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState<BottomActionId | null>(null);
  const actionsRef = useRef(actions);
  const lastSaved = useRef(actions);
  const draggingRef = useRef<BottomActionId | null>(null);
  const itemRefs = useRef(new Map<BottomActionId, HTMLDivElement>());
  const apply = (next: typeof actions) => { actionsRef.current = next; setActions(next); };
  const persist = async (next: typeof actions, settings = transactionSettings) => {
    if (saving || (JSON.stringify(next) === JSON.stringify(lastSaved.current) && JSON.stringify(settings) === JSON.stringify(savedSettings.current))) return;
    const previous = lastSaved.current;
    setSaving(true); setSaved(false); setError("");
    try {
      const response = await fetch("/api/dashboard/page-modules/bottom-actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...settings, actions: next.map((item, index) => ({ id: item.id, enabled: item.enabled, sortOrder: index, label: item.label })) }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر الحفظ");
      lastSaved.current = next;
      savedSettings.current = settings;
      setSaved(true); window.setTimeout(() => setSaved(false), 1800);
    } catch (cause) {
      apply(previous);
      setTransactionSettings(savedSettings.current);
      setError(cause instanceof Error ? cause.message : "تعذر حفظ الشريط");
    } finally { setSaving(false); }
  };
  const moveTo = (id: BottomActionId, targetId: BottomActionId) => {
    const current = actionsRef.current;
    const from = current.findIndex((item) => item.id === id), to = current.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...current]; const [picked] = next.splice(from, 1); next.splice(to, 0, picked);
    apply(next.map((item, index) => ({ ...item, sortOrder: index })));
  };
  const moveBy = (id: BottomActionId, delta: number) => {
    const current = actionsRef.current;
    const from = current.findIndex((item) => item.id === id), to = from + delta;
    if (from < 0 || to < 0 || to >= current.length) return;
    const next = [...current]; [next[from], next[to]] = [next[to], next[from]];
    const ordered = next.map((item, index) => ({ ...item, sortOrder: index })); apply(ordered); void persist(ordered);
  };
  const toggle = (id: BottomActionId) => {
    const next = actionsRef.current.map((entry) => entry.id === id ? { ...entry, enabled: !entry.enabled } : entry);
    apply(next); void persist(next);
  };
  const pointerMove = (id: BottomActionId, clientY: number) => {
    for (const targetId of actionsRef.current.map((item) => item.id)) {
      if (targetId === id) continue;
      const node = itemRefs.current.get(targetId); if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) { moveTo(id, targetId); break; }
    }
  };
  const stopDragging = () => { draggingRef.current = null; setDragging(null); };
  const enabledCount = useMemo(() => actions.filter((item) => item.enabled).length, [actions]);
  return <section className="overflow-hidden rounded-[26px] border border-slate-200 bg-white" dir="rtl">
    <div className="bg-[#07181b] p-5 text-white"><span className="text-[10px] font-black tracking-[.16em] text-[#5cebd7]" dir="ltr">04 · ACTION BAR</span><h2 className="mt-2 text-xl font-black">تحكم في شريط التواصل</h2><p className="mt-2 text-xs leading-6 text-slate-300">اختر ما يظهر لعملائك ورتّبه كما تريد. يظهر فقط الزر الذي تتوفر بياناته في الهوية.</p></div>
    <div className="p-3 sm:p-5"><fieldset disabled={saving} className="mb-5 grid gap-3 rounded-2xl border border-slate-200 p-4"><legend className="px-2 text-sm font-bold">الطلب والحجز</legend><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={transactionSettings.serviceRequestEnabled} onChange={e => { const settings = { ...transactionSettings, serviceRequestEnabled: e.target.checked }; setTransactionSettings(settings); void persist(actionsRef.current, settings); }} />إظهار مربع طلب خدمة</label><label className="grid gap-2 text-sm">مكان زر حجز الموعد<select className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-slate-900" value={transactionSettings.bookingPlacement} onChange={e => { const settings = { ...transactionSettings, bookingPlacement: e.target.value as "panel" | "ribbon" }; setTransactionSettings(settings); void persist(actionsRef.current, settings); }}><option value="panel">داخل الصفحة</option><option value="ribbon">في الشريط السفلي</option></select></label><p className="text-xs leading-6 text-slate-500">يظهر الحجز عند تفعيل الخدمة وإعداد أوقات العمل. نقله إلى الشريط يخفي مربعه داخل الصفحة.</p></fieldset><div className="space-y-2" role="list" aria-label="ترتيب أزرار التواصل">{actions.map((item, index) => <div key={item.id} ref={(node)=>{if(node)itemRefs.current.set(item.id,node);else itemRefs.current.delete(item.id)}} role="listitem" className={`flex items-center gap-2 rounded-2xl border p-2.5 transition ${dragging===item.id?"scale-[1.01] border-[#35e4cb] bg-[#effbf9] shadow-lg":"border-slate-100 bg-[#fbfdfd]"}`}>
      <button type="button" aria-label={`اسحب لترتيب ${item.label}`} disabled={saving} onPointerDown={(event)=>{event.preventDefault();draggingRef.current=item.id;setDragging(item.id);event.currentTarget.setPointerCapture(event.pointerId)}} onPointerMove={(event)=>{if(draggingRef.current!==item.id)return;event.preventDefault();pointerMove(item.id,event.clientY)}} onPointerUp={(event)=>{if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);stopDragging();void persist(actionsRef.current)}} onPointerCancel={()=>{stopDragging();void persist(actionsRef.current)}} className="grid h-11 w-11 touch-none shrink-0 place-items-center rounded-xl bg-[#effbf9] text-[#008f87] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae]"><GripVertical className="h-4 w-4"/></button><span className="min-w-0 flex-1"><b className="block text-sm text-slate-900">{item.label}</b><small className="text-[11px] text-slate-500">{item.description}</small></span>
      <button type="button" disabled={saving} onClick={() => toggle(item.id)} aria-pressed={item.enabled} className={`grid h-10 w-10 place-items-center rounded-xl border transition ${item.enabled ? "border-[#a9e8de] bg-[#effbf9] text-[#008f87]" : "border-slate-200 bg-white text-slate-300"}`} aria-label={`${item.label} ${item.enabled ? "مفعّل" : "متوقف"}`}><Check className="h-4 w-4"/></button>
      <button type="button" disabled={saving||index===0} onClick={() => moveBy(item.id, -1)} aria-label={`نقل ${item.label} للأعلى`} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button><button type="button" disabled={saving||index===actions.length-1} onClick={() => moveBy(item.id, 1)} aria-label={`نقل ${item.label} للأسفل`} className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 text-slate-500 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button>
    </div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><span className="text-[11px] text-slate-500">{saving?<span className="inline-flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin"/>جارٍ الحفظ</span>:saved?<span className="inline-flex items-center gap-1.5 font-bold text-emerald-600"><Check className="h-3.5 w-3.5"/>تم حفظ الترتيب</span>:error?<span className="inline-flex items-center gap-1.5 font-bold text-rose-600"><AlertTriangle className="h-3.5 w-3.5"/>{error}</span>:`${enabledCount} أزرار مفعّلة · اسحب بالماوس أو اللمس`}</span><button type="button" disabled={saving} onClick={() => {const next=normalize([]);apply(next);void persist(next)}} className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-600 disabled:opacity-50"><RotateCcw className="h-3.5 w-3.5"/>إعادة الافتراضي</button></div></div>
  </section>;
}
