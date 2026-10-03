"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { disconnectWhatsAppConnectionAction } from "../../../actions/whatsapp-marketing";

export function DisconnectConnection({ connectionId, label }: { connectionId: string; label: string }) {
  const [open, setOpen] = useState(false);
  return <section className="mt-5 rounded-2xl border border-rose-200 bg-white p-4">
    <h3 className="text-sm font-bold text-slate-900">إدارة ارتباط الرقم</h3>
    <p className="mt-2 text-xs leading-6 text-slate-600">إلغاء ربط {label} من INFRO يوقف استخدامه للتسويق والحجوزات والردود والتذكيرات. يبقى الرقم وحساب واتساب لدى Meta وسجل العمليات السابقة محفوظًا.</p>
    {!open ? <button type="button" onClick={() => setOpen(true)} className="mt-3 min-h-11 rounded-xl border border-rose-300 px-4 text-sm font-bold text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-400">إلغاء ربط الرقم</button> : <form action={disconnectWhatsAppConnectionAction} className="mt-3 space-y-3">
      <input type="hidden" name="connectionId" value={connectionId}/>
      <p className="text-xs leading-6 text-slate-600">تُلغى الحملات غير المكتملة والرسائل المنتظرة على هذا الرقم وتتوقف أتمتته. الرسائل التي دخلت الإرسال بالفعل قد تصل. إعادة الربط تتطلب تفويض Meta جديدًا، ولا تعيد تشغيل الحملات الملغاة.</p>
      <label className="flex items-start gap-2 text-sm text-slate-900"><input required type="checkbox" name="confirmDisconnect" className="mt-1"/>أؤكد إلغاء ربط هذا الرقم وإيقاف استخدامه في المنشأة</label>
      <div className="flex flex-wrap gap-2"><DisconnectSubmit/><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl border border-slate-200 px-4 text-sm text-slate-900">رجوع</button></div>
    </form>}
  </section>;
}
function DisconnectSubmit() { const { pending } = useFormStatus(); return <button disabled={pending} type="submit" className="min-h-11 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white disabled:opacity-50">{pending ? "جارٍ إلغاء الربط…" : "تأكيد إلغاء الربط"}</button>; }
