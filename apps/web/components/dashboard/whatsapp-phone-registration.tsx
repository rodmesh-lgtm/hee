"use client";
import { useState, type FormEvent } from "react";
export function WhatsAppPhoneRegistration({ connectionId, phone }: { connectionId: string; phone: string }) {
  const [state, setState] = useState<"unknown" | "needs_registration" | "registered">("unknown");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function perform(operation: "check" | "register", form?: HTMLFormElement) {
    setBusy(true); setMessage("");
    const data = form ? new FormData(form) : null;
    try {
      const response = await fetch("/api/dashboard/whatsapp/phone-registration", { method: "POST", headers: { "content-type": "application/json" }, cache: "no-store", body: JSON.stringify({ connectionId, operation, ...(data ? { pin: data.get("pin"), confirm: data.get("confirm") === "on" } : {}) }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "تعذر إكمال العملية.");
      setState(result.state);
      setMessage(result.state === "registered" ? "أكدت Meta تسجيل الرقم للإرسال. يمكن استخدامه للإشعارات المفعّلة؛ لم يتم إرسال رسالة تجريبية." : "الرقم موثّق لدى Meta لكنه يحتاج إكمال التسجيل للإرسال.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "تعذر إكمال العملية."); }
    finally { form?.reset(); setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void perform("register", event.currentTarget); }
  return <div id="phone-registration" className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
    <h3 className="font-bold">تسجيل رقم واتساب للإرسال</h3>
    <p className="mt-2 text-sm leading-7">رقم المنشأة: <b dir="ltr">{phone}</b>. الربط واعتماد القالب لا يكفيان؛ يجب أن تؤكد Meta تسجيل الرقم للإرسال.</p>
    <button type="button" disabled={busy} onClick={() => void perform("check")} className="mt-3 min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold disabled:opacity-50">{busy ? "جارٍ التحقق…" : "فحص حالة الرقم"}</button>
    {message ? <p role="status" className="mt-3 text-sm leading-7">{message}</p> : null}
    {state === "needs_registration" ? <form onSubmit={submit} className="mt-4 space-y-3">
      <p className="text-sm leading-7">أدخل PIN التحقق بخطوتين الخاص بهذا الرقم. إذا لم يسبق تعيينه، اختر ستة أرقام واحفظها في مكان آمن؛ سيصبح هذا PIN الرقم لدى واتساب. هذا ليس رمز SMS أو رمز تعديل موعد العميل. يُرسل إلى Meta لإتمام التسجيل ولا نخزّنه.</p>
      <label className="grid gap-2 text-sm font-bold">PIN واتساب<input name="pin" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" minLength={6} maxLength={6} required dir="ltr" className="min-h-12 rounded-xl border border-slate-300 bg-white px-3" /></label>
      <label className="flex items-start gap-2 text-sm leading-7"><input name="confirm" type="checkbox" required className="mt-2"/>أوافق على تسجيل هذا الرقم للإرسال عبر Meta Cloud API باستخدام PIN الذي أدخلته.</label>
      <button disabled={busy} className="min-h-11 rounded-xl bg-[#075c54] px-4 text-sm font-bold text-white disabled:opacity-50">إكمال تسجيل رقم الحجوزات</button>
    </form> : null}
  </div>;
}
