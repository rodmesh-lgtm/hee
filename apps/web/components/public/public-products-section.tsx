"use client";

import { useState } from "react";
import { MessageCircle, Package, X } from "lucide-react";
import type { PublicProduct } from "./types";

type PublicProductsSectionProps = {
  products: PublicProduct[];
  businessName: string;
  whatsapp: string | null;
  phone: string | null;
  accentColor: string;
  title?: string;
  darkMode?: boolean;
};

function formatPrice(value: number) {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

function toDigits(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "").trim();
}

export function PublicProductsSection({ products, businessName, whatsapp, phone, accentColor, title = "المنتجات", darkMode = false }: PublicProductsSectionProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeProduct = products.find((product) => product.id === activeId) ?? null;

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      <section id="products-section" className={`space-y-4 p-4 ${darkMode ? "rounded-[24px] border border-white/10 bg-slate-950/70" : "rounded-[18px] border border-[#e8ebf7] bg-white"}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className={`text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
            <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>عرض المنتجات المتاحة بدون سلة أو طلب داخلي.</p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? "border border-white/10 bg-white/5 text-slate-300" : "border border-[#e5e8f6] bg-[#f8f9ff] text-slate-600"}`}>
            {products.length} منتج
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => {
            const hasDiscount = Boolean(product.oldPrice && product.oldPrice > product.price);
            const whatsappHref = whatsapp
              ? `https://wa.me/${toDigits(whatsapp)}?text=${encodeURIComponent(`مرحباً ${businessName}، أود الاستفسار عن المنتج: ${product.name}`)}`
              : null;
            const contactHref = whatsappHref || (phone ? `tel:${phone}` : null);

            return (
              <article key={product.id} className={`overflow-hidden rounded-2xl border ${darkMode ? "border-white/10 bg-white/5" : "border-[#e8ebf7] bg-white shadow-[0_18px_28px_-24px_rgba(52,70,130,0.36)]"}`}>
                <div className={`relative h-36 w-full ${darkMode ? "bg-[#0d1630]" : "bg-[#f3f5ff]"}`}>
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-slate-500">
                      <Package className="h-6 w-6" />
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-3">
                  <div>
                    <p className={`line-clamp-1 font-bold ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{product.name}</p>
                    <p className={`mt-1 line-clamp-2 text-xs leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{product.description || "وصف مختصر لهذا المنتج."}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black" style={{ color: accentColor }}>{formatPrice(product.price)}</p>
                      {hasDiscount ? <p className={`text-[11px] line-through ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{formatPrice(product.oldPrice ?? 0)}</p> : null}
                    </div>
                    <button type="button" onClick={() => setActiveId(product.id)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${darkMode ? "border-white/15 text-slate-100" : "border-[#dbe2f7] text-[#34408a]"}`}>
                      التفاصيل
                    </button>
                  </div>

                  {contactHref ? (
                    <a
                      href={contactHref}
                      target={whatsappHref ? "_blank" : undefined}
                      rel={whatsappHref ? "noreferrer noopener" : undefined}
                      className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-black text-white"
                      style={{ backgroundColor: accentColor }}
                    >
                      <MessageCircle className="h-4 w-4" />
                      استفسار عن المنتج
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {activeProduct ? (
        <div className="fixed inset-0 z-[95] flex items-end bg-black/65 p-3 backdrop-blur sm:items-center sm:justify-center">
          <div className={`w-full max-w-md rounded-2xl border p-4 ${darkMode ? "border-white/15 bg-[#101b34] text-white" : "border-[#e7ebf8] bg-white text-[#1f2552]"}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-lg font-black">{activeProduct.name}</h3>
              <button type="button" onClick={() => setActiveId(null)} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border ${darkMode ? "border-white/15" : "border-[#dbe2f7]"}`} aria-label="إغلاق">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className={`mt-2 text-sm leading-7 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{activeProduct.description || "لا يوجد وصف إضافي لهذا المنتج."}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
