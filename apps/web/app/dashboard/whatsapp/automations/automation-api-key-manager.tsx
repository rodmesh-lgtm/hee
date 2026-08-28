"use client";

import { useActionState } from "react";
import { ConfirmSubmitButton } from "../../../../components/dashboard/confirm-submit-button";
import { createWhatsAppAutomationApiKeyAction, revokeWhatsAppAutomationApiKeyAction, type AutomationApiKeyActionState } from "../../../actions/whatsapp-marketing";

type SafeKey = { id: string; name: string; keyPrefix: string; status: string; createdAt: string; lastUsedAt: string | null; revokedAt: string | null };
const initialState: AutomationApiKeyActionState = { status: "idle" };

export function AutomationApiKeyManager({ keys }: { keys: SafeKey[] }) {
  const [state, createAction, pending] = useActionState(createWhatsAppAutomationApiKeyAction, initialState);
  return <section className="rounded-[24px] border bg-white p-5">
    <h2 className="font-black text-[#20264f]">مفاتيح أحداث API</h2>
    <p className="mt-2 text-xs leading-6 text-slate-500">المفتاح خاص بهذا النشاط ويُعرض مرة واحدة فقط. خزّنه في مدير أسرار، ولا تضعه في المتصفح أو السجلات.</p>
    <form action={createAction} className="mt-4 flex flex-wrap gap-2">
      <input name="name" required maxLength={80} className="h-11 min-w-52 flex-1 rounded-xl border px-3 text-xs" placeholder="مثال: تكامل المتجر" />
      <button disabled={pending} className="min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-xs font-black text-white disabled:bg-slate-300">{pending ? "جارٍ الإنشاء…" : "إنشاء مفتاح"}</button>
    </form>
    {state.status === "created" && state.plaintext ? <div role="status" className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3"><b className="block text-xs text-amber-900">انسخ المفتاح الآن؛ لن يظهر مجددًا:</b><code dir="ltr" className="mt-2 block overflow-x-auto select-all whitespace-nowrap rounded-lg bg-white p-3 text-xs text-slate-900">{state.plaintext}</code></div> : null}
    {state.status === "failed" ? <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{state.error}</p> : null}
    <div className="mt-4 space-y-2">{keys.map((key) => <div key={key.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3"><div><b className="text-xs text-[#20264f]">{key.name}</b><code dir="ltr" className="ms-2 text-[10px] text-slate-500">{key.keyPrefix}…</code><span className={`ms-2 rounded-full px-2 py-1 text-[9px] font-black ${key.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{key.status === "active" ? "نشط" : "ملغي"}</span><span className="mt-1 block text-[10px] text-slate-400">آخر استخدام: {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" }) : "لم يُستخدم"}</span></div>{key.status === "active" ? <form action={revokeWhatsAppAutomationApiKeyAction}><input type="hidden" name="keyId" value={key.id} /><ConfirmSubmitButton label="إلغاء المفتاح" showIcon={false} className="rounded-lg bg-rose-50 px-3 py-2 text-[10px] font-black text-rose-700" confirmMessage="إلغاء المفتاح يوقف جميع التكاملات التي تستخدمه فورًا ولا يمكن التراجع عنه. هل تريد المتابعة؟" /></form> : null}</div>)}{!keys.length ? <p className="text-xs text-slate-400">لا توجد مفاتيح بعد.</p> : null}</div>
    <div className="mt-4 rounded-xl bg-[#faf9fd] p-3 text-[11px] leading-6 text-slate-600"><code dir="ltr">POST /api/whatsapp/automations/events</code><p>أرسل Bearer key مع JSON يحوي: eventId، eventName، subjectId اختياريًا، وواحدًا فقط من contactId أو phoneE164 بصيغة E.164. الطلب يُسجل كحدث durable ولا يرسل إلى Meta مباشرة.</p></div>
    <div className="mt-2 rounded-xl bg-[#faf9fd] p-3 text-[11px] leading-6 text-slate-600"><code dir="ltr">POST /api/whatsapp/automations/carts</code><p>أرسل eventId وcartId وstate بقيمة abandoned أو recovered أو completed وoccurredAt، مع واحد فقط من contactId أو phoneE164. كل انتقال متين وقابل لإعادة التشغيل؛ الاسترداد أو الإكمال يلغي الإرسال المعلق.</p></div>
  </section>;
}
