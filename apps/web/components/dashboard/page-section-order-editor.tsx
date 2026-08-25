"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircle2, GripVertical, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { PageModuleId } from "../../app/lib/page-modules";

type ManagedId = Extract<PageModuleId, "about" | "services" | "location" | "contactTeam" | "portfolio" | "contact">;
type Props = { initialOrder: ManagedId[] };
type SaveState = "idle" | "saving" | "saved" | "error";

const DEFAULT_ORDER: ManagedId[] = ["about", "services", "portfolio", "location", "contactTeam", "contact"];
const LABELS: Record<ManagedId, { title: string; description: string }> = {
  about: { title: "عن المنشأة", description: "قصتك ونبذتك التعريفية" },
  services: { title: "الخدمات", description: "ما الذي تقدمه لعملائك" },
  portfolio: { title: "أعمالنا", description: "صور ونماذج أعمالك" },
  location: { title: "الفروع والموقع", description: "أماكن تواجد النشاط" },
  contactTeam: { title: "فريق العمل", description: "الأشخاص الذين يمثلون نشاطك" },
  contact: { title: "معلومات التواصل", description: "قنوات التواصل الرسمية" },
};

function sameOrder(left: ManagedId[], right: ManagedId[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function PageSectionOrderEditor({ initialOrder }: Props) {
  const normalizedInitial = useMemo(() => {
    const seen = new Set<ManagedId>();
    const valid = initialOrder.filter((id): id is ManagedId => {
      if (!(id in LABELS) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return [...valid, ...DEFAULT_ORDER.filter((id) => !seen.has(id))];
  }, [initialOrder]);
  const [order, setOrder] = useState<ManagedId[]>(normalizedInitial);
  const orderRef = useRef<ManagedId[]>(normalizedInitial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [dragging, setDragging] = useState<ManagedId | null>(null);
  const itemRefs = useRef(new Map<ManagedId, HTMLDivElement>());
  const lastSaved = useRef<ManagedId[]>(normalizedInitial);

  async function persist(next: ManagedId[]) {
    if (sameOrder(next, lastSaved.current)) return;
    setSaveState("saving");
    setMessage("");
    try {
      const response = await fetch("/api/dashboard/page-modules/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: next }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "تعذر حفظ الترتيب");
      lastSaved.current = [...next];
      setSaveState("saved");
      window.setTimeout(() => setSaveState((current) => current === "saved" ? "idle" : current), 1600);
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "تعذر حفظ الترتيب");
    }
  }

  function applyOrder(next: ManagedId[]) {
    orderRef.current = next;
    setOrder(next);
  }

  function move(activeId: ManagedId, targetId: ManagedId) {
    if (activeId === targetId) return;
    const current = orderRef.current;
    const from = current.indexOf(activeId);
    const to = current.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...current];
    next.splice(from, 1);
    next.splice(to, 0, activeId);
    applyOrder(next);
  }

  function pointerMove(activeId: ManagedId, clientY: number) {
    for (const id of orderRef.current) {
      if (id === activeId) continue;
      const node = itemRefs.current.get(id);
      if (!node) continue;
      const rect = node.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        move(activeId, id);
        break;
      }
    }
  }

  return <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5" dir="rtl">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">رتّب هويتك كما تريد</h2></div>
        <p className="mt-1 max-w-xl text-xs leading-6 text-slate-500">اسحب الأقسام من المقبض. الترتيب الذي تحفظه هو ترتيب هويتك أمام العميل، ويمكنك تغييره متى شئت.</p>
      </div>
      <div aria-live="polite" className="min-h-7 text-xs font-bold">
        {saveState === "saving" ? <span className="inline-flex items-center gap-1.5 text-amber-700"><Loader2 className="h-3.5 w-3.5 animate-spin" />جارٍ الحفظ</span> : null}
        {saveState === "saved" ? <span className="inline-flex items-center gap-1.5 text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />تم حفظ الترتيب</span> : null}
        {saveState === "error" ? <span className="text-rose-700">{message}</span> : null}
      </div>
    </div>

    <div className="mt-4 space-y-2" role="list" aria-label="ترتيب أقسام الصفحة">
      {order.map((id, index) => <div
        key={id}
        ref={(node) => { if (node) itemRefs.current.set(id, node); else itemRefs.current.delete(id); }}
        role="listitem"
        data-section-id={id}
        className={`flex items-center gap-3 rounded-2xl border bg-[#fbfcff] px-3 py-3 transition ${dragging === id ? "border-[#a78bfa] shadow-[0_10px_28px_rgba(111,59,210,.12)]" : "border-[#eceefa]"}`}
      >
        <button
          type="button"
          aria-label={`اسحب لترتيب ${LABELS[id].title}`}
          className="grid h-11 w-11 touch-none place-items-center rounded-xl border border-[#e5e0f4] bg-white text-[#6f3bd2] active:scale-95"
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(id);
          }}
          onPointerMove={(event) => {
            if (dragging !== id) return;
            event.preventDefault();
            pointerMove(id, event.clientY);
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            setDragging(null);
            void persist(orderRef.current);
          }}
          onPointerCancel={() => setDragging(null)}
        ><GripVertical className="h-5 w-5" /></button>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f1ebfb] text-xs font-black text-[#6f3bd2]">{index + 1}</span>
        <div className="min-w-0 flex-1"><b className="block text-sm text-[#20264f]">{LABELS[id].title}</b><span className="mt-0.5 block text-[11px] text-slate-500">{LABELS[id].description}</span></div>
      </div>)}
    </div>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f7] pt-4">
      <p className="text-[11px] leading-5 text-slate-500">المقبض يدعم اللمس على الجوال والسحب بالماوس.</p>
      <button type="button" onClick={() => { applyOrder(DEFAULT_ORDER); void persist(DEFAULT_ORDER); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#e2def3] bg-white px-3 text-xs font-black text-[#5d49cc]"><RotateCcw className="h-4 w-4" />الترتيب المقترح</button>
    </div>
  </section>;
}
