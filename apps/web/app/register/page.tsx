"use client";

import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useActionState, useMemo, useState } from "react";
import { registerAction } from "../actions/auth";

function getPasswordCriteria(password: string) {
  return [
    { label: "8 أحرف أو أكثر", met: password.length >= 8 },
    { label: "حرف كبير", met: /[A-Z]/.test(password) },
    { label: "حرف صغير", met: /[a-z]/.test(password) },
    { label: "رقم", met: /\d/.test(password) },
    { label: "رمز خاص", met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, { error: "" });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const passwordCriteria = useMemo(() => getPasswordCriteria(password), [password]);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isFormReady = Boolean(name.trim()) && Boolean(email.trim()) && passwordCriteria.every((item) => item.met) && !passwordMismatch && agreed;

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <div>
          <Link href="/" className="text-sm font-bold text-slate-500">HEE</Link>
          <div className="mt-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-600"><span className="ml-2 text-emerald-600">1/2</span>إنشاء الحساب</div>
          <h1 className="mt-3 text-3xl font-black">إنشاء حساب</h1>
          <p className="mt-2 text-sm text-slate-600">ابدأ بحسابك ثم سنوجهك إلى إعداد نشاطك في الخطوة التالية.</p>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-3">
            <a href="/api/auth/oauth/google?mode=register" className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"><span className="grid h-5 w-5 place-items-center rounded-full border border-slate-200 text-[11px] font-black">G</span>المتابعة باستخدام Google</a>
            <a href="/api/auth/oauth/apple?mode=register" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-900"><span className="text-lg leading-none">●</span>المتابعة باستخدام Apple</a>
            <p className="px-1 text-center text-[11px] leading-5 text-slate-500">بالمتابعة عبر Google أو Apple فإنك توافق على <Link href="/terms" className="underline underline-offset-2">الشروط والأحكام</Link> و<Link href="/privacy" className="underline underline-offset-2">سياسة الخصوصية</Link>.</p>
          </div>

          <div className="relative my-5 text-center text-xs text-slate-500"><span className="relative z-10 bg-white px-2">أو بالبريد الإلكتروني</span><span className="absolute right-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-200" /></div>

          <form action={action} className="space-y-4" aria-label="نموذج إنشاء الحساب">
            <label className="block text-sm"><span className="mb-2 block font-semibold text-slate-700">الاسم الكامل</span><input name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0" required /></label>
            <label className="block text-sm"><span className="mb-2 block font-semibold text-slate-700">البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-0" required /></label>
            <label className="block text-sm"><span className="mb-2 block font-semibold text-slate-700">كلمة المرور</span><div className="relative"><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pl-12 text-slate-900 outline-none ring-0" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="إظهار كلمة المرور">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">{passwordCriteria.map((item) => <div key={item.label} className={`flex items-center justify-between rounded-xl px-2 py-1 ${item.met ? "text-emerald-700" : "text-slate-600"}`}><span>{item.label}</span><span>{item.met ? "✓" : "○"}</span></div>)}</div>
            <label className="block text-sm"><span className="mb-2 block font-semibold text-slate-700">تأكيد كلمة المرور</span><div className="relative"><input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pl-12 text-slate-900 outline-none ring-0" required /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" aria-label="إظهار تأكيد كلمة المرور">{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
            {passwordMismatch ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">كلمتا المرور غير متطابقتين.</p> : null}
            <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><input name="agreed" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" /><span>أوافق على <Link href="/terms" className="font-semibold text-slate-900 underline underline-offset-4">الشروط والأحكام</Link> و <Link href="/privacy" className="font-semibold text-slate-900 underline underline-offset-4">سياسة الخصوصية</Link></span></label>
            {state.error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
            <button type="submit" disabled={pending || !isFormReady} className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{pending ? "جاري الإنشاء..." : "إنشاء الحساب"}</button>
          </form>
          <p className="mt-4 text-sm text-slate-600">لديك حساب؟ <Link href="/login" className="font-bold text-slate-900 underline underline-offset-4">تسجيل الدخول</Link></p>
        </div>
      </div>
    </main>
  );
}
