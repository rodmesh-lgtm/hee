"use client";
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { activateSallaAccount } from "./action";

export default function SallaActivationPage() {
  const tokenInput = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(activateSallaAccount, {});
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (value) {
      if (tokenInput.current) tokenInput.current.value = value;
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);
  return <main dir="rtl" className="min-h-screen bg-[#f4f8f8] px-4 py-12 text-[#0a2426]">
    <section className="mx-auto max-w-lg rounded-3xl border border-teal-100 bg-white p-6 shadow-sm">
      <p className="text-sm font-bold text-teal-700">INFRO × سلة</p>
      <h1 className="mt-3 text-2xl font-bold">أهلًا بمتجرك في انفرو واتساب</h1>
      <p className="mt-3 leading-8">أكمل تفعيل حسابك، ثم ابدأ بإعداد واتساب والحملات والتذكيرات والمواعيد من لوحة واحدة.</p>
      {state.success ? <div role="status" className="mt-6 rounded-xl bg-teal-50 p-4"><p>تم تفعيل الحساب بنجاح.</p><Link className="mt-3 inline-block font-bold underline" href="/login">تسجيل الدخول إلى INFRO</Link></div>
        : <form action={action} className="mt-6 space-y-4">
          <input name="token" type="hidden" ref={tokenInput} />
          <p className="rounded-xl bg-slate-50 p-3 text-sm leading-7">لديك حساب سابق؟ <Link className="font-bold underline" href="/login" target="_blank" rel="noopener noreferrer">سجّل الدخول</Link> ثم عد لهذه الصفحة. للحساب الجديد، عيّن كلمة المرور أدناه.</p>
          <label className="block">كلمة مرور للحساب الجديد<input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={200} className="mt-2 w-full rounded-xl border p-3" /></label>
          <label className="block">تأكيد كلمة المرور<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={200} className="mt-2 w-full rounded-xl border p-3" /></label>
          <p className="text-sm text-slate-600">8 أحرف على الأقل تتضمن حرفًا كبيرًا وصغيرًا ورقمًا ورمزًا. اتركها فارغة للحساب السابق.</p>
          <label className="flex items-start gap-3 text-sm leading-7"><input name="agreed" type="checkbox" required className="mt-2" /><span>أوافق على <Link href="/terms" target="_blank" rel="noopener noreferrer" className="underline">الشروط والأحكام</Link> و<Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline">سياسة الخصوصية</Link>.</span></label>
          {state.error ? <p role="alert" className="rounded-xl bg-rose-50 p-3 text-rose-800">{state.error}</p> : null}
          <p className="text-sm">استخدم هذه الصفحة من رابط التفعيل الموجود في بريد الترحيب.</p>
          <button disabled={pending} className="w-full rounded-xl bg-teal-800 p-3 font-bold text-white disabled:opacity-50">{pending ? "جارٍ التفعيل…" : "تأكيد وتفعيل الحساب"}</button>
        </form>}
      <p className="mt-6 text-sm leading-7 text-slate-600">تفعيل الحساب لا يشتري باقة مدفوعة. رسوم رسائل Meta منفصلة عن اشتراك INFRO. للمساعدة: <a href="mailto:info@ir.sa" className="underline">info@ir.sa</a></p>
    </section>
  </main>;
}
