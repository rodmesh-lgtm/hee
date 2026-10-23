"use client";
import Link from "next/link";
import { useActionState } from "react";
import { sendLiveViewWhatsAppAction } from "../../actions/live-view-whatsapp";

export function LiveWhatsAppForm({ sessionId, watchPath }: { sessionId: string; watchPath: string }) {
  const [state, action, pending] = useActionState(sendLiveViewWhatsAppAction, {});
  return <section className="mt-4 rounded-2xl border border-teal-200 bg-white p-4" aria-label="إرسال رابط المشاهدة عبر واتساب">
    <h3 className="font-bold">أرسل الرابط من رقم واتساب منشأتك</h3>
    <p className="mt-2 text-sm leading-7 text-slate-600">أدخل رقم العميل وتحقق منه قبل الإرسال. يتطلب رقم واتساب مرتبطًا واشتراك واتساب مفعّلًا وقالب «رابط المشاهدة المؤقتة» معتمدًا.</p>
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="watchPath" value={watchPath} />
      <label className="block text-sm font-bold">رقم واتساب العميل<input type="tel" dir="ltr" name="phone" autoComplete="tel" placeholder="05XXXXXXXX أو +9665XXXXXXXX" required maxLength={30} className="mt-2 w-full rounded-xl border bg-white px-3 py-3 text-slate-900" /></label>
      <label className="flex items-start gap-2 text-sm leading-7"><input type="checkbox" name="whatsappConsent" required className="mt-2" /><span>تحققت أن الرقم يخص صاحب هذه الجلسة وأنه وافق على استلام رابط المشاهدة عبر واتساب.</span></label>
      <button disabled={pending} className="min-h-11 rounded-xl bg-[#087e78] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? "جارٍ إرسال الرابط…" : "إرسال الرابط عبر واتساب"}</button>
      {state.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p>}
      {state.success && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{state.success}</p>}
    </form>
    <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-teal-800"><Link href="/dashboard/whatsapp/templates">إعداد قالب واتساب</Link><Link href="/dashboard/whatsapp/messages">سجل رسائل واتساب</Link></div>
  </section>;
}
