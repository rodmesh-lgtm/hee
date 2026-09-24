"use client";

import { useState } from "react";
import { createWhatsAppAutomationAction } from "../../../actions/whatsapp-marketing";
import { SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE } from "../../../lib/whatsapp/salla-order-confirmation-domain";

type Template = { id: string; name: string; language: string; connectionId: string };
type Sender = { id: string; label: string };

export function SallaOrderConfirmationForm({ senders, templates }: { senders: Sender[]; templates: Template[] }) {
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const available = templates.filter(template => template.connectionId === senderId);
  const field = "mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900";
  return <section className="rounded-3xl border border-slate-200 bg-white p-5">
    <h2 className="text-lg font-black text-slate-950">رسالة تلقائية عند تأكيد طلب سلة</h2>
    <p className="mt-2 text-sm leading-7 text-slate-600">اختر رقمًا مخصصًا لهذه الرسائل وقالبًا معتمدًا عليه. تُرسل مرة لكل طلب جديد مدفوع ومؤكد بعد تفعيل المسار، للعملاء الذين لديهم موافقة واتساب مسجلة. لا تُرسل للطلبات التاريخية المستوردة.</p>
    <form action={createWhatsAppAutomationAction} className="mt-4 space-y-4">
      <input type="hidden" name="triggerType" value="salla_order_confirmation" />
      <input type="hidden" name="cooldownMinutes" value="0" />
      <label className="block text-sm font-bold">اسم المسار<input className={field} name="name" required maxLength={120} defaultValue="تأكيد طلب سلة" /></label>
      <label className="block text-sm font-bold">رقم الإرسال لهذه الخاصية<select className={field} value={senderId} onChange={event => setSenderId(event.target.value)} required>
        {!senders.length && <option value="">اربط رقم واتساب رسميًا أولًا</option>}
        {senders.map(sender => <option key={sender.id} value={sender.id}>{sender.label}</option>)}
      </select></label>
      <label className="block text-sm font-bold">قالب رسالة تأكيد الطلب<select key={senderId} className={field} name="templateId" required defaultValue="">
        <option value="">اختر قالبًا معتمدًا على الرقم المحدد</option>
        {available.map(template => <option key={template.id} value={template.id}>{template.name} · {template.language}</option>)}
      </select></label>
      <p className="text-sm leading-7 text-slate-600">متغيرات القالب: 1 اسم العميل المسجل في جهات الاتصال، 2 اسم المنشأة، 3 رقم الطلب. عند غياب الاسم تستخدم عبارة «عميلنا العزيز». يمكنك تخصيص نص القالب من قسم القوالب ثم انتظار اعتماده من Meta.</p>
      <blockquote className="rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-800">{SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE}</blockquote>
      {!available.length && <p className="text-sm text-amber-800">لا يوجد قالب مؤهل لهذا الرقم؛ استخدم قالبًا نصيًا بمتغيرات النص الثلاثة فقط.</p>}
      <button disabled={!available.length} className="min-h-11 rounded-xl bg-[#07181b] px-5 py-2 font-bold text-white disabled:opacity-40">إنشاء كمسودة</button>
      <p className="text-xs leading-6 text-slate-500">راجع المسار ثم فعّله من القائمة أدناه. للإيقاف استخدم «إيقاف مؤقت». لتغيير الرقم أو القالب، أوقف المسار السابق قبل إنشاء بديله. الإرسال عبر عامل التشغيل الدوري وليس لحظيًا مضمونًا.</p>
    </form>
  </section>;
}
