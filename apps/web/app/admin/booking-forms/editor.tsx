"use client";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveBookingFormsAction } from "../../actions/admin-booking-forms";
import { DEFAULT_BOOKING_FORM, type BookingForm, type BookingFormCatalog } from "../../lib/booking-form-domain";

const input = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal-500 [[data-dashboard-theme=dark]_&]:border-white/15 [[data-dashboard-theme=dark]_&]:bg-[#10282b] [[data-dashboard-theme=dark]_&]:text-white";
const card = "rounded-2xl border border-slate-200 bg-white p-4 [[data-dashboard-theme=dark]_&]:border-white/10 [[data-dashboard-theme=dark]_&]:bg-[#0b2023]";
export function BookingFormsEditor({ initial }: { initial: BookingFormCatalog }) {
  const [catalog, setCatalog] = useState(initial);
  const [selectedId, setSelectedId] = useState(initial.activeId);
  const [state, action, pending] = useActionState(saveBookingFormsAction, {});
  const form = catalog.forms.find(item => item.id === selectedId) ?? catalog.forms[0];
  function update(patch: Partial<BookingForm>) { setCatalog(current => ({ ...current, forms: current.forms.map(item => item.id === form.id ? { ...item, ...patch } : item) })); }
  function addForm() {
    const id = crypto.randomUUID();
    setCatalog(current => ({ ...current, forms: [...current.forms, { ...DEFAULT_BOOKING_FORM, id, title: "نموذج حجز جديد", fields: [] }] }));
    setSelectedId(id);
  }
  function removeForm() {
    const forms = catalog.forms.filter(item => item.id !== form.id);
    if (!forms.length) return;
    setCatalog({ ...catalog, forms, activeId: catalog.activeId === form.id ? forms[0].id : catalog.activeId });
    setSelectedId(forms[0].id);
  }
  return <form action={action} className="space-y-4">
    <input type="hidden" name="catalog" value={JSON.stringify(catalog)}/>
    <fieldset disabled={pending} className="grid min-w-0 gap-5 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4"><section className={card}><div className="flex flex-wrap gap-2">{catalog.forms.map(item => <button key={item.id} type="button" aria-pressed={form.id === item.id} onClick={() => setSelectedId(item.id)} className={`min-h-11 rounded-xl border px-3 text-sm ${form.id === item.id ? "border-teal-500 bg-teal-500/10 text-teal-600" : "border-slate-200"}`}>{item.title}</button>)}<button type="button" disabled={catalog.forms.length >= 8} onClick={addForm} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-teal-500 px-3 text-sm text-teal-600"><Plus size={16}/>إضافة نموذج</button></div></section>
      <section className={`${card} space-y-4`}><div className="flex items-center justify-between gap-3"><h2 className="font-black">إعداد النموذج</h2><button type="button" disabled={catalog.forms.length === 1} onClick={removeForm} className="min-h-11 text-sm text-rose-600 disabled:opacity-40">حذف النموذج</button></div>
        <label className="grid gap-2 text-sm">عنوان النموذج<input className={input} maxLength={80} required value={form.title} onChange={e => update({ title: e.target.value })}/></label>
        <label className="grid gap-2 text-sm">وصف قصير<input className={input} maxLength={240} required value={form.description} onChange={e => update({ description: e.target.value })}/></label>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={form.notesEnabled} onChange={e => update({ notesEnabled: e.target.checked })}/>إظهار الملاحظة الاختيارية</label>
        <label className="grid gap-2 text-sm">عنوان الملاحظة<input className={input} maxLength={120} required value={form.notesLabel} onChange={e => update({ notesLabel: e.target.value })}/></label>
        <p className="rounded-xl bg-teal-500/10 p-3 text-xs leading-6">رقم الجوال والموعد حقول أساسية. يظهر اختيار الخدمة والفرع عند تعدد الخيارات. موافقة واتساب مستقلة ولا تُحذف من إعدادات النموذج.</p>
      </section>
      <section className={`${card} space-y-4`}><h2 className="font-black">الحقول الإضافية</h2>{form.fields.length === 0 ? <p className="text-sm text-slate-500">النموذج مختصر؛ لا توجد حقول إضافية.</p> : null}
        {form.fields.map((field, index) => <div key={field.id} className="space-y-3 rounded-xl border border-slate-200 p-3"><div className="flex items-center justify-between"><b className="text-sm">حقل {index + 1}</b><button type="button" aria-label={`حذف الحقل ${index + 1}`} onClick={() => update({ fields: form.fields.filter(item => item.id !== field.id) })} className="grid h-11 w-11 place-items-center text-rose-600"><Trash2 size={17}/></button></div>
          <label className="grid gap-1 text-xs">عنوان الحقل<input className={input} required maxLength={100} value={field.label} onChange={e => update({ fields: form.fields.map(item => item.id === field.id ? { ...item, label: e.target.value } : item) })}/></label>
          <label className="grid gap-1 text-xs">نوع الحقل<select className={input} value={field.type} onChange={e => update({ fields: form.fields.map(item => item.id === field.id ? { ...item, type: e.target.value as typeof field.type, options: e.target.value === "select" && !item.options.length ? ["الخيار الأول"] : item.options } : item) })}><option value="text">نص قصير</option><option value="textarea">نص متعدد الأسطر</option><option value="select">قائمة خيارات</option></select></label>
          {field.type === "select" ? <label className="grid gap-1 text-xs">الخيارات؛ كل خيار في سطر<textarea className={input} value={field.options.join("\n")} onChange={e => update({ fields: form.fields.map(item => item.id === field.id ? { ...item, options: e.target.value.split("\n") } : item) })}/></label> : null}
          <label className="flex min-h-11 items-center gap-2 text-xs"><input type="checkbox" checked={field.required} onChange={e => update({ fields: form.fields.map(item => item.id === field.id ? { ...item, required: e.target.checked } : item) })}/>إلزامي</label>
        </div>)}
        <button type="button" disabled={form.fields.length >= 8} onClick={() => update({ fields: [...form.fields, { id: crypto.randomUUID(), label: "حقل جديد", type: "text", required: false, options: [] }] })} className="min-h-11 rounded-xl border border-teal-500 px-4 text-sm text-teal-600">إضافة حقل</button>
      </section></div>
      <aside className={`${card} h-fit space-y-4 lg:sticky lg:top-24`}><p className="text-xs text-teal-600">معاينة مباشرة</p><h2 className="text-xl font-black">{form.title}</h2><p className="text-sm leading-7 text-slate-500">{form.description}</p><div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm">رقم الجوال</div><div className="rounded-xl bg-teal-500/10 p-4 text-sm">اختر اليوم والفترة المناسبة</div>{form.fields.map(field => <div key={field.id} className="rounded-xl border border-dashed border-slate-300 p-3 text-sm">{field.label}{field.required ? " *" : " (اختياري)"}</div>)}{form.notesEnabled ? <div className="rounded-xl border border-dashed border-slate-300 p-3 text-sm">{form.notesLabel}</div> : null}<label className="grid gap-2 text-sm">النموذج المختار للنشر<select aria-label="النموذج المختار للنشر" className={input} value={catalog.activeId} onChange={e => setCatalog({ ...catalog, activeId: e.target.value })}>{catalog.forms.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></aside>
    </fieldset>
    {state.error ? <p role="alert" className="text-sm text-rose-600">{state.error}</p> : null}{state.saved ? <p role="status" className="text-sm text-teal-600">{state.saved}</p> : null}
    <div className="sticky bottom-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl [[data-dashboard-theme=dark]_&]:bg-[#0b2023]"><button disabled={pending} name="intent" value="draft" className="min-h-11 rounded-xl border border-slate-200 px-5 text-sm">حفظ مسودة</button><button disabled={pending} name="intent" value="publish" className="min-h-11 rounded-xl bg-[#008f87] px-5 text-sm font-bold text-white">{pending ? "جارٍ الحفظ…" : "نشر النموذج المختار"}</button></div>
  </form>;
}
