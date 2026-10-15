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
      <p>اسحب الأقسام أو استخدم الأسهم. يُحفظ ترتيبك في حسابك على جميع أجهزتك.</p>
      <ol>{orderDashboardItems(items, draft).map((item, index, all) => <li key={item.href} draggable={!pending} onDragStart={event => { dragged.current=item.href; event.dataTransfer.effectAllowed="move"; event.dataTransfer.setData("text/plain",item.href); }} onDragEnd={() => { dragged.current=null; }} onDragOver={event => { if (!pending && dragged.current) { event.preventDefault(); event.dataTransfer.dropEffect="move"; } }} onDrop={event => { event.preventDefault(); if (!pending && dragged.current) move(dragged.current,item.href); dragged.current=null; }}>
        <GripVertical size={14} aria-hidden="true"/><span>{item.label}</span>
        <button type="button" disabled={pending || index===0} aria-label={`رفع ${item.label}`} onClick={() => move(item.href,all[index-1].href)}><ArrowUp size={14}/></button>
        <button type="button" disabled={pending || index===all.length-1} aria-label={`خفض ${item.label}`} onClick={() => move(item.href,all[index+1].href)}><ArrowDown size={14}/></button>
      </li>)}</ol>
      <div className="infro-nav-editor-actions"><button type="button" disabled={pending} onClick={() => save(draft)}>{pending ? "جارٍ الحفظ…" : "حفظ الترتيب"}</button><button type="button" disabled={pending} onClick={() => save([])}>الافتراضي</button></div>
    </div> : null}
    {message ? <p role="status">{message}</p> : null}
  </div>;
}
