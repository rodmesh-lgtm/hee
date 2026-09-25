"use client";

import Link from "next/link";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { ArrowLeft, Check, CheckCheck, Clock3, MessageCircle, ShoppingBag } from "lucide-react";
import { createWhatsAppAutomationAction } from "../../../actions/whatsapp-marketing";
import { SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE } from "../../../lib/whatsapp/salla-order-confirmation-domain";
import { SALLA_ORDER_DELAY_MINUTES, SALLA_ORDER_SCENARIOS, sallaTemplatePreview } from "../../../lib/whatsapp/salla-order-journey-domain";

type Template = { id: string; name: string; language: string; connectionId: string; body: string };
type Sender = { id: string; label: string };
type Props = { senders: Sender[]; templates: Template[]; businessName: string; storeConnected: boolean; workerReady: boolean; activeScenarios: string[] };
const scenarios = [{ status: "paid", label: "طلب مدفوع ومؤكد", detail: "الترحيب بعد تأكيد الطلب المدفوع", message: SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE }, ...SALLA_ORDER_SCENARIOS];
const field = "mt-2 block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 [[data-dashboard-theme=dark]_&]:border-slate-700 [[data-dashboard-theme=dark]_&]:bg-slate-900 [[data-dashboard-theme=dark]_&]:text-slate-100";

