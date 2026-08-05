"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "../actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, { error: "" });

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-10">
        <div>
          <Link href="/" className="text-sm font-bold text-slate-500">HEE</Link>
          <h1 className="mt-2 text-3xl font-black">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-slate-600">سجّل دخولك للوصول إلى صفحتك ولوحة التحكم.</p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Google غير مفعّل حالياً في هذه البيئة.
          </div>

          <div className="relative my-4 text-center text-xs text-slate-500">
            <span className="relative z-10 bg-white px-2">أو</span>
            <span className="absolute right-0 top-1/2 h-px w-full -translate-y-1/2 bg-slate-200" />
          </div>

          <form action={action} className="space-y-4" aria-label="نموذج تسجيل الدخول">
            <label className="block text-sm">
            <span className="mb-2 block">البريد الإلكتروني</span>
            <input name="email" type="email" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" required />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">كلمة المرور</span>
            <input name="password" type="password" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" required />
          </label>
          {state.error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{state.error}</p> : null}
          <button disabled={pending} className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 font-bold text-white">
            {pending ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            ليس لديك حساب؟{" "}
            <Link href="/register" className="font-bold text-slate-900 underline underline-offset-4">إنشاء حساب</Link>
          </p>
        </div>
      </div>
    </main>
  );
}
