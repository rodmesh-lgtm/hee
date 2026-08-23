"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { loginAction } from "../actions/auth";

const oauthMessages: Record<string, string> = {
  "provider-unavailable": "تسجيل الدخول عبر هذا المزود غير متاح مؤقتًا.",
  "unsupported-provider": "مزود تسجيل الدخول غير مدعوم.",
  "too-many-attempts": "محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.",
  "start-unavailable": "تعذر بدء تسجيل الدخول الخارجي الآن. حاول بعد قليل.",
  "start-failed": "تعذر بدء تسجيل الدخول الخارجي. حاول مرة أخرى.",
  "callback-failed": "تعذر إكمال تسجيل الدخول الخارجي. حاول مرة أخرى.",
  "account-link-required": "يوجد حساب بهذا البريد. سجّل الدخول بكلمة المرور أولًا لحماية حسابك.",
};

function GoogleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.62 9.62 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>;
}

function AppleMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.79 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.53 4.1ZM12.03 7.25C11.88 5.02 13.69 3.18 15.77 3c.29 2.58-2.34 4.5-3.74 4.25Z"/></svg>;
}

function LoginContent() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const oauthError = searchParams.get("oauth");
  const oauthMessage = oauthError ? oauthMessages[oauthError] ?? "تعذر تسجيل الدخول الخارجي. حاول مرة أخرى." : "";

  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#fff_50%,#f8f6ff_100%)] text-[#1f2552]">
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
      <Link href="/" className="w-fit text-3xl font-black tracking-[-.08em] text-[#6f3bd2]">HEE</Link>
      <div className="mt-6 rounded-[28px] border border-[#e8e5f2] bg-white p-5 shadow-[0_24px_70px_-52px_rgba(73,48,125,.5)] sm:p-6">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><LogIn className="h-5 w-5" /></span>
        <h1 className="mt-4 text-2xl font-black">تسجيل الدخول</h1>
        <p className="mt-1 text-sm leading-6 text-slate-500">ادخل إلى هويتك الرقمية ولوحة الإدارة.</p>
        {resetSuccess ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.</p> : null}
        {oauthMessage ? <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{oauthMessage}</p> : null}
        <div className="mt-5 grid gap-3" aria-label="تسجيل الدخول عبر مزود خارجي">
          <a href="/api/auth/oauth/google" className="flex h-12 items-center justify-center gap-3 rounded-2xl border border-[#dedce7] bg-white px-4 text-sm font-black text-[#24283f] transition hover:border-[#c9c4dc] hover:bg-[#fbfaff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7659dc] focus-visible:ring-offset-2"><GoogleMark /><span>المتابعة باستخدام Google</span></a>
          <a href="/api/auth/oauth/apple" className="flex h-12 items-center justify-center gap-3 rounded-2xl bg-black px-4 text-sm font-black text-white transition hover:bg-[#1c1c1e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"><AppleMark /><span>المتابعة باستخدام Apple</span></a>
        </div>
        <div className="my-5 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-[#e8e5f2]"/><span className="text-xs font-bold text-slate-400">أو بالبريد الإلكتروني</span><span className="h-px flex-1 bg-[#e8e5f2]"/></div>
        <form action={action} className="space-y-4" aria-label="نموذج تسجيل الدخول">
          <label className="block"><span className="mb-1.5 block text-sm font-black">البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /></label>
          <label className="block"><span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-black"><span>كلمة المرور</span><Link href="/forgot-password" className="text-[11px] text-[#6543ce]">نسيت كلمة المرور؟</Link></span><input name="password" type="password" autoComplete="current-password" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc] focus:bg-white" required /></label>
          {state.error ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{state.error}</p> : null}
          <button disabled={pending} className="h-12 w-full rounded-2xl bg-[#5b3fd6] px-4 text-sm font-black text-white transition disabled:bg-slate-300">{pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">ليس لديك حساب؟ <Link href="/register" className="font-black text-[#5d49cc]">إنشاء حساب</Link></p>
      </div>
    </div>
  </main>;
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#fbfaff]" />}><LoginContent /></Suspense>;
}
