"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, GripVertical, ListOrdered } from "lucide-react";
import { saveDashboardNavigation } from "../../app/actions/dashboard-navigation";
import { moveDashboardItem, orderDashboardItems } from "../../lib/dashboard-navigation-order";
import { dashboardNavGroups, type DashboardNavItem } from "./dashboard-nav";

export function DashboardNavOrderEditor({ items, order, onSaved }: { items: DashboardNavItem[]; order: string[]; onSaved: (order: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const dragged = useRef<string | null>(null);
  const touchDrag = useRef<{ source: string; target: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const opener = useRef<HTMLButtonElement>(null);
  function move(source: string, target: string) {
    setDraft(current => moveDashboardItem(current, source, target));
    setMessage("تم تغيير الموضع. اضغط حفظ الترتيب لتطبيقه.");
  }
  function save(value: string[]) {
    startTransition(async () => {
      try {
        const result = await saveDashboardNavigation(value);
        if (result.error) { setMessage(result.error); return; }
        onSaved(value); setEditing(false); setMessage(value.length ? "تم حفظ ترتيبك في حسابك." : "تمت استعادة الترتيب الافتراضي.");
        opener.current?.focus();
      } catch { setMessage("تعذر الاتصال. لم يُحفظ الترتيب؛ حاول مرة أخرى."); }
    });
  }
  return <div className="infro-nav-customizer">
    <button ref={opener} type="button" aria-expanded={editing} onClick={() => { setDraft(orderDashboardItems(order.length ? items : dashboardNavGroups.flatMap(group => items.filter(item => item.group === group.id)), order).map(item => item.href)); setMessage(""); setEditing(value => !value); }} disabled={pending}><ListOrdered size={16}/>{editing ? "إغلاق الترتيب" : "ترتيب القائمة"}</button>
    {editing ? <div className="infro-nav-editor">
      <p>اسحب الأقسام من المقبض أو استخدم الأسهم، ثم اضغط حفظ. يُحفظ ترتيبك في حسابك على جميع أجهزتك.</p>
      <ol>{orderDashboardItems(items, draft).map((item, index, all) => <li key={item.href} draggable={!pending} onDragStart={event => { dragged.current=item.href; event.dataTransfer.effectAllowed="move"; event.dataTransfer.setData("text/plain",item.href); }} onDragEnd={() => { dragged.current=null; }} onDragOver={event => { if (!pending && dragged.current) { event.preventDefault(); event.dataTransfer.dropEffect="move"; } }} onDrop={event => { event.preventDefault(); if (!pending && dragged.current) move(dragged.current,item.href); dragged.current=null; }}>
        <button type="button" className="infro-nav-drag-handle" disabled={pending} aria-label={`سحب ${item.label}`} aria-describedby="nav-drag-help"
          ref={element => { const row = element?.closest("li"); if (row) rows.current.set(item.href, row); else rows.current.delete(item.href); }}
          onPointerDown={event => { if (event.pointerType === "mouse" || pending) return; event.preventDefault(); touchDrag.current = { source: item.href, target: item.href }; setDropTarget(item.href); event.currentTarget.setPointerCapture(event.pointerId); }}
          onPointerMove={event => {
            if (!touchDrag.current) return;
            const list = event.currentTarget.closest("ol");
            if (!list) return;
            const bounds = list.getBoundingClientRect();
            if (event.clientY < bounds.top + 24) list.scrollTop -= 12;
            else if (event.clientY > bounds.bottom - 24) list.scrollTop += 12;
            for (const [href, row] of rows.current) {
              const rect = row.getBoundingClientRect();
              if (event.clientY >= rect.top && event.clientY <= rect.bottom) { touchDrag.current.target = href; setDropTarget(href); break; }
            }
          }}
          onPointerUp={event => { const drag = touchDrag.current; touchDrag.current = null; setDropTarget(null); if (drag && drag.source !== drag.target) move(drag.source, drag.target); if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
          onPointerCancel={() => { touchDrag.current = null; setDropTarget(null); }}
          onLostPointerCapture={() => { touchDrag.current = null; setDropTarget(null); }}
          data-drop-target={dropTarget === item.href || undefined}
        ><GripVertical size={16} aria-hidden="true"/></button><span>{item.label}</span>
        <button type="button" disabled={pending || index===0} aria-label={`رفع ${item.label}`} onClick={() => move(item.href,all[index-1].href)}><ArrowUp size={14}/></button>
        <button type="button" disabled={pending || index===all.length-1} aria-label={`خفض ${item.label}`} onClick={() => move(item.href,all[index+1].href)}><ArrowDown size={14}/></button>
      </li>)}</ol>
      <span id="nav-drag-help" className="sr-only">على الجوال اسحب المقبض إلى القسم المطلوب. بلوحة المفاتيح استخدم زري الرفع والخفض.</span>
      <div className="infro-nav-editor-actions"><button type="button" disabled={pending} onClick={() => save(draft)}>{pending ? "جارٍ الحفظ…" : "حفظ الترتيب"}</button><button type="button" disabled={pending} onClick={() => save([])}>الافتراضي</button></div>
    </div> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
