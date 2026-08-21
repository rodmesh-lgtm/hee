"use client";

import { useActionState } from "react";
import { BadgeCheck, MailWarning } from "lucide-react";
import { requestEmailVerificationAction } from "../../app/actions/email-verification";

export function EmailVerificationCard({ verified }: { verified: boolean }) {
  const [state, action, pending] = useActionState(requestEmailVerificationAction, {});

  if (verified) {
    return <div className="mt-3 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
      <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
      <div><b className="block text-xs">البريد مؤكد</b><p className="mt-1 text-[11px] leading-5">تم إثبات ملكية بريد الحساب، ويمكن نشر صفحة المنشأة.</p></div>
    </div>;
  }

  return <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
    <div className="flex items-start gap-3"><MailWarning className="mt-0.5 h-5 w-5 shrink-0" /><div><b className="block text-xs">البريد غير مؤكد</b><p className="mt-1 text-[11px] leading-5">يمكنك إعداد صفحتك، لكن لن تُنشر للعامة حتى تثبت ملكية بريد الحساب.</p></div></div>
    <form action={action} className="mt-3">
      <button disabled={pending} className="min-h-11 rounded-xl bg-amber-900 px-4 text-xs font-black text-white disabled:opacity-60">{pending ? "جارٍ إرسال الرابط..." : "إرسال رابط التأكيد"}</button>
    </form>
    {state.success ? <p role="status" className="mt-2 text-[11px] font-bold leading-5 text-emerald-700">{state.success}</p> : null}
    {state.error ? <p role="alert" className="mt-2 text-[11px] font-bold leading-5 text-rose-700">{state.error}</p> : null}
  </div>;
}
