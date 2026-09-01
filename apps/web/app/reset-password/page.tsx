"use client";

import Link from "next/link";
import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { resetPasswordAction } from "../actions/password-reset";

function PasswordInput({ name, label }: { name: string; label: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        name={name}
        type={visible ? "text" : "password"}
        autoComplete="new-password"
        required
        minLength={8}
        aria-label={label}
        className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 ps-12 text-sm outline-none focus:border-[#8b72dc]"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? `إخفاء ${label}` : `إظهار ${label}`}
        aria-pressed={visible}
        title={visible ? `إخفاء ${label}` : `إظهار ${label}`}
        className="absolute inset-y-0 start-0 grid w-12 place-items-center rounded-s-2xl text-slate-500 transition hover:text-[#5b3fd6] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8b72dc]"
      >
        {visible ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
      </button>
    </div>
  );
}

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [state, action, pending] = useActionState(resetPasswordAction, {});

  return (
    <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff,#fff_50%,#f8f6ff)] text-[#1f2552]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-8">
        <Link href="/" aria-label="العودة إلى iR" className="w-fit text-3xl font-black tracking-[-.08em] text-[#6f3bd2]">iR</Link>
        <section className="mt-6 rounded-[28px] border border-[#e8e5f2] bg-white p-5 shadow-[0_24px_70px_-52px_rgba(73,48,125,.5)] sm:p-6">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></span>
          <h1 className="mt-4 text-2xl font-black">كلمة مرور جديدة</h1>
          <p className="mt-1 text-sm leading-7 text-slate-500">استخدم كلمة قوية لا تستخدمها في حساب آخر.</p>
          {token ? (
            <form action={action} className="mt-5 space-y-4" aria-label="تعيين كلمة مرور جديدة">
              <input type="hidden" name="token" value={token} />
              <label className="block">
                <span className="mb-1.5 block text-sm font-black">كلمة المرور الجديدة</span>
                <PasswordInput name="password" label="كلمة المرور الجديدة" />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-black">تأكيد كلمة المرور</span>
                <PasswordInput name="confirmPassword" label="تأكيد كلمة المرور" />
              </label>
              <p className="text-[11px] leading-6 text-slate-500">8 أحرف على الأقل، مع حرف كبير وصغير ورقم ورمز.</p>
              {state.error ? <p role="alert" aria-live="assertive" className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-700">{state.error}</p> : null}
              <button disabled={pending} aria-busy={pending} className="h-12 w-full rounded-2xl bg-[#5b3fd6] px-4 text-sm font-black text-white disabled:bg-slate-300">
                {pending ? "جاري التحديث..." : "تحديث كلمة المرور"}
              </button>
            </form>
          ) : (
            <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-800">
              رابط الاستعادة غير مكتمل. اطلب رابطًا جديدًا من صفحة استعادة كلمة المرور.
            </div>
          )}
          <p className="mt-5 text-center text-sm text-slate-500"><Link href="/forgot-password" className="font-black text-[#5d49cc]">طلب رابط جديد</Link></p>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-[#fbfaff]" aria-label="تحميل صفحة إعادة تعيين كلمة المرور" />}><ResetPasswordContent /></Suspense>;
}