export function SallaOrderConfirmationForm({ senders, templates, businessName, storeConnected, workerReady, activeScenarios }: Props) {
  const [scenario, setScenario] = useState("paid");
  const [senderId, setSenderId] = useState(senders[0]?.id ?? "");
  const [templateId, setTemplateId] = useState("");
  const [delay, setDelay] = useState(0);
  const [copied, setCopied] = useState(false);
  const selected = scenarios.find(item => item.status === scenario)!;
  const available = templates.filter(template => template.connectionId === senderId);
  const selectedTemplate = available.find(template => template.id === templateId);
  const preview = sallaTemplatePreview(selectedTemplate?.body || selected.message, businessName);

  return <section id="salla-journeys" className="overflow-hidden rounded-[28px] border border-slate-200 bg-white [[data-dashboard-theme=dark]_&]:border-slate-700 [[data-dashboard-theme=dark]_&]:bg-slate-950">
    <header className="border-b border-slate-100 bg-gradient-to-l from-teal-50 via-white to-white p-5 sm:p-7 [[data-dashboard-theme=dark]_&]:border-slate-800 [[data-dashboard-theme=dark]_&]:from-teal-950/40 [[data-dashboard-theme=dark]_&]:via-slate-950 [[data-dashboard-theme=dark]_&]:to-slate-950">
      <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-teal-100 px-3 py-1.5 text-xs font-bold text-teal-900 [[data-dashboard-theme=dark]_&]:bg-teal-950 [[data-dashboard-theme=dark]_&]:text-teal-200"><ShoppingBag className="h-4 w-4" aria-hidden="true"/>رحلة العميل مع سلة</span><Link href="/dashboard/working-hours" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-teal-700 [[data-dashboard-theme=dark]_&]:text-teal-300">ربط المتجر والحجوزات<ArrowLeft className="h-4 w-4" aria-hidden="true"/></Link></div>
      <h2 className="mt-4 text-xl font-black text-slate-950 sm:text-2xl [[data-dashboard-theme=dark]_&]:text-white">الرسالة المناسبة، في مرحلة الطلب المناسبة</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600 [[data-dashboard-theme=dark]_&]:text-slate-300">اختر سيناريو جاهزًا وحدد الرقم والقالب والتوقيت. تصل الرسالة للعميل الموافق على واتساب، وتُلغى الرسالة المنتظرة إذا لم تعد حالة الطلب مطابقة.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs"><Readiness ready={storeConnected} label={storeConnected ? "متجر سلة مربوط" : "اربط متجر سلة"}/><Readiness ready={senders.length > 0} label={senders.length ? "رقم رسمي متصل" : "اربط رقم واتساب"}/><Readiness ready={workerReady} label={workerReady ? "تشغيل الإرسال مفعّل" : "تشغيل الإرسال يحتاج تفعيلًا من الإدارة"}/></div>
    </header>
    <div className="p-4 sm:p-7">
      <p className="mb-3 text-sm font-black text-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-200">١. اختر مرحلة الطلب</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4" role="group" aria-label="سيناريوهات طلبات سلة">
        {scenarios.map(item => <button key={item.status} type="button" aria-pressed={scenario === item.status} onClick={() => { setScenario(item.status); setTemplateId(""); setCopied(false); }} className={`min-h-24 rounded-2xl border p-3 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${scenario === item.status ? "border-teal-500 bg-teal-50 text-teal-950 [[data-dashboard-theme=dark]_&]:bg-teal-950 [[data-dashboard-theme=dark]_&]:text-teal-100" : "border-slate-200 bg-white text-slate-700 hover:border-teal-300 [[data-dashboard-theme=dark]_&]:border-slate-700 [[data-dashboard-theme=dark]_&]:bg-slate-900 [[data-dashboard-theme=dark]_&]:text-slate-200"}`}><span className="flex items-center justify-between gap-2 text-sm font-black">{item.label}{activeScenarios.includes(item.status) && <Check className="h-4 w-4 shrink-0 text-teal-600" aria-label="يوجد مسار نشط"/>}</span><span className="mt-2 block text-xs leading-5 opacity-75">{item.detail}</span></button>)}
      </div>
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,.85fr)]">
        <form action={createWhatsAppAutomationAction} className="min-w-0 space-y-4">
          <input type="hidden" name="triggerType" value={scenario === "paid" ? "salla_order_confirmation" : "salla_order_status"}/>
          <input type="hidden" name="orderStatus" value={scenario}/><input type="hidden" name="cooldownMinutes" value="0"/>
          <h3 className="text-sm font-black text-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-200">٢. جهّز الرسالة</h3>
          <label className="block text-sm font-bold text-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-200">اسم المسار<input key={scenario} className={field} name="name" required maxLength={120} defaultValue={`سلة — ${selected.label}`}/></label>
          <label className="block text-sm font-bold text-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-200">رقم الإرسال لهذا السيناريو<select className={field} value={senderId} onChange={event => { setSenderId(event.target.value); setTemplateId(""); }} required>{!senders.length && <option value="">اربط رقم واتساب رسميًا أولًا</option>}{senders.map(sender => <option key={sender.id} value={sender.id}>{sender.label}</option>)}</select></label>
          <label className="block text-sm font-bold text-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-200">القالب المعتمد<select className={field} name="templateId" aria-label="القالب المعتمد" value={templateId} onChange={event => setTemplateId(event.target.value)} required><option value="">اختر قالبًا مناسبًا لحالة «{selected.label}»</option>{available.map(template => <option key={template.id} value={template.id}>{template.name} · {template.language}</option>)}</select></label>
          {!available.length && <p className="rounded-xl bg-amber-50 p-3 text-xs leading-6 text-amber-900 [[data-dashboard-theme=dark]_&]:bg-amber-950/40 [[data-dashboard-theme=dark]_&]:text-amber-200">لا يوجد قالب مؤهل لهذا الرقم. أنشئ قالب Utility نصيًا بالمتغيرات الثلاثة الموضحة ثم انتظر اعتماد Meta. <Link href="/dashboard/whatsapp/templates" className="underline">إدارة القوالب</Link></p>}
          {scenario !== "paid" && <label className="block text-sm font-bold text-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-200">وقت الإرسال بعد تغيّر الحالة<select className={field} name="orderDelayMinutes" value={delay} onChange={event => setDelay(Number(event.target.value))}>{SALLA_ORDER_DELAY_MINUTES.map(minutes => <option key={minutes} value={minutes}>{minutes === 0 ? "في أقرب دورة إرسال" : minutes < 60 ? `بعد ${minutes} دقيقة` : minutes === 1440 ? "بعد يوم" : `بعد ${minutes / 60} ساعة`}</option>)}</select></label>}
          {activeScenarios.includes(scenario) && <p className="text-xs leading-6 text-amber-800 [[data-dashboard-theme=dark]_&]:text-amber-200">يوجد مسار نشط لهذه المرحلة. عند تفعيل مسار أحدث يصبح هو المعتمد للطلبات الجديدة؛ أوقف القديم لتوضيح قائمة مساراتك.</p>}
          <Submit disabled={!selectedTemplate || !senderId}/>
          <p className="text-xs leading-6 text-slate-500 [[data-dashboard-theme=dark]_&]:text-slate-400">تُحفظ كمسودة. فعّلها من قائمة المسارات أدناه. كل طلب يتلقى رسالة واحدة لكل حالة؛ الاستيراد التاريخي لا يُرسل رسائل. تتم المعالجة دوريًا وقد تتأخر عن الوقت المحدد.</p>
        </form>
        <aside className="rounded-3xl bg-slate-100 p-4 sm:p-5 [[data-dashboard-theme=dark]_&]:bg-slate-900">
          <div className="flex items-center gap-2 text-sm font-black text-slate-700 [[data-dashboard-theme=dark]_&]:text-slate-200"><MessageCircle className="h-5 w-5 text-teal-600" aria-hidden="true"/>معاينة توضيحية</div>
          <div className="mt-4 rounded-2xl bg-[#07181b] px-4 py-3 text-sm font-bold text-white">{businessName}</div>
          <div className="min-h-44 rounded-b-2xl bg-teal-50/70 p-4 [[data-dashboard-theme=dark]_&]:bg-teal-950/30"><div className="rounded-2xl rounded-tr-sm bg-white p-4 text-sm leading-8 text-slate-800 shadow-sm [[data-dashboard-theme=dark]_&]:bg-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-100"><p className="whitespace-pre-wrap break-words">{preview}</p><div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-slate-400"><span>مثال فقط</span><CheckCheck className="h-4 w-4 text-sky-500" aria-hidden="true"/></div></div></div>
          <p className="mt-3 text-xs leading-6 text-slate-500 [[data-dashboard-theme=dark]_&]:text-slate-400">{selectedTemplate ? "هذه معاينة نص القالب المختار ببيانات مثال، وليست رسالة مرسلة." : "نص مقترح لإنشاء قالب؛ لن يُرسل حتى تختار قالبًا معتمدًا."}</p>
          <div className="mt-4 rounded-2xl border border-slate-200 p-4 [[data-dashboard-theme=dark]_&]:border-slate-700"><b className="text-xs text-slate-800 [[data-dashboard-theme=dark]_&]:text-slate-200">متغيرات تُعبأ تلقائيًا</b><p className="mt-2 text-xs leading-7 text-slate-600 [[data-dashboard-theme=dark]_&]:text-slate-300">١ اسم العميل المسجل · ٢ اسم المنشأة · ٣ رقم الطلب<br/>عند غياب اسم العميل نستخدم «عميلنا العزيز».</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(selected.message); setCopied(true); } catch { setCopied(false); } }} className="mt-3 min-h-11 rounded-xl border border-teal-200 px-3 text-xs font-bold text-teal-800 focus-visible:ring-2 focus-visible:ring-teal-500 [[data-dashboard-theme=dark]_&]:border-teal-800 [[data-dashboard-theme=dark]_&]:text-teal-200">{copied ? "تم نسخ النص المقترح" : "نسخ نص القالب المقترح"}</button><span role="status" className="sr-only">{copied ? "تم النسخ" : ""}</span></div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-6 text-slate-500 [[data-dashboard-theme=dark]_&]:text-slate-400"><Clock3 className="mt-1 h-4 w-4 shrink-0" aria-hidden="true"/>تُراجع الحالة والموافقة والرقم المتصل قبل الإرسال؛ دفع الطلب وحده لا يُعد موافقة على واتساب.</p>
        </aside>
      </div>
    </div>
  </section>;
}

function Readiness({ ready, label }: { ready: boolean; label: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${ready ? "bg-teal-100 text-teal-900 [[data-dashboard-theme=dark]_&]:bg-teal-950 [[data-dashboard-theme=dark]_&]:text-teal-200" : "bg-amber-50 text-amber-900 [[data-dashboard-theme=dark]_&]:bg-amber-950/40 [[data-dashboard-theme=dark]_&]:text-amber-200"}`}>{ready && <Check className="h-3 w-3" aria-hidden="true"/>}{label}</span>;
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button disabled={disabled || pending} className="min-h-12 w-full rounded-xl bg-[#07181b] px-5 py-3 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:opacity-40 [[data-dashboard-theme=dark]_&]:bg-teal-400 [[data-dashboard-theme=dark]_&]:text-slate-950">{pending ? "جارٍ حفظ المسار…" : "إنشاء كمسودة"}</button>;
}
