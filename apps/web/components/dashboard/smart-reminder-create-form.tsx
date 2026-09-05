"use client";

import { useEffect, useMemo, useState } from "react";
import { BellPlus, Clock3, MessageCircleMore, Repeat2, ShieldCheck } from "lucide-react";
import { createSmartReminderAction } from "../../app/actions/smart-reminders";

function localMinimum() {
  const now = new Date(Date.now() + 5 * 60_000);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function SmartReminderCreateForm({ templateId, recipientLabel }: { templateId: string; recipientLabel: string }) {
  const [timezone, setTimezone] = useState("");
  const minimum = useMemo(localMinimum, []);
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) setTimezone(detected);
  }, []);

  return <form action={createSmartReminderAction} className="space-y-4">
    <input type="hidden" name="templateId" value={templateId} />
    <input type="hidden" name="timezone" value={timezone} />
    <div className="grid gap-4 lg:grid-cols-3">
      <label className="space-y-2 text-sm font-bold text-slate-700">
        عنوان التذكير
        <input name="title" required maxLength={160} placeholder="مثال: متابعة عرض السعر" className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" />
      </label>
      <label className="space-y-2 text-sm font-bold text-slate-700">
        الموعد الأول
        <span className="relative block"><Clock3 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input type="datetime-local" name="scheduledLocal" required min={minimum} className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" /></span>
      </label>
      <label className="space-y-2 text-sm font-bold text-slate-700">
        التكرار
        <span className="relative block"><Repeat2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><select name="recurrenceType" defaultValue="once" className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-11 text-sm text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10"><option value="once">مرة واحدة</option><option value="daily">يوميًا</option><option value="weekly">أسبوعيًا</option><option value="monthly">شهريًا</option></select></span>
      </label>
    </div>
    <label className="space-y-2 text-sm font-bold text-slate-700">
      ماذا تريد أن تتذكر؟
      <textarea name="body" required maxLength={2000} rows={4} placeholder="اكتب التفاصيل التي تريد أن تصلك وقت التذكير..." className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-[#00aa9f] focus:ring-4 focus:ring-[#00aa9f]/10" />
    </label>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><MessageCircleMore className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]"/><div><p className="text-xs font-black text-slate-800">إشعار واتساب</p><p className="mt-1 text-xs leading-6 text-slate-500">سيصل التذكير إلى {recipientLabel}. لن يُستخدم لإرسال رسائل لأرقام خارج حسابك.</p></div></div>
      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-[#009d93]"/><div><p className="text-xs font-black text-slate-800">توقيت جهازك</p><p className="mt-1 text-xs leading-6 text-slate-500">{timezone || "جارٍ تحديد المنطقة الزمنية بأمان..."}</p><p className="mt-1 text-[10px] leading-5 text-slate-400">التكرار يحافظ على نفس الساعة المحلية حتى عند تغير التوقيت الصيفي.</p></div></div>
    </div>
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#bdece6] bg-[#f2fcfa] p-4 text-xs leading-6 text-slate-600"><input type="checkbox" name="recipientConsentAccepted" required className="mt-1 h-4 w-4 shrink-0 accent-[#009d93]"/><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#009d93]"/><span><b className="text-slate-800">أوافق على استلام هذا التذكير وتكراراته المختارة عبر واتساب على رقم النشاط المسجل.</b><br/>هذه الموافقة خاصة بخدمة التذكيرات ولا تمنح موافقة تسويقية عامة.</span></label>
    <button disabled={!timezone} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#07181b] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0b2529] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"><BellPlus className="h-4 w-4"/>إضافة التذكير</button>
  </form>;
}
