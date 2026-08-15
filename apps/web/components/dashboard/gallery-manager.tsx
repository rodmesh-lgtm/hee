"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  addGalleryItemBuilderAction,
  deleteGalleryItemBuilderAction,
  updateGalleryItemBuilderAction,
  type BuilderActionState,
} from "../../app/actions/catalog-media";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type GalleryBusiness = Prisma.BusinessGetPayload<{
  include: {
    galleryItems: true;
  };
}>;

const defaultState: BuilderActionState = {};

export function GalleryManager({ business }: { business: GalleryBusiness }) {
  const router = useRouter();
  const [state, addAction, pending] = useActionState(addGalleryItemBuilderAction, defaultState);

  return (
    <div className="space-y-6">
      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h2 className="text-2xl font-black text-white">رفع صورة جديدة</h2>
        <form action={addAction} className="grid gap-3 lg:grid-cols-2">
          <input type="file" name="imageFile" accept="image/*" required className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200 lg:col-span-2" />
          <input name="caption" placeholder="وصف الصورة (اختياري)" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="sortOrder" type="number" min="0" defaultValue="0" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />

          {state.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">{state.error}</p> : null}
          {state.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 lg:col-span-2">{state.success}</p> : null}

          <div className="lg:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "جاري الرفع..." : "إضافة الصورة"}</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h3 className="text-xl font-black text-white">صور المعرض ({business.galleryItems.length})</h3>
        {business.galleryItems.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">لا توجد صور في المعرض حتى الآن.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {business.galleryItems.map((item) => (
              <form
                key={item.id}
                action={async (formData) => {
                  await updateGalleryItemBuilderAction(formData);
                  router.refresh();
                }}
                className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3"
              >
                <input type="hidden" name="galleryItemId" value={item.id} />
                <img src={item.imageUrl} alt={item.caption ?? "gallery"} className="h-40 w-full rounded-xl object-cover" />
                <input name="caption" defaultValue={item.caption ?? ""} className="h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" placeholder="وصف الصورة" />
                <input name="sortOrder" type="number" min="0" defaultValue={item.sortOrder} className="h-10 w-full rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                <label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="isActive" defaultChecked={item.isActive} /> نشطة</label>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-3 text-sm font-bold text-white">حفظ</button>
                  <button
                    formAction={async (formData) => {
                      await deleteGalleryItemBuilderAction(formData);
                      router.refresh();
                    }}
                    onClick={(event) => {
                      if (!window.confirm("هل تريد حذف هذه الصورة؟")) {
                        event.preventDefault();
                      }
                    }}
                    className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 text-sm font-bold text-rose-100"
                  >
                    حذف
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
