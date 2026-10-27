"use client";

import { useActionState } from "react";
import { checkAdminSallaSubscription, type SallaAdminCheckState } from "./salla-check-action";

const initialState: SallaAdminCheckState = { status: "idle", message: "" };

export function SallaAdminSubscriptionCheck({ integrationId }: { integrationId: string }) {
  const [state, action, pending] = useActionState(checkAdminSallaSubscription, initialState);
  return <div className="mt-4 border-t border-slate-200 pt-4">
    <form action={action}>
      <input type="hidden" name="integrationId" value={integrationId} />
      <button disabled={pending} className="min-h-11 rounded-xl border border-teal-700 px-4 py-2 text-sm font-bold text-teal-800 disabled:opacity-50">{pending ? "جارٍ التحقق من سلة…" : "فحص اشتراك سلة"}</button>
    </form>
    <p role="status" aria-live="polite" className="mt-3 text-sm leading-7 text-slate-600">{state.message}</p>
    {state.checkedAt ? <p className="mt-2 text-xs text-slate-500">وقت الفحص: {new Date(state.checkedAt).toLocaleString("ar-SA", { timeZone: "Asia/Riyadh" })}{state.providerStatus ? ` · HTTP ${state.providerStatus}` : ""}</p> : null}
    {state.status === "success" ? <div className="mt-3 space-y-2">{state.subscriptions?.length ? state.subscriptions.map((row, index) => <dl key={`${row.id ?? "unknown"}:${index}`} className="grid gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-2">
      <div><dt className="text-slate-500">معرّف الاشتراك</dt><dd className="mt-1 break-all font-mono">{row.id ?? "غير متاح"}</dd></div>
      <div><dt className="text-slate-500">نوع العنصر / الخطة</dt><dd className="mt-1">{row.itemType ?? "غير متاح"} / {row.planType ?? "غير متاح"}</dd></div>
      <div><dt className="text-slate-500">اسم الخطة</dt><dd className="mt-1">{row.planName ?? "لم ترسل سلة اسمًا"}</dd></div>
      <div><dt className="text-slate-500">الفترة كما أرسلتها سلة</dt><dd className="mt-1 break-all">{row.startsAt ?? "غير متاح"} — {row.endsAt ?? "غير متاح"}</dd></div>
    </dl>) : <p className="text-sm text-slate-600">أعادت سلة قائمة اشتراكات فارغة.</p>}</div> : null}
  </div>;
}
