"use client";

import { useActionState } from "react";
import { registerAction } from "../actions/auth";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerAction, { error: "" });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-12">
        <div>
          <p className="text-sm text-indigo-300">HEE</p>
          <h1 className="mt-2 text-3xl font-black">إنشاء حساب</h1>
        </div>
        <form action={action} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <label className="block text-sm">
            <span className="mb-2 block">الاسم الكامل</span>
            <input name="name" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" required />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">البريد الإلكتروني</span>
            <input name="email" type="email" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" required />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">كلمة المرور</span>
            <input name="password" type="password" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" required />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block">تأكيد كلمة المرور</span>
            <input name="confirmPassword" type="password" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-white" required />
          </label>
          {state.error ? <p className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{state.error}</p> : null}
          <button disabled={pending} className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">
            {pending ? "جاري الإنشاء..." : "إنشاء الحساب"}
          </button>
        </form>
      </div>
    </main>
  );
}
