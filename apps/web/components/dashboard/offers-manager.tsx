"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  addOfferBuilderAction,
  deleteOfferBuilderAction,
  updateOfferBuilderAction,
  type BuilderActionState,
} from "../../app/actions/page-builder";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type OffersBusiness = Prisma.BusinessGetPayload<{
  include: {
    offers: true;
  };
}>;

const defaultState: BuilderActionState = {};

function toInputDate(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function getOfferState(offer: OffersBusiness["offers"][number]) {
  if (!offer.isActive) {
    return "غير نشط";
  }

  if (offer.endsAt && offer.endsAt < new Date()) {
    return "منتهي";
  }

  return "نشط";
}

export function OffersManager({ business }: { business: OffersBusiness }) {
  const router = useRouter();
  const [state, addOfferAction, pending] = useActionState(addOfferBuilderAction, defaultState);

  return (
    <div className="space-y-6">
      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h2 className="text-2xl font-black text-white">إضافة عرض</h2>
        <form action={addOfferAction} className="grid gap-3 lg:grid-cols-2">
          <input name="title" required placeholder="عنوان العرض" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="discountLabel" required placeholder="مثال: خصم 25%" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <textarea name="description" required placeholder="وصف العرض" className="min-h-24 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white lg:col-span-2" />
          <input name="startsAt" type="date" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="endsAt" type="date" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="sortOrder" type="number" min="0" defaultValue="0" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="imageFile" type="file" accept="image/*" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200" />
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 lg:col-span-2">
            <input type="checkbox" name="isActive" defaultChecked />
            العرض نشط
          </label>

          {state.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">{state.error}</p> : null}
          {state.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 lg:col-span-2">{state.success}</p> : null}

          <div className="lg:col-span-2">
            <Button type="submit" disabled={pending}>{pending ? "جاري الإضافة..." : "إضافة العرض"}</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h3 className="text-xl font-black text-white">العروض الحالية ({business.offers.length})</h3>
        {business.offers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">لا توجد عروض مضافة بعد.</p>
        ) : (
          <div className="space-y-3">
            {business.offers.map((offer) => (
              <form
                key={offer.id}
                action={async (formData) => {
                  await updateOfferBuilderAction(formData);
                  router.refresh();
                }}
                className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <input type="hidden" name="offerId" value={offer.id} />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-white">{offer.title}</span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-slate-200">{getOfferState(offer)}</span>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                  <input name="title" defaultValue={offer.title} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="discountLabel" defaultValue={offer.discountLabel ?? ""} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <textarea name="description" defaultValue={offer.description ?? ""} className="min-h-20 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white lg:col-span-2" />
                  <input name="startsAt" type="date" defaultValue={toInputDate(offer.startsAt)} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="endsAt" type="date" defaultValue={toInputDate(offer.endsAt)} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="sortOrder" type="number" min="0" defaultValue={offer.sortOrder} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="imageFile" type="file" accept="image/*" className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-slate-200" />
                </div>

                <label className="inline-flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" name="isActive" defaultChecked={offer.isActive} /> العرض نشط</label>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-white">حفظ التعديلات</button>
                  <button
                    formAction={async (formData) => {
                      await deleteOfferBuilderAction(formData);
                      router.refresh();
                    }}
                    onClick={(event) => {
                      if (!window.confirm("هل تريد حذف هذا العرض؟")) {
                        event.preventDefault();
                      }
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-bold text-rose-100"
                  >
                    حذف العرض
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
