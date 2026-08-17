"use client";

import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
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
  const isFormReady = name.trim().length >= 2 && email.trim().length > 4 && passwordCriteria.every((item) => item.met) && !passwordMismatch && confirmPassword.length > 0 && agreed;

  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#fff_50%,#f8f6ff_100%)] text-[#1f2552]">
    <div className="mx-auto w-full max-w-md px-4 py-8 sm:py-10">
      <Link href="/" className="w-fit text-3xl font-black tracking-[-.08em] text-[#6f3bd2]">HEE</Link>
      <div className="mt-6 rounded-[28px] border border-[#e8e5f2] bg-white p-5 shadow-[0_24px_70px_-52px_rgba(73,48,125,.5)] sm:p-6">
        <div className="flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><UserPlus className="h-5 w-5" /></span><span className="rounded-full bg-[#f5f2ff] px-3 py-1 text-[10px] font-black text-[#6543ce]">الخطوة 1 من 2</span></div>
        <h1 className="mt-4 text-2xl font-black">إنشاء حساب</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">أنشئ حسابك أولاً، ثم سنطلب فقط البيانات الأساسية لصفحة نشاطك.</p>

        <form action={action} className="mt-5 space-y-4" aria-label="نموذج إنشاء الحساب">
          <label className="block"><span className="mb-1.5 block text-sm font-black">الاسم الكامل</span><input name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-black">البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-black">كلمة المرور</span><div className="relative"><input name="password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 pl-12 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="إظهار كلمة المرور">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-[#faf9fd] p-3 text-[10px]">{passwordCriteria.map((item) => <div key={item.label} className={`flex items-center gap-1.5 ${item.met ? "font-bold text-emerald-700" : "text-slate-400"}`}><span>{item.met ? "✓" : "○"}</span><span>{item.label}</span></div>)}</div>
          <label className="block"><span className="mb-1.5 block text-sm font-black">تأكيد كلمة المرور</span><div className="relative"><input name="confirmPassword" type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 pl-12 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /><button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="إظهار تأكيد كلمة المرور">{showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div></label>
          {passwordMismatch ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">كلمتا المرور غير متطابقتين.</p> : null}
          <label className="flex items-start gap-2 rounded-2xl bg-[#faf9fd] p-3 text-xs leading-6 text-slate-600"><input name="agreed" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} type="checkbox" className="mt-1 h-4 w-4" /><span>أوافق على <Link href="/terms" className="font-black text-[#5d49cc]">الشروط والأحكام</Link> و <Link href="/privacy" className="font-black text-[#5d49cc]">سياسة الخصوصية</Link></span></label>
          {state.error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{state.error}</p> : null}
          <button type="submit" disabled={pending || !isFormReady} className="h-12 w-full rounded-2xl bg-[#5b3fd6] px-4 text-sm font-black text-white disabled:bg-slate-300">{pending ? "جاري إنشاء الحساب..." : "إنشاء الحساب والمتابعة"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">لديك حساب؟ <Link href="/login" className="font-black text-[#5d49cc]">تسجيل الدخول</Link></p>
      </div>
    </div>
  </main>;
}
