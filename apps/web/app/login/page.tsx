"use client";

import Link from "next/link";
import { useActionState } from "react";
import { LogIn } from "lucide-react";
import { loginAction } from "../actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#fff_50%,#f8f6ff_100%)] text-[#1f2552]">
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <Link href="/" className="w-fit text-3xl font-black tracking-[-.08em] text-[#6f3bd2]">HEE</Link>
      <div className="mt-6 rounded-[28px] border border-[#e8e5f2] bg-white p-5 shadow-[0_24px_70px_-52px_rgba(73,48,125,.5)] sm:p-6">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><LogIn className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-black">تسجيل الدخول</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">ادخل إلى هويتك الرقمية ولوحة الإدارة.</p>

        <form action={action} className="mt-5 space-y-4" aria-label="نموذج تسجيل الدخول">
          <label className="block"><span className="mb-1.5 block text-sm font-black">البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /></label>
          <label className="block"><span className="mb-1.5 block text-sm font-black">كلمة المرور</span><input name="password" type="password" autoComplete="current-password" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /></label>
          {state.error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{state.error}</p> : null}
          <button disabled={pending} className="h-12 w-full rounded-2xl bg-[#5b3fd6] px-4 text-sm font-black text-white transition disabled:bg-slate-300">{pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-500">ليس لديك حساب؟ <Link href="/register" className="font-black text-[#5d49cc]">إنشاء حساب</Link></p>
      </div>
    </div>
  </main>;
}
