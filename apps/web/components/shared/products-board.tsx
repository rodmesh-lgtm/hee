"use client";

import { useActionState } from "react";
import { addProductAction, deleteProductAction, updateProductAction } from "../../app/actions/product";

const limits = {
  FREE: 3,
  BUSINESS: 10,
  PRO: 30,
};

type ProductRecord = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isActive: boolean;
};

type ProductsBoardProps = {
  business: { plan: string | null; id: string } | null;
  products: ProductRecord[];
};

export function ProductsBoard({ business, products }: ProductsBoardProps) {
  const [addState, addAction, addPending] = useActionState(addProductAction, { error: "" });
  const [deleteState, deleteAction, deletePending] = useActionState(deleteProductAction, { error: "" });
  const [updateState, updateAction, updatePending] = useActionState(updateProductAction, { error: "" });
  const limit = limits[business?.plan as keyof typeof limits] ?? limits.FREE;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black">المنتجات والخدمات</h1>
            <p className="mt-2 text-sm text-slate-400">الحد المسموح: {limit} منتجات</p>
          </div>
        </div>
      </div>

      <form action={addAction} className="grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>اسم المنتج</span>
            <input name="name" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
          </label>
          <label className="grid gap-2 text-sm">
            <span>السعر</span>
            <input name="price" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
          </label>
        </div>
        <label className="grid gap-2 text-sm">
          <span>الوصف</span>
          <textarea name="description" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" required />
        </label>
        <label className="grid gap-2 text-sm">
          <span>رابط الصورة</span>
          <input name="imageUrl" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input defaultChecked name="isActive" type="checkbox" className="h-4 w-4" />
          <span>منتج نشط</span>
        </label>
        {addState.error ? <p className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{addState.error}</p> : null}
        <button disabled={addPending} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">
          {addPending ? "جاري الإضافة..." : "إضافة منتج"}
        </button>
      </form>

      <div className="grid gap-4">
        {products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-slate-400">لا توجد منتجات حتى الآن</div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{product.name}</h2>
                  <p className="mt-1 text-sm text-slate-400">{product.description}</p>
                </div>
                <div className="text-lg font-black">{product.price}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={updateAction} className="flex gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="name" value={product.name} />
                  <input type="hidden" name="description" value={product.description ?? ""} />
                  <input type="hidden" name="price" value={product.price} />
                  <input type="hidden" name="imageUrl" value={product.imageUrl ?? ""} />
                  <input type="hidden" name="isActive" value={product.isActive ? "on" : "off"} />
                  <button disabled={updatePending} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm">تحديث</button>
                </form>
                <form action={deleteAction} className="flex gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <button disabled={deletePending} className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200">حذف</button>
                </form>
              </div>
              {updateState.error ? <p className="mt-3 rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{updateState.error}</p> : null}
              {deleteState.error ? <p className="mt-3 rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{deleteState.error}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
