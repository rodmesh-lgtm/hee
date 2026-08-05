"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, Store, Trash2, X } from "lucide-react";
import type { PublicProduct } from "./types";

type CartItem = {
  product: PublicProduct;
  quantity: number;
  notes: string;
};

type OrderFormState = {
  customerName: string;
  customerPhone: string;
  notes: string;
  orderType: "استلام" | "توصيل";
};

type PublicProductsCartProps = {
  businessSlug: string;
  products: PublicProduct[];
  onlineOrdersEnabled: boolean;
};

function formatPrice(value: number) {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export function PublicProductsCart({ businessSlug, products, onlineOrdersEnabled }: PublicProductsCartProps) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [productNotes, setProductNotes] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderForm, setOrderForm] = useState<OrderFormState>({ customerName: "", customerPhone: "", notes: "", orderType: "استلام" });
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId) ?? null, [products, selectedProductId]);
  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const delivery = orderForm.orderType === "توصيل" ? 10 : 0;
  const grandTotal = subtotal + delivery;

  const addToCart = (product: PublicProduct, qty: number, notes: string) => {
    if (!product.isActive) {
      setFeedback({ type: "error", message: "هذا المنتج غير متاح حالياً" });
      return;
    }

    setCart((current) => {
      const existing = current[product.id];
      if (existing) {
        return {
          ...current,
          [product.id]: {
            ...existing,
            quantity: existing.quantity + qty,
            notes: notes || existing.notes,
          },
        };
      }

      return {
        ...current,
        [product.id]: { product, quantity: qty, notes },
      };
    });

    setFeedback({ type: "success", message: `${product.name} أضيف إلى السلة` });
    setCartOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((current) => {
      const existing = current[productId];
      if (!existing) {
        return current;
      }

      const nextQuantity = existing.quantity + delta;
      if (nextQuantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }

      return {
        ...current,
        [productId]: { ...existing, quantity: nextQuantity },
      };
    });
  };

  const removeItem = (productId: string) => {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  };

  const submitOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onlineOrdersEnabled) {
      setFeedback({ type: "error", message: "استقبال الطلبات غير مفعل حالياً" });
      return;
    }

    if (cartItems.length === 0) {
      setFeedback({ type: "error", message: "أضف منتجاً واحداً على الأقل قبل الإرسال" });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: businessSlug,
          customerName: orderForm.customerName,
          customerPhone: orderForm.customerPhone,
          notes: orderForm.notes,
          orderType: orderForm.orderType,
          items: cartItems.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
        }),
      });

      const data = (await response.json()) as { success?: boolean; orderId?: string; error?: string };
      if (!response.ok) {
        setFeedback({ type: "error", message: data.error ?? "تعذر إنشاء الطلب" });
        return;
      }

      setFeedback({ type: "success", message: `تم إنشاء الطلب بنجاح، رقم الطلب ${data.orderId}` });
      setCart({});
      setOrderForm({ customerName: "", customerPhone: "", notes: "", orderType: "استلام" });
      setCartOpen(false);
    } catch {
      setFeedback({ type: "error", message: "تعذر إنشاء الطلب" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">المنتجات</h2>
          <button onClick={() => setCartOpen(true)} className="rounded-2xl bg-indigo-500/20 px-3 py-2 text-sm font-bold text-indigo-200">
            السلة ({cartItems.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {products.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
              <div className="h-40 bg-slate-900/70">
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-slate-500"><Store className="h-8 w-8" /></div>}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">{product.name}</h3>
                    <p className="mt-1 text-sm text-slate-400">{product.description}</p>
                  </div>
                  <div className="text-left">
                    {product.oldPrice ? <p className="text-xs text-slate-500 line-through">{formatPrice(product.oldPrice)}</p> : null}
                    <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-sm font-bold text-indigo-200">{formatPrice(product.price)}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400">
                  <span>{product.categoryName ?? "بدون تصنيف"}</span>
                  <span>{product.isActive ? "متوفر" : "غير متوفر"}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setQuantity(1);
                      setProductNotes("");
                    }}
                    className="flex-1 rounded-2xl border border-white/10 px-3 py-2 text-sm font-bold"
                  >
                    تفاصيل
                  </button>
                  <button onClick={() => addToCart(product, 1, "")} className="flex-1 rounded-2xl bg-indigo-500 px-3 py-2 text-sm font-bold text-white" disabled={!product.isActive}>
                    إضافة للسلة
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
        <h2 className="mb-4 text-xl font-black">إتمام الطلب</h2>
        {!onlineOrdersEnabled ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">استقبال الطلبات غير مفعل حالياً لدى النشاط.</div>
        ) : null}
        <form onSubmit={submitOrder} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input value={orderForm.customerName} onChange={(event) => setOrderForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="الاسم" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" required />
            <input value={orderForm.customerPhone} onChange={(event) => setOrderForm((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="الهاتف" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" required />
          </div>
          <textarea value={orderForm.notes} onChange={(event) => setOrderForm((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات الطلب" className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" />
          <div className="flex gap-3">
            <label className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <input type="radio" checked={orderForm.orderType === "استلام"} onChange={() => setOrderForm((current) => ({ ...current, orderType: "استلام" }))} />
              استلام
            </label>
            <label className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <input type="radio" checked={orderForm.orderType === "توصيل"} onChange={() => setOrderForm((current) => ({ ...current, orderType: "توصيل" }))} />
              توصيل
            </label>
          </div>
          <div className="rounded-[24px] border border-dashed border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
            <div className="flex items-center justify-between">
              <span>الإجمالي الفرعي</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span>التوصيل</span>
              <span>{formatPrice(delivery)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2 font-black text-white">
              <span>الإجمالي الكلي</span>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>
          <button type="submit" disabled={submitting || !onlineOrdersEnabled} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-3 font-black disabled:cursor-not-allowed disabled:opacity-60">
            {submitting ? "جاري الإرسال..." : "إرسال الطلب"}
          </button>
        </form>
      </section>

      {feedback ? <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>{feedback.message}</div> : null}

      {cartOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 p-3 backdrop-blur sm:p-6">
          <div className="flex h-full w-full max-w-md flex-col rounded-[28px] border border-white/10 bg-slate-950 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">السلة</p>
                <h3 className="text-xl font-black">طلبك</h3>
              </div>
              <button onClick={() => setCartOpen(false)} className="rounded-2xl border border-white/10 p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 flex-1 space-y-3 overflow-auto">
              {cartItems.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-sm text-slate-400">السلة فارغة</div> : cartItems.map((item) => (
                <div key={item.product.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-black">{item.product.name}</p>
                      <p className="text-sm text-slate-400">{formatPrice(item.product.price)}</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="rounded-full border border-rose-500/30 bg-rose-500/10 p-2 text-rose-300" aria-label="حذف">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {item.notes ? <p className="mt-2 text-xs text-slate-400">ملاحظات: {item.notes}</p> : null}
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="rounded-full border border-white/10 p-2"><Minus className="h-4 w-4" /></button>
                    <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="rounded-full border border-white/10 p-2"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/10 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-400">
                <span>الإجمالي الكلي</span>
                <span className="text-lg font-black text-white">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {selectedProduct ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-slate-950/80 p-3 backdrop-blur sm:items-center sm:justify-center sm:p-6">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-slate-950 p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-400">تفاصيل المنتج</p>
                <h3 className="text-xl font-black">{selectedProduct.name}</h3>
              </div>
              <button onClick={() => setSelectedProductId(null)} className="rounded-2xl border border-white/10 p-2"><X className="h-5 w-5" /></button>
            </div>
            <div className="mt-4 h-44 overflow-hidden rounded-2xl border border-white/10 bg-white/5">
              {selectedProduct.imageUrl ? <img src={selectedProduct.imageUrl} alt={selectedProduct.name} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-slate-500"><Store className="h-8 w-8" /></div>}
            </div>
            <p className="mt-4 text-sm leading-8 text-slate-300">{selectedProduct.description}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              <div className="text-right">
                <p className="text-xs text-slate-400">السعر</p>
                <p className="font-black text-white">{formatPrice(selectedProduct.price)}</p>
              </div>
              <div className="text-left">
                <p className="text-xs text-slate-400">قبل الخصم</p>
                <p className="font-black text-white">{selectedProduct.oldPrice ? formatPrice(selectedProduct.oldPrice) : "-"}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-full border border-white/10 p-2"><Minus className="h-4 w-4" /></button>
                <span className="min-w-6 text-center font-black">{quantity}</span>
                <button onClick={() => setQuantity((value) => value + 1)} className="rounded-full border border-white/10 p-2"><Plus className="h-4 w-4" /></button>
              </div>
              <span className="text-xs text-slate-400">الكمية</span>
            </div>
            <textarea value={productNotes} onChange={(event) => setProductNotes(event.target.value)} placeholder="ملاحظات المنتج" className="mt-4 min-h-20 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right text-sm text-white" />
            <button
              onClick={() => {
                addToCart(selectedProduct, quantity, productNotes);
                setSelectedProductId(null);
              }}
              className="mt-4 w-full rounded-2xl bg-indigo-500 px-4 py-3 font-black"
            >
              إضافة للسلة
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
