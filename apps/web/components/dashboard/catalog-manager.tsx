"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { Prisma } from "@prisma/client";
import {
  addProductBuilderAction,
  addServiceBuilderAction,
  deleteProductBuilderAction,
  deleteServiceBuilderAction,
  updateProductBuilderAction,
  updateServiceBuilderAction,
  type BuilderActionState,
} from "../../app/actions/page-builder";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type CatalogBusiness = Prisma.BusinessGetPayload<{
  include: {
    products: { include: { category: true } };
    services: true;
  };
}>;

const defaultState: BuilderActionState = {};

function formatPrice(value: number) {
  return new Intl.NumberFormat("ar-SA").format(value);
}

export function CatalogManager({ business }: { business: CatalogBusiness }) {
  const router = useRouter();
  const [productState, addProductAction, productPending] = useActionState(addProductBuilderAction, defaultState);
  const [serviceState, addServiceAction, servicePending] = useActionState(addServiceBuilderAction, defaultState);

  return (
    <div className="space-y-6">
      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h2 className="text-2xl font-black text-white">إضافة منتج</h2>
        <form action={addProductAction} className="grid gap-3 lg:grid-cols-2">
          <input name="name" required placeholder="اسم المنتج" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="categoryName" placeholder="التصنيف" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="unit" placeholder="الوحدة (اختياري)" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <textarea name="description" required placeholder="وصف المنتج" className="min-h-24 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white lg:col-span-2" />
          <input name="price" type="number" min="0" required placeholder="السعر" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="oldPrice" type="number" min="0" placeholder="السعر قبل الخصم (اختياري)" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="sortOrder" type="number" min="0" defaultValue="0" placeholder="ترتيب العرض" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="imageFile" type="file" accept="image/*" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200" />

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="isActive" defaultChecked />
            المنتج متاح
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="featured" />
            منتج مميز
          </label>

          {productState.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">{productState.error}</p> : null}
          {productState.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 lg:col-span-2">{productState.success}</p> : null}

          <div className="lg:col-span-2">
            <Button type="submit" disabled={productPending}>{productPending ? "جاري الإضافة..." : "إضافة المنتج"}</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h3 className="text-xl font-black text-white">المنتجات الحالية ({business.products.length})</h3>
        {business.products.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">لا توجد منتجات مضافة بعد.</p>
        ) : (
          <div className="space-y-3">
            {business.products.map((product) => (
              <form
                key={product.id}
                action={async (formData) => {
                  await updateProductBuilderAction(formData);
                  router.refresh();
                }}
                className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <input type="hidden" name="productId" value={product.id} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <input name="name" defaultValue={product.name} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="categoryName" defaultValue={product.category?.name ?? ""} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="unit" defaultValue={product.unit ?? ""} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" placeholder="الوحدة" />
                  <textarea name="description" defaultValue={product.description ?? ""} className="min-h-20 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white lg:col-span-2" />
                  <input name="price" type="number" min="0" defaultValue={product.price} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="oldPrice" type="number" min="0" defaultValue={product.oldPrice ?? ""} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="sortOrder" type="number" min="0" defaultValue={product.sortOrder} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="imageFile" type="file" accept="image/*" className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-slate-200" />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={product.isActive} /> متاح</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="featured" defaultChecked={product.featured} /> مميز</label>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300">السعر الحالي: {formatPrice(product.price)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-white">حفظ التعديلات</button>
                  <button
                    formAction={async (formData) => {
                      await deleteProductBuilderAction(formData);
                      router.refresh();
                    }}
                    onClick={(event) => {
                      if (!window.confirm("هل تريد حذف هذا المنتج؟")) {
                        event.preventDefault();
                      }
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-bold text-rose-100"
                  >
                    حذف المنتج
                  </button>
                </div>
              </form>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h2 className="text-2xl font-black text-white">إضافة خدمة</h2>
        <form action={addServiceAction} className="grid gap-3 lg:grid-cols-2">
          <input name="name" required placeholder="اسم الخدمة" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="price" type="number" min="0" required placeholder="السعر" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <textarea name="description" required placeholder="وصف الخدمة" className="min-h-24 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white lg:col-span-2" />
          <input name="durationMinutes" type="number" min="0" placeholder="المدة بالدقائق" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="sortOrder" type="number" min="0" defaultValue="0" placeholder="ترتيب العرض" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="imageFile" type="file" accept="image/*" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-200" />

          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="bookingEnabled" defaultChecked />
            الحجز مفعل
          </label>
          <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
            <input type="checkbox" name="isActive" defaultChecked />
            الخدمة متاحة
          </label>

          {serviceState.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">{serviceState.error}</p> : null}
          {serviceState.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 lg:col-span-2">{serviceState.success}</p> : null}

          <div className="lg:col-span-2">
            <Button type="submit" disabled={servicePending}>{servicePending ? "جاري الإضافة..." : "إضافة الخدمة"}</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h3 className="text-xl font-black text-white">الخدمات الحالية ({business.services.length})</h3>
        {business.services.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-white/15 p-4 text-sm text-slate-400">لا توجد خدمات مضافة بعد.</p>
        ) : (
          <div className="space-y-3">
            {business.services.map((service) => (
              <form
                key={service.id}
                action={async (formData) => {
                  await updateServiceBuilderAction(formData);
                  router.refresh();
                }}
                className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <input type="hidden" name="serviceId" value={service.id} />
                <div className="grid gap-3 lg:grid-cols-2">
                  <input name="name" defaultValue={service.name} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="price" type="number" min="0" defaultValue={service.price} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <textarea name="description" defaultValue={service.description ?? ""} className="min-h-20 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white lg:col-span-2" />
                  <input name="durationMinutes" type="number" min="0" defaultValue={service.durationMinutes ?? ""} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="sortOrder" type="number" min="0" defaultValue={service.sortOrder} className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-white" />
                  <input name="imageFile" type="file" accept="image/*" className="h-11 rounded-xl border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 lg:col-span-2" />
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="bookingEnabled" defaultChecked={service.bookingEnabled} /> الحجز مفعل</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" name="isActive" defaultChecked={service.isActive} /> متاح</label>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-slate-300">السعر الحالي: {formatPrice(service.price)}</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button type="submit" className="inline-flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 px-4 text-sm font-bold text-white">حفظ التعديلات</button>
                  <button
                    formAction={async (formData) => {
                      await deleteServiceBuilderAction(formData);
                      router.refresh();
                    }}
                    onClick={(event) => {
                      if (!window.confirm("هل تريد حذف هذه الخدمة؟")) {
                        event.preventDefault();
                      }
                    }}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-bold text-rose-100"
                  >
                    حذف الخدمة
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
