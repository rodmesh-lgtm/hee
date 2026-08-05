"use client";

import { useActionState } from "react";
import { saveBrandingStepAction, type BuilderActionState } from "../../app/actions/page-builder";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type PageCustomizationData = {
  primaryColor: string | null;
  secondaryColor: string | null;
  buttonColor: string | null;
  buttonStyle: string | null;
  cardStyle: string | null;
};

const defaultState: BuilderActionState = {};

export function PageCustomizationManager({ business }: { business: PageCustomizationData }) {
  const [state, action, pending] = useActionState(saveBrandingStepAction, defaultState);

  return (
    <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
      <h2 className="text-2xl font-black text-white">تخصيص الصفحة</h2>
      <p className="text-sm text-slate-300">تعديل ألوان ونمط الأزرار والبطاقات باستخدام قدرات التخصيص المتوفرة حالياً.</p>

      <form action={action} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="grid gap-2 text-sm text-slate-200">
            اللون الأساسي
            <input type="color" name="primaryColor" defaultValue={business.primaryColor ?? "#5D43EF"} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 p-2" />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            اللون الثانوي
            <input type="color" name="secondaryColor" defaultValue={business.secondaryColor ?? "#1E293B"} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 p-2" />
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            لون الأزرار
            <input type="color" name="buttonColor" defaultValue={business.buttonColor ?? "#4F46E5"} className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 p-2" />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-sm text-slate-200">
            نمط الأزرار
            <select name="buttonStyle" defaultValue={business.buttonStyle ?? "rounded"} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white">
              <option value="rounded">Rounded</option>
              <option value="pill">Pill</option>
              <option value="square">Square</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm text-slate-200">
            نمط البطاقات
            <select name="cardStyle" defaultValue={business.cardStyle ?? "glass"} className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white">
              <option value="glass">Glass</option>
              <option value="flat">Flat</option>
              <option value="elevated">Elevated</option>
            </select>
          </label>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-slate-300">معاينة سريعة</p>
          <div className="mt-3 rounded-2xl border border-white/10 p-4" style={{ backgroundColor: business.secondaryColor ?? "#1E293B" }}>
            <div className="mb-3 text-sm font-bold text-white">عنوان تجريبي</div>
            <button
              type="button"
              className="rounded-xl px-4 py-2 text-sm font-bold text-white"
              style={{ backgroundColor: business.buttonColor ?? "#4F46E5" }}
            >
              زر تجريبي
            </button>
          </div>
        </div>

        {state.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{state.error}</p> : null}
        {state.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{state.success}</p> : null}

        <Button type="submit" disabled={pending}>{pending ? "جاري الحفظ..." : "حفظ التخصيص"}</Button>
      </form>
    </Card>
  );
}
