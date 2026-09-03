"use client";

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, GripVertical, Loader2, RotateCcw, Sparkles } from "lucide-react";
import type { PageModuleId } from "../../app/lib/page-modules";

type ManagedId = Extract<PageModuleId, "about" | "services" | "location" | "contactTeam" | "portfolio" | "contact">;
type Props = { initialOrder: ManagedId[] };
type SaveState = "idle" | "saving" | "saved" | "error";
const DEFAULT_ORDER: ManagedId[] = ["about", "services", "portfolio", "location", "contactTeam", "contact"];
const LABELS: Record<ManagedId,{title:string;description:string;eyebrow:string}>={about:{title:"عن المنشأة",description:"قصتك ونبذتك التعريفية",eyebrow:"STORY"},services:{title:"الخدمات",description:"ما الذي تقدمه لعملائك",eyebrow:"OFFER"},portfolio:{title:"أعمالنا",description:"صور ونماذج أعمالك",eyebrow:"PROOF"},location:{title:"الفروع والموقع",description:"أماكن تواجد النشاط",eyebrow:"PLACE"},contactTeam:{title:"فريق العمل",description:"الأشخاص الذين يمثلون نشاطك",eyebrow:"PEOPLE"},contact:{title:"معلومات التواصل",description:"قنوات التواصل الرسمية",eyebrow:"CONNECT"}};
function sameOrder(a:ManagedId[],b:ManagedId[]){return a.length===b.length&&a.every((x,i)=>x===b[i])}

