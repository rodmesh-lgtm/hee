"use client";

import { useActionState } from "react";
import {
  createSubscriptionAccessCodeAdminAction,
  type CreateSubscriptionAccessCodeState,
} from "../../app/actions/admin-access-code";

const initialState: CreateSubscriptionAccessCodeState = { status: "idle" };

export function AccessCodeCreateForm({ plans }: { plans: Array<{ code: string; name: string }> }) {
  const [state, formAction, pending] = useActionState(createSubscriptionAccessCodeAdminAction, initialState);

  return <>
    {state.status === "created" ? <div role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
      <b className="block">تم إنشاء الكود. انسخه الآن؛ لن يمكن استعادته لاحقًا.</b>
      <code dir="ltr" className="mt-2 block break-all rounded-xl bg-white px-3 py-2 font-mono text-sm font-black">{state.code}</code>
    </div> : null}
    {state.status === "error" ? <div role="alert" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-800">{state.message}</div> : null}
    <form action={formAction} className="grid gap-3 md:grid-cols-4">
      <label className="text-xs font-bold text-slate-600">الباقة<select name="plan" required className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] bg-white px-3 text-sm"><option value="">اختر الباقة</option>{plans.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} ({plan.code})</option>)}</select></label>
      <label className="text-xs font-bold text-slate-600">وصف داخلي<input name="label" maxLength={120} placeholder="مثال: شريك إطلاق" className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] px-3 text-sm" /></label>
      <label className="text-xs font-bold text-slate-600">حد الاستخدامات<input name="maxRedemptions" type="number" inputMode="numeric" min={1} max={100000} placeholder="غير محدود" className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] px-3 text-sm" /></label>
      <label className="text-xs font-bold text-slate-600">صلاحية إدخال الكود حتى<input name="expiresAt" type="datetime-local" className="mt-1 h-11 w-full rounded-xl border border-[#ddd8e9] px-3 text-sm" /></label>
      <label className="flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-950 md:col-span-4"><input name="whatsappMarketingEnabled" type="checkbox" className="mt-0.5 h-4 w-4 accent-violet-600" /><span>يشمل تسويق واتساب لهذا الكود <small className="mt-1 block font-normal leading-5 text-violet-800">فعّلها فقط عندما تتضمن المنحة خدمة WhatsApp Marketing. لا تُفعّل اتصال Meta أو الإرسال بنفسها.</small></span></label>
      <button disabled={pending} className="h-11 rounded-xl bg-[#5b3fd6] px-5 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-60 md:col-span-4 md:justify-self-start">{pending ? "جارٍ الإنشاء..." : "إنشاء كود آمن"}</button>
    </form>
    <p className="mt-3 text-[11px] leading-5 text-slate-500">تاريخ الصلاحية — إن حُدد — يمنع استخدام الكود لأول مرة بعده، لكنه لا ينهي اشتراكًا سبق تفعيله؛ المنحة المفعلة تستمر حتى تلغيها الإدارة.</p>
  </>;
}
