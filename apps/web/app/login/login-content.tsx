"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, LogIn, ShieldCheck, Sparkles } from "lucide-react";
import { IrLogo } from "../../components/brand/ir-logo";
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

type LoginContentProps = { googleEnabled: boolean; appleEnabled: boolean };

function LoginContent({ googleEnabled, appleEnabled }: LoginContentProps) {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const oauthError = searchParams.get("oauth");
  const oauthMessage = oauthError ? oauthMessages[oauthError] ?? "تعذر تسجيل الدخول الخارجي. حاول مرة أخرى." : "";
  const hasExternalProvider = googleEnabled || appleEnabled;

  return <main dir="rtl" className="min-h-screen bg-[#f4f8f8] text-[#0a2426]">
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(440px,560px)]">
      <section className="relative hidden overflow-hidden bg-[#07181b] p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full bg-[#00e5a8]/10 blur-3xl"/><div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[#00b4d8]/10 blur-3xl"/>
        <Link href="/" className="relative w-fit" aria-label="العودة إلى INFRO"><IrLogo className="h-14 w-auto" priority /></Link>
        <div className="relative max-w-xl"><span className="inline-flex items-center gap-2 text-[10px] font-black tracking-[.2em] text-[#66e7d5]" dir="ltr"><Sparkles className="h-4 w-4"/>YOUR DIGITAL & MARKETING IDENTITY</span><h1 className="mt-5 text-4xl font-black leading-[1.25] xl:text-5xl">كل أدوات حضورك الرقمي، في مساحة عمل واحدة.</h1><p className="mt-5 max-w-lg text-sm leading-8 text-slate-300">ادخل إلى INFRO لإدارة هويتك وصفحتك وخدماتك وتسويق واتساب وعمليات العملاء من مكان واضح وآمن.</p><div className="mt-8 grid max-w-lg grid-cols-2 gap-3"><Feature text="هوية أعمال موحدة"/><Feature text="تشغيل محمي للصلاحيات"/><Feature text="واتساب الرسمي"/><Feature text="تجربة متجاوبة للجوال"/></div></div>
        <div className="relative flex items-center gap-2 text-[10px] font-bold text-slate-500"><ShieldCheck className="h-4 w-4 text-[#55e7d3]"/>INFRO · ir.sa</div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-8 lg:px-10">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-between lg:hidden"><Link href="/" aria-label="العودة إلى INFRO"><IrLogo className="h-12 w-auto" priority /></Link><Link href="/" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600">الرئيسية<ArrowLeft className="h-3.5 w-3.5"/></Link></div>
          <div className="rounded-[28px] border border-[#dfe9e8] bg-white p-5 shadow-[0_28px_80px_-58px_rgba(7,24,27,.65)] sm:p-7">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e9fbf8] text-[#008f87]"><LogIn className="h-5 w-5" /></span>
            <span className="mt-5 block text-[9px] font-black tracking-[.18em] text-[#008f87]" dir="ltr">WELCOME BACK</span><h2 className="mt-1 text-2xl font-black">تسجيل الدخول</h2><p className="mt-1 text-sm leading-6 text-slate-500">ادخل إلى مساحة عمل INFRO الخاصة بك.</p>
            {resetSuccess ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">تم تحديث كلمة المرور. يمكنك تسجيل الدخول الآن.</p> : null}
            {oauthMessage ? <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{oauthMessage}</p> : null}
            {hasExternalProvider ? <>
              <div className="mt-5 grid gap-3" aria-label="تسجيل الدخول عبر مزود خارجي">
                {googleEnabled ? <Link href="/api/auth/oauth/google" prefetch={false} className="flex h-12 items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 transition hover:border-[#9fe8df] hover:bg-[#f7fcfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2"><GoogleMark /><span>المتابعة باستخدام Google</span></Link> : null}
                {appleEnabled ? <Link href="/api/auth/oauth/apple" prefetch={false} className="flex h-12 items-center justify-center gap-3 rounded-2xl bg-black px-4 text-sm font-black text-white transition hover:bg-[#1c1c1e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"><AppleMark /><span>المتابعة باستخدام Apple</span></Link> : null}
              </div>
              <div className="my-5 flex items-center gap-3" aria-hidden="true"><span className="h-px flex-1 bg-slate-200"/><span className="text-xs font-bold text-slate-400">أو بالبريد الإلكتروني</span><span className="h-px flex-1 bg-slate-200"/></div>
            </> : <div className="my-5" />}
            <form action={action} className="space-y-4" aria-label="نموذج تسجيل الدخول">
              <label className="block"><span className="mb-1.5 block text-sm font-black">البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfdfd] px-4 text-base outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10" required /></label>
              <label className="block"><span className="mb-1.5 flex items-center justify-between gap-3 text-sm font-black"><span>كلمة المرور</span><Link href="/forgot-password" className="text-[11px] text-[#008f87] hover:text-[#006e68]">نسيت كلمة المرور؟</Link></span><input name="password" type="password" autoComplete="current-password" className="h-12 w-full rounded-2xl border border-slate-200 bg-[#fbfdfd] px-4 text-base outline-none transition focus:border-[#00a99d] focus:bg-white focus:ring-4 focus:ring-[#35e4cb]/10" required /></label>
              {state.error ? <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{state.error}</p> : null}
              <button disabled={pending} className="h-12 w-full rounded-2xl bg-[#07181b] px-4 text-sm font-black text-white transition hover:bg-[#0d292d] focus-visible:ring-2 focus-visible:ring-[#00bfae] focus-visible:ring-offset-2 disabled:bg-slate-300">{pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</button>
            </form>
            <p className="mt-5 text-center text-sm text-slate-500">ليس لديك حساب؟ <Link href="/register" className="font-black text-[#008f87]">إنشاء حساب</Link></p>
          </div>
        </div>
      </section>
    </div>
  </main>;
}

function Feature({text}:{text:string}){return <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[.04] px-3 py-3 text-xs font-bold text-slate-200"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#55e7d3]"/>{text}</div>}

export function LoginClient(props: LoginContentProps) {
  return <Suspense fallback={<main className="min-h-screen bg-[#f4f8f8]" />}><LoginContent {...props} /></Suspense>;
}
