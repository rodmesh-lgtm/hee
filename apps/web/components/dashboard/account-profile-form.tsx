"use client";

import { useActionState } from "react";
import { confirmAccountEmailChangeAction, requestAccountEmailChangeAction, updateAccountProfileAction, type AccountProfileState } from "../../app/actions/account-profile";

const inputClass = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60";
const buttonClass = "min-h-11 rounded-xl bg-[#07181b] px-5 text-sm font-bold text-white disabled:opacity-60";

function Result({ state }: { state: AccountProfileState }) {
  return <>{state.error && <p role="alert" className="text-sm leading-6 text-rose-700">{state.error}</p>}{state.success && <p role="status" className="text-sm leading-6 text-emerald-700">{state.success}</p>}</>;
}

export function AccountProfileForm({ name, phone, email }: { name: string; phone: string | null; email: string }) {
  const [profile, saveProfile, saving] = useActionState(updateAccountProfileAction, {});
  const [request, requestEmail, requesting] = useActionState(requestAccountEmailChangeAction, {});
  const [confirmation, confirmEmail, confirming] = useActionState(confirmAccountEmailChangeAction, {});
  return <div className="mt-5 space-y-5">
    <form action={saveProfile} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold text-slate-700">اسم صاحب الحساب<input name="name" autoComplete="name" required minLength={2} maxLength={100} defaultValue={name} disabled={saving} className={inputClass} /></label>
        <label className="text-xs font-bold text-slate-700">رقم جوال الحساب<input name="phone" type="tel" autoComplete="tel" maxLength={25} dir="ltr" placeholder="05xxxxxxxx" defaultValue={phone ?? ""} disabled={saving} className={inputClass} /></label>
      </div>
      <p className="text-xs leading-6 text-slate-500">رقم للتواصل بشأن الحساب. لا يغيّر رقم واتساب المرتبط أو بيانات المنشأة العامة.</p>
      <button disabled={saving} className={buttonClass}>{saving ? "جارٍ الحفظ…" : "حفظ بيانات الحساب"}</button>
      <Result state={profile} />
    </form>
    <details className="rounded-2xl border border-slate-200 p-4">
      <summary className="cursor-pointer text-sm font-black text-[#007f78]">تغيير البريد الإلكتروني</summary>
      <p className="mt-3 text-xs leading-6 text-slate-500">يبقى بريدك الحالي فعالًا حتى تأكيد البريدين. بعد التغيير تُنهى جلسات الأجهزة الأخرى، ويظل تسجيل الدخول بحساب Google أو Apple المرتبط متاحًا.</p>
      <form action={requestEmail} className="mt-3 space-y-3">
        <label className="block text-xs font-bold text-slate-700">البريد الإلكتروني الجديد<input name="email" type="email" autoComplete="email" required maxLength={254} dir="ltr" placeholder="name@example.com" disabled={requesting || confirming} className={inputClass} /></label>
        <button disabled={requesting || confirming} className={buttonClass}>{requesting ? "جارٍ إرسال الرموز…" : "إرسال رمزي التحقق"}</button>
        <Result state={request} />
      </form>
      <form key={email} action={confirmEmail} className="mt-4 space-y-3 border-t border-slate-200 pt-4">
        <p className="text-xs leading-6 text-slate-500">إذا وصلتك الرموز، أدخلها هنا. طلب رموز جديدة يلغي الرموز السابقة.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-slate-700">رمز البريد الحالي<input name="currentCode" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" required minLength={6} maxLength={6} dir="ltr" disabled={confirming || requesting} className={inputClass} /></label>
          <label className="text-xs font-bold text-slate-700">رمز البريد الجديد<input name="newCode" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" required minLength={6} maxLength={6} dir="ltr" disabled={confirming || requesting} className={inputClass} /></label>
        </div>
        <button disabled={confirming || requesting} className={buttonClass}>{confirming ? "جارٍ التأكيد…" : "تأكيد تغيير البريد"}</button>
        <Result state={confirmation} />
      </form>
    </details>
  </div>;
}
