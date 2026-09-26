"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateWorkingHoursAction } from "../../app/actions/working-hours";
import { bookingCandidateMinutes, type BookingSchedule } from "../../app/lib/booking-time";
import { validateWorkingHoursWindow } from "../../app/lib/working-hours-validation";

const days = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
type Row = BookingSchedule & { dayOfWeek: number };
const input = "h-12 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:ring-2 focus:ring-teal-500 [[data-dashboard-theme=dark]_&]:border-white/15 [[data-dashboard-theme=dark]_&]:bg-[#10282b] [[data-dashboard-theme=dark]_&]:text-white";
function SaveHours({ invalid }: { invalid: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={pending || invalid} className="min-h-12 rounded-xl bg-[#008f87] px-6 text-sm font-bold text-white disabled:opacity-50">{pending ? "جارٍ حفظ الأوقات…" : "حفظ جدول الأسبوع"}</button>;
}
function display(minute: number) { return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`; }
export function WeeklyBookingHoursEditor({ initial, slotMinutes }: { initial: Row[]; slotMinutes: number }) {
  const [rows, setRows] = useState<Row[]>(() => days.map((_, dayOfWeek) => initial.find(row => row.dayOfWeek === dayOfWeek) ?? { dayOfWeek, isClosed: true, opensAt: "", closesAt: "", secondOpensAt: null, secondClosesAt: null }));
  const [notice, setNotice] = useState("");
  function update(index: number, patch: Partial<Row>) { setRows(current => current.map((row, i) => i === index ? { ...row, ...patch } : row)); }
  function valid(row: Row) { return row.isClosed || validateWorkingHoursWindow({ opensAt: row.opensAt ?? "", closesAt: row.closesAt ?? "", secondOpensAt: row.secondOpensAt ?? "", secondClosesAt: row.secondClosesAt ?? "" }); }
  return <form action={updateWorkingHoursAction} aria-label="جدول أوقات الحجز" className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 [[data-dashboard-theme=dark]_&]:border-white/10 [[data-dashboard-theme=dark]_&]:bg-[#0b2023]">
    <header><p className="text-xs font-bold text-teal-600">أوقاتك، كما تناسب نشاطك</p><h2 className="mt-1 text-xl font-black">جدول أوقات الحجز</h2><p className="mt-2 text-sm leading-7 text-slate-500">فعّل الأيام واختر أوقاتك صباحًا أو مساءً. بعد الحفظ تظهر الفترات تلقائيًا للزوار بحسب مدة الفترة وسعة الفرع. إعداد التاريخ الخاص يتقدم على هذا الجدول.</p><p className="mt-1 text-xs text-slate-500">الأوقات بتوقيت الرياض وبصيغة 24 ساعة: 17:00 تعني الخامسة مساءً. وقت إغلاق أسبق من الفتح يعني الاستمرار بعد منتصف الليل.</p></header>
    {notice ? <p role="status" className="text-sm text-teal-600">{notice}</p> : null}
    {rows.map((row, index) => {
      const candidates = valid(row) ? bookingCandidateMinutes(slotMinutes, row, null) : [];
      return <fieldset key={index} className="min-w-0 space-y-3 rounded-2xl border border-slate-200 p-3 sm:p-4 [[data-dashboard-theme=dark]_&]:border-white/10"><legend className="px-2 font-bold">{days[index]}</legend>
        <div className="flex flex-wrap items-center gap-3"><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={!row.isClosed} onChange={e => update(index, { isClosed: !e.target.checked })} className="h-5 w-5 accent-teal-600"/>متاح للحجز</label>{row.isClosed ? <input type="hidden" name={`closed-${index}`} value="on"/> : null}<span className="text-xs text-slate-500">{row.isClosed ? "مغلق" : "تظهر الفترات بعد الحفظ"}</span></div>
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => update(index, { isClosed: false, opensAt: "09:00", closesAt: "13:00", secondOpensAt: null, secondClosesAt: null })} className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs">صباحي 09:00–13:00</button><button type="button" onClick={() => update(index, { isClosed: false, opensAt: "17:00", closesAt: "22:00", secondOpensAt: null, secondClosesAt: null })} className="min-h-10 rounded-xl border border-slate-200 px-3 text-xs">مسائي 17:00–22:00</button><button type="button" onClick={() => { setRows(rows.map(item => ({ ...row, dayOfWeek: item.dayOfWeek }))); setNotice(`نُسخت أوقات ${days[index]} إلى الأسبوع؛ احفظ لتطبيقها`); }} className="min-h-10 px-3 text-xs text-teal-600">نسخ إلى كل الأيام</button></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid min-w-0 gap-1 text-xs">بداية الفترة<input type="time" dir="ltr" step={60} required={!row.isClosed} name={`opens-${index}`} value={row.opensAt ?? ""} onChange={e => update(index, { opensAt: e.target.value })} className={input}/></label><label className="grid min-w-0 gap-1 text-xs">نهاية الفترة<input type="time" dir="ltr" step={60} required={!row.isClosed} name={`closes-${index}`} value={row.closesAt ?? ""} onChange={e => update(index, { closesAt: e.target.value })} className={input}/></label></div>
        {row.secondOpensAt !== null || row.secondClosesAt !== null ? <div className="space-y-2 rounded-xl bg-teal-500/5 p-3"><div className="flex justify-between text-xs"><b>الفترة الثانية</b><button type="button" onClick={() => update(index, { secondOpensAt: null, secondClosesAt: null })} className="min-h-10 px-2 text-rose-600">حذف الفترة الثانية</button></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid min-w-0 gap-1 text-xs">بداية الفترة الثانية<input type="time" dir="ltr" step={60} required={!row.isClosed} name={`second-opens-${index}`} value={row.secondOpensAt ?? ""} onChange={e => update(index, { secondOpensAt: e.target.value })} className={input}/></label><label className="grid min-w-0 gap-1 text-xs">نهاية الفترة الثانية<input type="time" dir="ltr" step={60} required={!row.isClosed} name={`second-closes-${index}`} value={row.secondClosesAt ?? ""} onChange={e => update(index, { secondClosesAt: e.target.value })} className={input}/></label></div></div> : <button type="button" onClick={() => update(index, { secondOpensAt: "", secondClosesAt: "" })} className="min-h-11 rounded-xl border border-dashed border-teal-500 px-4 text-xs text-teal-600">إضافة فترة ثانية</button>}
        {!valid(row) ? <p role="alert" className="text-xs text-rose-600">أكمل البداية والنهاية وتأكد من عدم تداخل الفترتين.</p> : !row.isClosed ? <p className="text-xs leading-6 text-slate-500">{candidates.length ? `معاينة بدايات الفترات: ${candidates.slice(0, 6).map(display).join(" · ")}${candidates.length > 6 ? " …" : ""}` : "مدة الفترة أطول من أوقات العمل؛ وسّع الوقت أو عدّل مدة الفترة."}</p> : null}
      </fieldset>;
    })}
    <footer className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">المعاينة تستخدم مدة الفترة الافتراضية. الفروع تستخدم المدة المحددة لكل فرع.</p><SaveHours invalid={rows.some(row => !valid(row))}/></footer>
  </form>;
}
