"use client";

import { BellPlus, BellRing, CalendarClock, Clock3, Mail, MessageCircleMore, Repeat2, ShieldCheck, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createSmartReminderAction } from "../../app/actions/smart-reminders";

function localDateTimeValue(value: Date) {
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function schedulePreset(kind: "hour" | "tomorrow" | "three-days" | "week") {
  const value = new Date();
  if (kind === "hour") value.setHours(value.getHours() + 1);
  if (kind === "tomorrow") value.setDate(value.getDate() + 1);
  if (kind === "three-days") value.setDate(value.getDate() + 3);
  if (kind === "week") value.setDate(value.getDate() + 7);
  value.setSeconds(0, 0);
  return localDateTimeValue(value);
}

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
  const noteFromQuery = searchParams.get("note")?.trim() || searchParams.get("noteId")?.trim() || null;
  const effectiveNoteId = businessNoteId ?? noteFromQuery;
  const effectiveTitle = defaultTitle ?? searchParams.get("title")?.slice(0, 160) ?? "";
  const effectiveBody = defaultBody ?? searchParams.get("body")?.slice(0, 2000) ?? "";
  const [scheduledLocal, setScheduledLocal] = useState(() => searchParams.get("scheduledLocal")?.slice(0, 16) ?? "");
  const [formMessage, setFormMessage] = useState("");

  return <form action={createSmartReminderAction} className="space-y-5" onSubmit={(event) => {
    const form = event.currentTarget;
    const timezoneInput = form.elements.namedItem("timezone");
    if (timezoneInput instanceof HTMLInputElement) timezoneInput.value = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

    const selectedChannels = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="deliveryChannels"]:checked'));
    if (selectedChannels.length === 0) {
      event.preventDefault();
      setFormMessage("اختر قناة تنبيه واحدة على الأقل قبل تفعيل التذكير.");
      return;
    }
    const whatsappSelected = selectedChannels.some((input) => input.value === "whatsapp");
    const consent = form.elements.namedItem("recipientConsentAccepted");
    if (whatsappSelected && consent instanceof HTMLInputElement && !consent.checked) {
      event.preventDefault();
      setFormMessage("لتفعيل واتساب، وافق أولًا على إرسال هذا التذكير إلى رقم النشاط المسجل.");
      return;
    }
    setFormMessage("");
  }}>
    {templateId ? <input type="hidden" name="templateId" value={templateId} /> : null}
    {effectiveNoteId ? <input type="hidden" name="businessNoteId" value={effectiveNoteId} /> : null}
    <input type="hidden" name="timezone" defaultValue="" />

    {effectiveNoteId ? <div className="relative overflow-hidden rounded-[22px] border border-[#bdece6] bg-[#f2fcfa] p-4 sm:p-5">
      <div className="absolute -left-10 -top-12 h-28 w-28 rounded-full bg-[#25d9c6]/10 blur-2xl" />
      <div className="relative flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#d8f8f3] text-[#007f76]"><Sparkles className="h-5 w-5" /></span>
        <div><p className="text-xs font-black text-[#006f69]">ذاكرة الأعمال ← تذكير ذكي</p><p className="mt-1 text-xs font-medium leading-6 text-slate-600">هذا التذكير مرتبط بالمذكرة التي أتيت منها. سيتحقق الخادم من أن المذكرة والتذكير يخصان المنشأة نفسها، وتبقى المذكرة مرجعًا لسياق التنفيذ.</p></div>
      </div>
    </div> : null}

    <section className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e9fbf8] text-[#009d93]"><CalendarClock className="h-5 w-5" /></span><div><p className="text-sm font-black text-slate-900">متى تريد أن يصلك التنبيه؟</p><p className="mt-1 text-[11px] leading-5 text-slate-500">اختر الموعد بنفسك أو استخدم أحد الاختصارات السريعة. جميعها تعتمد وقت جهازك الحالي دون تغيير المنطقة الزمنية.</p></div></div>
      <div className="mb-4 flex flex-wrap gap-2" aria-label="اختصارات موعد التذكير">
        {([[
          "hour", "بعد ساعة"
        ], ["tomorrow", "غدًا في نفس الوقت"], ["three-days", "بعد 3 أيام"], ["week", "بعد أسبوع"]] as const).map(([kind, label]) => <button key={kind} type="button" onClick={() => setScheduledLocal(schedulePreset(kind))} className="min-h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:border-[#8edfd6] hover:bg-[#f2fcfa] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00aa9f]/15">{label}</button>)}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <label className="space-y-2 text-sm font-bold text-slate-700">عنوان التذكير<input name="title" required maxLength={160} defaultValue={effectiveTitle} placeholder="مثال: متابعة عرض السعر" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" /></label>
        <label className="space-y-2 text-sm font-bold text-slate-700">الموعد الأول<span className="relative block"><Clock3 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input type="datetime-local" name="scheduledLocal" required value={scheduledLocal} onChange={(event) => setScheduledLocal(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" /></span></label>
        <label className="space-y-2 text-sm font-bold text-slate-700">التكرار<span className="relative block"><Repeat2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><select name="recurrenceType" defaultValue="once" className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10"><option value="once">مرة واحدة</option><option value="daily">يوميًا</option><option value="weekly">أسبوعيًا</option><option value="monthly">شهريًا</option></select></span></label>
      </div>
      <label className="mt-4 block space-y-2 text-sm font-bold text-slate-700">ماذا تريد أن تتذكر؟<textarea name="body" required maxLength={2000} rows={4} defaultValue={effectiveBody} placeholder="اكتب التفاصيل التي تريد أن تصلك وقت التذكير..." className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" /></label>
    </section>

    <fieldset className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><legend className="px-2 text-sm font-black text-slate-800">اختر قنوات التنبيه</legend><p className="mb-4 mt-1 text-xs leading-6 text-slate-500">يمكنك اختيار قناة واحدة أو أكثر. واتساب التذكيرات منفصل عن رقم حملات شركتك ويصل من مرسل INFRO REMINDER المخصص لهذه الخدمة.</p><div className="grid gap-3 md:grid-cols-3"><label className={`flex items-start gap-3 rounded-2xl border p-4 transition ${whatsAppAvailable ? "cursor-pointer border-[#bdece6] bg-[#f2fcfa] hover:border-[#82dcd1]" : "cursor-not-allowed border-slate-200 bg-slate-100 opacity-60"}`}><input type="checkbox" name="deliveryChannels" value="whatsapp" defaultChecked={whatsAppAvailable} disabled={!whatsAppAvailable} className="mt-1 h-4 w-4 accent-[#009d93]" /><MessageCircleMore className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><span><b className="text-xs text-slate-800">واتساب — INFRO REMINDER</b><small className="mt-1 block text-[11px] leading-5 text-slate-500">{whatsAppAvailable ? `إلى ${recipientLabel} من رقم INFRO المخصص للتذكيرات عبر Meta الرسمي.` : "يتاح تلقائيًا بعد اعتماد وتشغيل رقم INFRO REMINDER المركزي."}</small></span></label><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#8edfd6] hover:bg-[#f6fcfb]"><input type="checkbox" name="deliveryChannels" value="email" className="mt-1 h-4 w-4 accent-[#009d93]" /><Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><span><b className="text-xs text-slate-800">البريد الإلكتروني</b><small className="mt-1 block text-[11px] leading-5 text-slate-500">إلى بريد الحساب {emailLabel} من reminder@ir.sa.</small></span></label><label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-[#8edfd6] hover:bg-[#f6fcfb]"><input type="checkbox" name="deliveryChannels" value="in_app" defaultChecked={!whatsAppAvailable} className="mt-1 h-4 w-4 accent-[#009d93]" /><BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><span><b className="text-xs text-slate-800">إشعار داخل INFRO</b><small className="mt-1 block text-[11px] leading-5 text-slate-500">يبقى محفوظًا في مركز الإشعارات حتى تقرأه.</small></span></label></div></fieldset>

    <div className="grid gap-3 md:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><div><p className="text-xs font-black text-slate-800">توقيت جهازك</p><p className="mt-1 text-xs leading-6 text-slate-500">تُحفظ المنطقة الزمنية تلقائيًا لحظة التفعيل، ويحافظ التكرار على نفس الساعة المحلية.</p></div></div></div><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]" /><div><p className="text-xs font-black text-slate-800">تنبيه وليس حملة</p><p className="mt-1 text-xs leading-6 text-slate-500">قنوات التذكير مستقلة عن الموافقات التسويقية، ولا تغيّر إعدادات حملات واتساب أو قوائم العملاء.</p></div></div></div></div>

    <label className={`flex items-start gap-3 rounded-2xl border p-4 text-xs leading-6 ${whatsAppAvailable ? "cursor-pointer border-[#bdece6] bg-[#f2fcfa] text-slate-600" : "border-slate-200 bg-slate-50 text-slate-400"}`}><input type="checkbox" name="recipientConsentAccepted" disabled={!whatsAppAvailable} className="mt-1 h-4 w-4 shrink-0 accent-[#009d93]" /><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#009d93]" /><span><b className="text-slate-800">موافقة تذكير واتساب.</b> أوافق على إرسال هذا التذكير إلى رقم النشاط المسجل عبر INFRO REMINDER. هذه الموافقة خاصة بالتذكيرات ولا تُعد موافقة تسويقية عامة.</span></label>

    {formMessage ? <p role="alert" aria-live="polite" className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-black leading-6 text-amber-900">{formMessage}</p> : null}

    <div className="rounded-[24px] border border-[#bdece6] bg-[#f2fcfa] p-3 sm:p-4"><button type="submit" aria-label="حفظ وتفعيل التذكير" className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#07181b] px-6 py-4 text-base font-black text-white shadow-[0_12px_28px_rgba(7,24,27,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0b2529] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#00aa9f]/25 sm:w-auto sm:min-w-[250px]"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#19d6c3] text-[#07181b]"><BellPlus className="h-5 w-5" /></span><span>حفظ وتفعيل التذكير</span></button><p className="mt-2 text-xs font-medium leading-6 text-[#426763]">لن يُرسل شيء الآن. سيُحفظ التذكير ويعمل فقط في الموعد والقنوات التي اخترتها.</p></div>
  </form>;
}
