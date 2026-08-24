"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Minus, Plus, ShoppingCart } from "lucide-react";
import {
  createBusinessStoreDraftAction,
  setBusinessStoreDraftItemAction,
} from "../../app/actions/business-store";
import type { BusinessStoreCatalogItem } from "../../app/lib/business-store-catalog";

type CartLine = {
  sku: string;
  title: string;
  quantity: number;
  unitPrice: number;
};

function sar(halalas: number) {
  return new Intl.NumberFormat("ar-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(halalas / 100);
}

function makeIdempotencyKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `store-${crypto.randomUUID()}`;
  return `store-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function BusinessStoreDraftBuilder({ catalog }: { catalog: readonly BusinessStoreCatalogItem[] }) {
  const [draftKey] = useState(makeIdempotencyKey);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [serverSubtotal, setServerSubtotal] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingSku, setPendingSku] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const itemCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);

  function quantityFor(sku: string) {
    return cart.find((line) => line.sku === sku)?.quantity ?? 0;
  }

  function save(item: BusinessStoreCatalogItem, nextQuantity: number) {
    if (nextQuantity < 1 || nextQuantity > item.maxQuantity || isPending) return;
    setPendingSku(item.sku);
    setMessage(null);
    setError(null);

    startTransition(async () => {
      try {
        let activeOrderId = orderId;
        if (!activeOrderId) {
          const draft = await createBusinessStoreDraftAction({
            idempotencyKey: draftKey,
            customization: { source: "dashboard-business-store" },
          });
          if (!draft.ok) {
            setError("تعذر إنشاء مسودة الطلب. تحقق من بيانات المنشأة وحاول مرة أخرى.");
            return;
          }
          activeOrderId = draft.orderId;
          setOrderId(draft.orderId);
        }

        const result = await setBusinessStoreDraftItemAction({
          orderId: activeOrderId,
          sku: item.sku,
          quantity: nextQuantity,
          customization: { publicQr: true },
        });
        if (!result.ok) {
          setError("تعذر حفظ المنتج في المسودة. لم يتم فتح أي عملية دفع.");
          return;
        }

        setCart((current) => {
          const without = current.filter((line) => line.sku !== item.sku);
          return [...without, { sku: item.sku, title: item.title, quantity: nextQuantity, unitPrice: item.unitPrice }];
        });
        setServerSubtotal(result.subtotal);
        setMessage(result.replaced ? "تم تحديث الكمية في مسودة الطلب." : "تمت إضافة المنتج إلى مسودة الطلب.");
      } catch {
        setError("حدث خطأ أثناء حفظ المسودة. لم يتم تنفيذ أي خصم مالي.");
      } finally {
        setPendingSku(null);
      }
    });
  }

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {catalog.map((item) => {
        const quantity = quantityFor(item.sku);
        const busy = isPending && pendingSku === item.sku;
        return <article key={item.sku} data-store-sku={item.sku} className="flex min-h-[235px] flex-col rounded-[22px] border border-[#e9eaf4] bg-[#fcfcff] p-4">
          <div className="flex items-start justify-between gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6745cf]"><ShoppingCart className="h-5 w-5" /></span>
            <span className="rounded-full border border-[#e5e0f7] bg-white px-2.5 py-1 text-[10px] font-black text-[#6a58bb]">{item.badge}</span>
          </div>
          <h3 className="mt-4 text-base font-black text-[#20264f]">{item.title}</h3>
          <p className="mt-2 text-xs leading-6 text-slate-500">{item.description}</p>
          <div className="mt-3 text-sm font-black text-[#5b3fd6]">{sar(item.unitPrice)}</div>
          <div className="mt-auto pt-4">
            {quantity === 0 ? <button type="button" disabled={isPending} onClick={() => save(item, 1)} className="min-h-10 w-full rounded-xl bg-[#5b3fd6] px-3 text-xs font-black text-white disabled:opacity-60">{busy ? "جارٍ الحفظ..." : "أضف لمسودة الطلب"}</button> : <div className="flex items-center justify-between rounded-xl border border-[#e3dff2] bg-white p-1.5">
              <button type="button" aria-label={`إنقاص ${item.title}`} disabled={isPending || quantity <= 1} onClick={() => save(item, quantity - 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 disabled:opacity-40"><Minus className="h-4 w-4" /></button>
              <span className="text-xs font-black">{busy ? "..." : `${quantity} قطعة`}</span>
              <button type="button" aria-label={`زيادة ${item.title}`} disabled={isPending || quantity >= item.maxQuantity} onClick={() => save(item, quantity + 1)} className="grid h-8 w-8 place-items-center rounded-lg bg-[#f1edff] text-[#5b3fd6] disabled:opacity-40"><Plus className="h-4 w-4" /></button>
            </div>}
          </div>
        </article>;
      })}
    </div>

    {(orderId || message || error) ? <section data-store-draft-summary className="rounded-[22px] border border-[#ded8f1] bg-[#faf9ff] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><div className="flex items-center gap-2 text-sm font-black text-[#20264f]"><CheckCircle2 className="h-4 w-4 text-emerald-600" />مسودة طلب محفوظة</div><p className="mt-1 text-[11px] leading-5 text-slate-500">المسودة ليست طلب شراء نهائيًا ولا تنشئ أي عملية دفع. ستبقى المراجعة والعنوان والدفع خطوة مستقلة عند فتحها.</p></div>
        <div className="text-left"><span className="block text-[10px] font-bold text-slate-400">الإجمالي الحالي</span><b data-store-subtotal className="text-lg text-[#5b3fd6]">{sar(serverSubtotal)}</b></div>
      </div>
      {cart.length ? <div className="mt-3 flex flex-wrap gap-2">{cart.map((line) => <span key={line.sku} className="rounded-full border border-[#e4dff4] bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600">{line.title} × {line.quantity}</span>)}</div> : null}
      <div className="mt-3 text-[11px] font-bold text-slate-500">عدد القطع: {itemCount}</div>
      {message ? <p role="status" className="mt-3 text-xs font-bold text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="mt-3 text-xs font-bold text-rose-700">{error}</p> : null}
    </section> : null}
  </div>;
}
