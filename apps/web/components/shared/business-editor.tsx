"use client";

import { useActionState } from "react";
import { updateBusinessAction } from "../../app/actions/business";

type BusinessRecord = {
  name: string;
  description: string | null;
  city: string | null;
  whatsapp: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  isPublished: boolean;
} | null;

export function BusinessEditor({ business }: { business: BusinessRecord }) {
  const [state, action, pending] = useActionState(updateBusinessAction, { error: "" });

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h1 className="text-3xl font-black">تعديل صفحة النشاط</h1>
      </div>

      <form action={action} className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
        <label className="grid gap-2 text-sm">
          <span>اسم النشاط</span>
          <input defaultValue={business?.name ?? ""} name="name" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
        </label>
        <label className="grid gap-2 text-sm">
          <span>الوصف</span>
          <textarea defaultValue={business?.description ?? ""} name="description" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>المدينة</span>
            <input defaultValue={business?.city ?? ""} name="city" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
          </label>
          <label className="grid gap-2 text-sm">
            <span>الواتساب</span>
            <input defaultValue={business?.whatsapp ?? ""} name="whatsapp" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>الهاتف</span>
            <input defaultValue={business?.phone ?? ""} name="phone" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
          </label>
          <label className="grid gap-2 text-sm">
            <span>عنوان النشاط</span>
            <input defaultValue={business?.address ?? ""} name="address" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
          </label>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>رابط الشعار</span>
            <input defaultValue={business?.logoUrl ?? ""} name="logoUrl" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
          </label>
          <label className="grid gap-2 text-sm">
            <span>اللون الأساسي</span>
            <input defaultValue={business?.primaryColor ?? "#6366f1"} name="primaryColor" type="color" className="h-12 rounded-2xl border border-white/10 bg-slate-900 px-2 py-2" />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input defaultChecked={business?.isPublished ?? false} name="isPublished" type="checkbox" className="h-4 w-4" />
          <span>نشر الصفحة</span>
        </label>
        {state.error ? <p className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{state.error}</p> : null}
        <button disabled={pending} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">
          {pending ? "جاري الحفظ..." : "حفظ التغييرات"}
        </button>
      </form>
    </div>
  );
}
