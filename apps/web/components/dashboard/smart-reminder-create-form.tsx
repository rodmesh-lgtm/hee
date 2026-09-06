"use client";

import { BellPlus, BellRing, Clock3, Mail, MessageCircleMore, Repeat2, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { createSmartReminderAction } from "../../app/actions/smart-reminders";

export function SmartReminderCreateForm({
  templateId,
  recipientLabel,
  emailLabel,
  whatsAppAvailable,
  businessNoteId,
  defaultTitle,
  defaultBody,
}: {
  templateId?: string | null;
  recipientLabel: string;
  emailLabel: string;
  whatsAppAvailable: boolean;
  businessNoteId?: string | null;
  defaultTitle?: string;
  defaultBody?: string;
}) {
  const searchParams = useSearchParams();
  const noteFromQuery = searchParams.get("note")?.trim() || null;
  const effectiveNoteId = businessNoteId ?? noteFromQuery;
  return <form action={createSmartReminderAction} className="space-y-4" onSubmit={(event) => {
    const timezoneInput = event.currentTarget.elements.namedItem("timezone");
    if (timezoneInput instanceof HTMLInputElement) timezoneInput.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }}>
    {templateId ? <input type="hidden" name="templateId" value={templateId} /> : null}
    {effectiveNoteId ? <input type="hidden" name="businessNoteId" value={effectiveNoteId} /> : null}
    <input type="hidden" name="timezone" defaultValue="" />
    {effectiveNoteId ? <div className="rounded-2xl border border-[#bdece6] bg-[#f2fcfa] p-4 text-xs font-bold leading-6 text-[#006f69]">سيتم ربط هذا التذكير بالمذكرة التي فتحت منها النموذج، مع تحقق الخادم من أنها تخص نفس المنشأة.</div> : null}
    <div className="grid gap-4 lg:grid-cols-3">
      <label className="space-y-2 text-sm font-bold text-slate-700">عنوان التذكير<input name="title" required maxLength={160} defaultValue={defaultTitle ?? ""} placeholder="مثال: متابعة عرض السعر" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" /></label>
      <label className="space-y-2 text-sm font-bold text-slate-700">الموعد الأول<span className="relative block"><Clock3 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="datetime-local" name="scheduledLocal" required className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" /></span></label>
      <label className="space-y-2 text-sm font-bold text-slate-700">التكرار<span className="relative block"><Repeat2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><select name="recurrenceType" defaultValue="once" className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10"><option value="once">مرة واحدة</option><option value="daily">يوميًا</option><option value="weekly">أسبوعيًا</option><option value="monthly">شهريًا</option></select></span></label>
    </div>
    <label className="space-y-2 text-sm font-bold text-slate-700">ماذا تريد أن تتذكر؟<textarea name="body" required maxLength={2000} rows={4} defaultValue={defaultBody ?? ""} placeholder="اكتب التفاصيل التي تريد أن تصلك وقت التذكير..." className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" /></label>
    <fieldset className="space-y-3"><legend className="text-sm font-black text-slate-800">اختر قنوات التنبيه</legend><p className="text-xs leading-6 text-slate-500">اختر قناة واحدة أو أكثر. واتساب التذكيرات منفصل عن رقم حملات شركتك ويصل من مرسل INFRO REMINDER المخصص لهذه الخدمة.</p><div className="grid gap-3 md:grid-cols-3"><label className={`flex items-start gap-3 rounded-2xl border p-4 ${whatsAppAvailable ? "cursor-pointer border-[#bdece6] bg-[#f2fcfa]" : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"}`}><input type="checkbox" name="deliveryChannels" value="whatsapp" defaultChecked={whatsAppAvailable} disabled={!whatsAppAvailable} className="mt-1 h-4 w-4 accent-[#009d93]" /><MessageCircleMore className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><span><b className="text-xs text-slate-800">واتساب — INFRO REMINDER</b><small className="mt-1 block text-[11px] leading-5 text-slate-500">{whatsAppAvailable ? `إلى ${recipientLabel} من رقم INFRO المخصص للتذكيرات عبر Meta الرسمي.` : "يتاح تلقائيًا بعد اعتماد وتشغيل رقم INFRO REMINDER المركزي."}</small></span></label><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><input type="checkbox" name="deliveryChannels" value="email" className="mt-1 h-4 w-4 accent-[#009d93]" /><Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><span><b className="text-xs text-slate-800">البريد الإلكتروني</b><small className="mt-1 block text-[11px] leading-5 text-slate-500">إلى بريد الحساب {emailLabel} من reminder@ir.sa.</small></span></label><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><input type="checkbox" name="deliveryChannels" value="in_app" defaultChecked={!whatsAppAvailable} className="mt-1 h-4 w-4 accent-[#009d93]" /><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><span><b className="text-xs text-slate-800">إشعار داخل INFRO</b><small className="mt-1 block text-[11px] leading-5 text-slate-500">يبقى محفوظًا في مركز الإشعارات حتى تقرأه.</small></span></label></div></fieldset>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><div><p className="text-xs font-black text-slate-800">توقيت جهازك</p><p className="mt-1 text-xs leading-6 text-slate-500">يُحدد تلقائيًا لحظة الحفظ، ويحافظ التكرار على نفس الساعة المحلية.</p></div></div></div>
    <label className={`flex items-start gap-3 rounded-2xl border p-4 text-xs leading-6 ${whatsAppAvailable ? "cursor-pointer border-[#bdece6] bg-[#f2fcfa] text-slate-600" : "border-slate-200 bg-slate-50 text-slate-400"}`}><input type="checkbox" name="recipientConsentAccepted" disabled={!whatsAppAvailable} className="mt-1 h-4 w-4 shrink-0 accent-[#009d93]" /><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#009d93]" /><span><b className="text-slate-800">موافقة تذكير واتساب.</b> أوافق على إرسال هذا التذكير إلى رقم النشاط المسجل عبر INFRO REMINDER. هذه الموافقة خاصة بالتذكيرات ولا تُعد موافقة تسويقية عامة.</span></label>
    <div className="rounded-[24px] border border-[#bdece6] bg-[#f2fcfa] p-3 sm:p-4">
      <button type="submit" aria-label="حفظ وتفعيل التذكير" className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#07181b] px-6 py-4 text-base font-black text-white shadow-[0_12px_28px_rgba(7,24,27,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2529] hover:shadow-[0_16px_34px_rgba(7,24,27,0.24)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00aa9f]/25 sm:w-auto sm:min-w-[250px]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#19d6c3] text-[#07181b]"><BellPlus className="h-5 w-5" /></span><span>حفظ وتفعيل التذكير</span></button>
      <p className="mt-2 text-xs font-medium leading-6 text-[#426763]">سيحفظ التذكير ويُرسل في موعده عبر القنوات التي اخترتها فقط.</p>
    </div>
  </form>;
}
