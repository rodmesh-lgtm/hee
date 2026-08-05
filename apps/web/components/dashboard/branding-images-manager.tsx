"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { CheckCircle2, ImageUp } from "lucide-react";
import { updateBusinessBrandingImagesAction, type ActionState } from "../../app/actions/business";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type BrandingImagesManagerProps = {
  logoUrl: string | null;
  coverUrl: string | null;
};

const defaultState: ActionState = {};

function readPreview(file: File, onReady: (value: string) => void) {
  const reader = new FileReader();
  reader.onload = () => onReady(typeof reader.result === "string" ? reader.result : "");
  reader.readAsDataURL(file);
}

export function BrandingImagesManager({ logoUrl, coverUrl }: BrandingImagesManagerProps) {
  const [state, action, pending] = useActionState(updateBusinessBrandingImagesAction, defaultState);
  const [logoPreview, setLogoPreview] = useState(logoUrl ?? "");
  const [coverPreview, setCoverPreview] = useState(coverUrl ?? "");

  return (
    <form action={action} className="space-y-6">
      {state.success ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {state.success}
          </span>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">الشعار</h2>
            <p className="text-sm text-slate-300">يفضل صورة مربعة واضحة لا تقل عن 512x512 بكسل.</p>
          </div>

          <label className="block rounded-2xl border border-dashed border-white/20 bg-white/5 p-4">
            <span className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ImageUp className="h-4 w-4" />
              رفع أو تغيير الشعار
            </span>
            <input
              type="file"
              name="logoFile"
              accept="image/*"
              className="w-full text-sm text-slate-200 file:ml-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-bold file:text-white"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) {
                  readPreview(file, setLogoPreview);
                }
              }}
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {logoPreview ? (
              <div className="relative h-28 w-28 overflow-hidden rounded-2xl border border-white/10">
                <Image src={logoPreview} alt="معاينة الشعار" fill sizes="112px" className="object-cover" unoptimized />
              </div>
            ) : (
              <p className="text-sm text-slate-400">لا يوجد شعار مرفوع حالياً.</p>
            )}
          </div>
        </Card>

        <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">صورة الغلاف</h2>
            <p className="text-sm text-slate-300">يفضل مقاس 1600x900 بكسل أو أعلى للحصول على أفضل عرض.</p>
          </div>

          <label className="block rounded-2xl border border-dashed border-white/20 bg-white/5 p-4">
            <span className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-200">
              <ImageUp className="h-4 w-4" />
              رفع أو تغيير صورة الغلاف
            </span>
            <input
              type="file"
              name="coverFile"
              accept="image/*"
              className="w-full text-sm text-slate-200 file:ml-3 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-3 file:py-2 file:font-bold file:text-white"
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) {
                  readPreview(file, setCoverPreview);
                }
              }}
            />
          </label>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            {coverPreview ? (
              <div className="relative h-36 w-full overflow-hidden rounded-2xl border border-white/10">
                <Image src={coverPreview} alt="معاينة الغلاف" fill sizes="(max-width: 768px) 100vw, 600px" className="object-cover" unoptimized />
              </div>
            ) : (
              <p className="text-sm text-slate-400">لا توجد صورة غلاف حالياً.</p>
            )}
          </div>
        </Card>
      </div>

      {state.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{state.error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "جاري الرفع..." : "حفظ الهوية والصور"}
        </Button>
      </div>
    </form>
  );
}
