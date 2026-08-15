/* eslint-disable @next/next/no-html-link-for-pages -- OAuth start endpoints require a full document navigation. */
"use client";

import Link from "next/link";
import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { FaApple } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { loginAction } from "../actions/auth";

const oauthMessages: Record<string, string> = {
  "provider-unavailable": "تسجيل الدخول عبر هذا المزود غير مفعّل بعد. يمكنك استخدام البريد الإلكتروني حالياً.",
  "provider-cancelled": "تم إلغاء تسجيل الدخول من المزود.",
  "invalid-state": "انتهت جلسة تسجيل الدخول الآمن. أعد المحاولة.",
  "missing-callback-data": "لم تكتمل بيانات تسجيل الدخول. أعد المحاولة.",
  "account-not-found": "لا يوجد حساب HEE مرتبط بهذا البريد. أنشئ حساباً أولاً.",
  "authentication-failed": "تعذر التحقق من تسجيل الدخول. أعد المحاولة.",
  "start-failed": "تعذر بدء تسجيل الدخول الخارجي. أعد المحاولة لاحقاً.",
};

function LoginContent() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });
  const searchParams = useSearchParams();
  const oauthError = oauthMessages[searchParams.get("oauth") ?? ""];

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <div>
          <Link href="/" className="text-sm font-bold text-slate-500">HEE</Link>
          <h1 className="mt-2 text-3xl font-black">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-slate-600">سجّل دخولك للوصول إلى صفحتك ولوحة التحكم.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {oauthError ? <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-6 text-amber-800">{oauthError}</p> : null}
          <div className="grid gap-3">
            <a href="/api/auth/oauth/google?mode=login" className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50">
              <FcGoogle className="h-5 w-5" aria-hidden="true" />
              المتابعة باستخدام Google
            </a>
            <a href="/api/auth/oauth/apple?mode=login" className="flex w-full items-center justify-center gap-3 rounded-2xl bg-black px-4 py-3 text-sm font-bold text-white transition hover:bg-slate-900">
              <FaApple className="h-5 w-5" aria-hidden="true" />
              المتابعة باستخدام Apple
            </a>
          </div>

          <div className="relative my-5 text-center text-xs text-slate-500">
            <span className="relative z-10 bg-white px-2">أو</span>
            <span className="absolute right-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-200" />
          </div>

          <form action={action} className="space-y-4" aria-label="نموذج تسجيل الدخول">
            <label className="block text-sm"><span className="mb-2 block">البريد الإلكتروني</span><input name="email" type="email" autoComplete="email" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" required /></label>
            <label className="block text-sm"><span className="mb-2 block">كلمة المرور</span><input name="password" type="password" autoComplete="current-password" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" required /></label>
            {state.error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
            <button disabled={pending} className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 font-bold text-white disabled:opacity-60">{pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}</button>
          </form>

          <p className="mt-4 text-sm text-slate-600">ليس لديك حساب؟ <Link href="/register" className="font-bold text-slate-900 underline underline-offset-4">إنشاء حساب</Link></p>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#f7f8fb]" />}><LoginContent /></Suspense>;
}