export function PageSectionOrderEditor({initialOrder}:Props){
  const normalizedInitial=useMemo(()=>{const seen=new Set<ManagedId>();const valid=initialOrder.filter((id):id is ManagedId=>{if(!(id in LABELS)||seen.has(id))return false;seen.add(id);return true});return [...valid,...DEFAULT_ORDER.filter(id=>!seen.has(id))]},[initialOrder]);
  const[order,setOrder]=useState<ManagedId[]>(normalizedInitial);
  const orderRef=useRef<ManagedId[]>(normalizedInitial);
  const[saveState,setSaveState]=useState<SaveState>("idle");
  const[message,setMessage]=useState("");
  const[dragging,setDragging]=useState<ManagedId|null>(null);
  const draggingRef=useRef<ManagedId|null>(null);
  const itemRefs=useRef(new Map<ManagedId,HTMLDivElement>());
  const lastSaved=useRef<ManagedId[]>(normalizedInitial);

  async function persist(next:ManagedId[]){
    if(sameOrder(next,lastSaved.current))return;
    setSaveState("saving");setMessage("");
    try{
      const response=await fetch("/api/dashboard/page-modules/order",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderedIds:next})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"تعذر حفظ الترتيب");
      lastSaved.current=[...next];setSaveState("saved");
      window.setTimeout(()=>setSaveState(current=>current==="saved"?"idle":current),1600);
    }catch(error){setSaveState("error");setMessage(error instanceof Error?error.message:"تعذر حفظ الترتيب")}
  }
  function applyOrder(next:ManagedId[]){orderRef.current=next;setOrder(next)}
  function move(activeId:ManagedId,targetId:ManagedId){if(activeId===targetId)return;const current=orderRef.current;const from=current.indexOf(activeId),to=current.indexOf(targetId);if(from<0||to<0||from===to)return;const next=[...current];next.splice(from,1);next.splice(to,0,activeId);applyOrder(next)}
  function moveBy(activeId:ManagedId,delta:number){const current=orderRef.current;const from=current.indexOf(activeId),to=from+delta;if(from<0||to<0||to>=current.length)return;const next=[...current];[next[from],next[to]]=[next[to],next[from]];applyOrder(next);void persist(next)}
  function pointerMove(activeId:ManagedId,clientY:number){for(const id of orderRef.current){if(id===activeId)continue;const node=itemRefs.current.get(id);if(!node)continue;const rect=node.getBoundingClientRect();if(clientY>=rect.top&&clientY<=rect.bottom){move(activeId,id);break}}}
  function stopDragging(){draggingRef.current=null;setDragging(null)}

  return <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white" dir="rtl">
    <div className="relative bg-[#07181b] p-5 text-white sm:p-6"><div className="absolute -left-10 -top-14 h-40 w-40 rounded-full bg-[#00e5a8]/10 blur-3xl"/><div className="relative flex flex-wrap items-start justify-between gap-4"><div><span className="inline-flex items-center gap-2 text-[9px] font-black tracking-[.16em] text-[#5cebd7]" dir="ltr"><Sparkles className="h-4 w-4"/>03 · COMPOSITION</span><h2 className="mt-2 text-xl font-black">رتّب هويتك كما تريد</h2><p className="mt-2 max-w-xl text-xs leading-6 text-slate-300">اسحب الأقسام بالماوس أو اللمس. وعلى الجوال ولوحة المفاتيح استخدم أزرار أعلى وأسفل. يُحفظ الترتيب الحقيقي فور اكتمال الحركة.</p></div><div aria-live="polite" className="min-h-8 rounded-full border border-white/10 bg-white/[.06] px-3 py-2 text-xs font-black">{saveState==="saving"?<span className="inline-flex items-center gap-1.5 text-amber-200"><Loader2 className="h-3.5 w-3.5 animate-spin"/>جارٍ الحفظ</span>:saveState==="saved"?<span className="inline-flex items-center gap-1.5 text-[#5cebd7]"><CheckCircle2 className="h-3.5 w-3.5"/>تم حفظ الترتيب</span>:saveState==="error"?<span className="text-rose-300">{message}</span>:<span className="text-slate-400">جاهز للترتيب</span>}</div></div></div>
    <div className="p-3 sm:p-5"><div className="grid gap-2" role="list" aria-label="ترتيب أقسام الصفحة">{order.map((id,index)=><div key={id} ref={node=>{if(node)itemRefs.current.set(id,node);else itemRefs.current.delete(id)}} role="listitem" data-section-id={id} className={`group grid grid-cols-[auto_1fr_auto] items-center gap-2 rounded-2xl border px-2.5 py-3 transition sm:grid-cols-[auto_auto_1fr_auto] sm:gap-3 sm:px-3 ${dragging===id?"scale-[1.01] border-[#35e4cb] bg-[#effbf9] shadow-[0_16px_34px_-24px_rgba(0,143,135,.7)]":"border-slate-100 bg-[#fbfdfd] hover:border-[#ccefe9]"}`}>
      <button type="button" aria-label={`اسحب لترتيب ${LABELS[id].title}`} className="grid h-11 w-11 touch-none place-items-center rounded-xl border border-slate-200 bg-white text-[#008f87] transition active:scale-95" onPointerDown={e=>{e.preventDefault();draggingRef.current=id;setDragging(id);e.currentTarget.setPointerCapture(e.pointerId)}} onPointerMove={e=>{if(draggingRef.current!==id)return;e.preventDefault();pointerMove(id,e.clientY)}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);stopDragging();void persist(orderRef.current)}} onPointerCancel={()=>{stopDragging();void persist(orderRef.current)}}><GripVertical className="h-5 w-5"/></button>
      <span className="hidden h-9 w-9 shrink-0 place-items-center rounded-full bg-[#07181b] text-xs font-black text-white sm:grid">{String(index+1).padStart(2,"0")}</span>
      <div className="min-w-0"><span className="text-[8px] font-black tracking-[.14em] text-[#008f87]" dir="ltr">{String(index+1).padStart(2,"0")} · {LABELS[id].eyebrow}</span><b className="block truncate text-sm text-slate-900">{LABELS[id].title}</b><span className="mt-0.5 hidden text-[11px] text-slate-500 sm:block">{LABELS[id].description}</span></div>
      <div className="flex items-center gap-1"><button type="button" disabled={index===0||saveState==="saving"} onClick={()=>moveBy(id,-1)} aria-label={`نقل ${LABELS[id].title} للأعلى`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-30"><ArrowUp className="h-4 w-4"/></button><button type="button" disabled={index===order.length-1||saveState==="saving"} onClick={()=>moveBy(id,1)} aria-label={`نقل ${LABELS[id].title} للأسفل`} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-30"><ArrowDown className="h-4 w-4"/></button></div>
    </div>)}</div><div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-[11px] leading-5 text-slate-500">السحب يعمل بالماوس واللمس، وأزرار النقل بديل دقيق على الشاشات الصغيرة وتقنيات المساعدة.</p><button type="button" disabled={saveState==="saving"} onClick={()=>{applyOrder(DEFAULT_ORDER);void persist(DEFAULT_ORDER)}} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#ccefe9] bg-[#effbf9] px-3 text-xs font-black text-[#075d58] transition hover:bg-[#e4f8f4] disabled:opacity-50"><RotateCcw className="h-4 w-4"/>الترتيب المقترح</button></div></div>
  </section>
}
