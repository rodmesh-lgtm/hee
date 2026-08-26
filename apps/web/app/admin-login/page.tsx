"use client";

import { useActionState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { adminLoginAction, type AdminLoginState } from "../actions/admin-auth";

const initialState: AdminLoginState = {};

export default function AdminLoginPage() {
  const [state, action, pending] = useActionState(adminLoginAction, initialState);
  return <main dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_top,#201536_0,#100b1b_42%,#08060d_100%)] px-4 py-10 text-white">
    <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
      <section className="w-full rounded-[30px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_100px_rgba(0,0,0,.45)] backdrop-blur-xl sm:p-8">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/10 text-violet-200"><ShieldCheck className="h-8 w-8" /></div>
        <div className="mt-5 text-center"><p className="text-xs font-black tracking-[.18em] text-violet-300">HEE CONTROL PLANE</p><h1 className="mt-2 text-2xl font-black">إدارة المنصة المركزية</h1><p className="mt-2 text-sm leading-6 text-white/55">بوابة مستقلة ومخصصة لمشغلي HEE فقط. جلسة العميل العادية لا تمنح أي صلاحية إدارية.</p></div>
        <form action={action} className="mt-7 space-y-4">
          <label className="grid gap-2 text-xs font-bold text-white/70"><span>البريد الإداري</span><input name="email" type="email" autoComplete="username" required dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/50" /></label>
          <label className="grid gap-2 text-xs font-bold text-white/70"><span>كلمة المرور</span><input name="password" type="password" autoComplete="current-password" required dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-black/20 px-4 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-violet-400/50" /></label>
          {state.error ? <div role="alert" className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-xs font-bold text-rose-100">{state.error}</div> : null}
          <button disabled={pending} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 text-sm font-black text-white shadow-[0_10px_30px_rgba(139,92,246,.25)] transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"><LockKeyhole className="h-4 w-4" />{pending ? "جارٍ التحقق..." : "دخول الإدارة المركزية"}</button>
        </form>
        <div className="mt-6 border-t border-white/10 pt-5 text-center text-[11px] leading-5 text-white/35">يتم تسجيل محاولات الدخول وتطبيق حدود صارمة على التكرار. لا تستخدم هذه البوابة لحسابات العملاء.</div>
      </section>
    </div>
  </main>;
}
