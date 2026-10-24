"use client";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useActionState } from "react";
import { sendLiveViewWhatsAppAction } from "../../actions/live-view-whatsapp";

export function LiveWhatsAppForm({ sessionId, watchPath }: { sessionId: string; watchPath: string }) {
  const [state, action, pending] = useActionState(sendLiveViewWhatsAppAction, {});
  return <section className="infro-live-delivery mt-4" aria-label="إرسال رابط المشاهدة عبر واتساب">
    <div className="infro-live-delivery-heading"><span className="infro-live-delivery-icon" aria-hidden="true"><MessageCircle size={21} /></span><h3 className="pt-1 font-bold">أرسل الرابط من رقم واتساب منشأتك</h3></div>
    <p className="infro-live-hint mt-3 text-sm">أدخل رقم العميل وتحقق منه قبل الإرسال. يتطلب رقم واتساب مرتبطًا واشتراك واتساب مفعّلًا وقالب «رابط المشاهدة المؤقتة» معتمدًا.</p>
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="sessionId" value={sessionId} /><input type="hidden" name="watchPath" value={watchPath} />
      <label className="block text-sm font-bold">رقم واتساب العميل<input type="tel" dir="ltr" name="phone" autoComplete="tel" placeholder="05XXXXXXXX / +9665XXXXXXXX" required maxLength={30} className="mt-2 w-full rounded-xl border bg-white px-3 py-3 text-slate-900" /></label>
      <label className="flex items-start gap-2 text-sm leading-7"><input type="checkbox" name="whatsappConsent" required className="mt-2" /><span>تحققت أن الرقم يخص صاحب هذه الجلسة وأنه وافق على استلام رابط المشاهدة عبر واتساب.</span></label>
      <button disabled={pending} className="infro-live-action min-h-11 rounded-xl bg-[#087e78] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{pending ? "جارٍ إرسال الرابط…" : "إرسال الرابط عبر واتساب"}</button>
      {state.error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{state.error}</p>}
      {state.success && <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-900">{state.success}</p>}
    </form>
    <div className="mt-3 flex flex-wrap gap-4 text-sm font-bold text-teal-800"><Link href="/dashboard/whatsapp/templates">إعداد قالب واتساب</Link><Link href="/dashboard/whatsapp/messages">سجل رسائل واتساب</Link></div>
  </section>;
}
