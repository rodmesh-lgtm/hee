"use client";

import { useActionState } from "react";
import { BadgeCheck, MailWarning, PencilLine } from "lucide-react";
import { changeUnverifiedEmailAction, requestEmailVerificationAction } from "../../app/actions/email-verification";

export function EmailVerificationCard({ verified }: { verified: boolean }) {
  const [state, action, pending] = useActionState(requestEmailVerificationAction, {});
  const [changeState, changeAction, changePending] = useActionState(changeUnverifiedEmailAction, {});

  if (verified) {
    return <div className="mt-3 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
      <div><b className="block text-xs">البريد مؤكد</b><p className="mt-1 text-[11px] leading-5">تم إثبات ملكية بريد الحساب، ويمكن نشر صفحة المنشأة.</p></div>
    </div>;
  }

  return <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
    <div className="flex items-start gap-3"><MailWarning className="mt-0.5 h-5 w-5 shrink-0" /><div><b className="block text-xs">البريد غير مؤكد</b><p className="mt-1 text-[11px] leading-5">يمكنك إعداد صفحتك، لكن لن تُنشر للعامة حتى تثبت ملكية بريد الحساب.</p></div></div>
    <div className="mt-3 flex flex-wrap gap-2">
      <form action={action}>
        <button disabled={pending || changePending} className="min-h-11 rounded-xl bg-amber-900 px-4 text-xs font-black text-white disabled:opacity-60">{pending ? "جارٍ إرسال الرابط..." : "إرسال رابط التأكيد"}</button>
      </form>
    </div>
    {state.success ? <p role="status" className="mt-2 text-[11px] font-bold leading-5 text-emerald-700">{state.success}</p> : null}
    {state.error ? <p role="alert" className="mt-2 text-[11px] font-bold leading-5 text-rose-700">{state.error}</p> : null}

    <div className="mt-4 border-t border-amber-200 pt-4">
      <div className="flex items-center gap-2"><PencilLine className="h-4 w-4" /><b className="text-xs">تعديل البريد قبل التأكيد</b></div>
      <p className="mt-1 text-[11px] leading-5 text-amber-800">إذا كتبت البريد بشكل خاطئ، أدخل البريد الصحيح هنا. سيتم إلغاء أي رابط تأكيد قديم وإرسال رابط جديد للبريد المعدل.</p>
      <form action={changeAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor="unverified-email-correction">البريد الإلكتروني الصحيح</label>
        <input id="unverified-email-correction" name="email" type="email" required autoComplete="email" inputMode="email" placeholder="name@example.com" disabled={changePending || pending} className="min-h-11 min-w-0 flex-1 rounded-xl border border-amber-300 bg-white px-3 text-sm text-slate-900 outline-none ring-amber-500 focus:ring-2 disabled:opacity-60" />
        <button disabled={changePending || pending} className="min-h-11 rounded-xl border border-amber-900 bg-white px-4 text-xs font-black text-amber-900 disabled:opacity-60">{changePending ? "جارٍ تحديث البريد..." : "تحديث البريد"}</button>
      </form>
      {changeState.success ? <p role="status" className="mt-2 text-[11px] font-bold leading-5 text-emerald-700">{changeState.success}</p> : null}
      {changeState.error ? <p role="alert" className="mt-2 text-[11px] font-bold leading-5 text-rose-700">{changeState.error}</p> : null}
    </div>
  </div>;
}
