import { ArrowUpRight, Store } from "lucide-react";
import type { PublicProduct } from "./types";

type PublicExternalStoreSectionProps = {
  products: PublicProduct[];
  productExternalLinks: Record<string, string>;
  externalStoreUrl: string | null;
  accentColor: string;
  title?: string;
  darkMode?: boolean;
};

function formatPrice(value: number) {
  return `${value.toLocaleString("ar-SA")} ر.س`;
}

export function PublicExternalStoreSection({
  products,
  productExternalLinks,
  externalStoreUrl,
  accentColor,
  title = "منتجات مميزة",
  darkMode = false,
}: PublicExternalStoreSectionProps) {
  if (products.length === 0) {
    return null;
  }

  return (
    <section id="products-section" className={`space-y-4 p-4 ${darkMode ? "rounded-[24px] border border-white/10 bg-slate-950/70" : "rounded-[18px] border border-[#e8ebf7] bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className={`text-xl font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{title}</h2>
          <p className={`mt-1 text-sm ${darkMode ? "text-slate-300" : "text-slate-600"}`}>أفضل المنتجات المختارة مع روابط شراء مباشرة.</p>
        </div>

        {externalStoreUrl ? (
          <a
            id="external-store-link"
            href={externalStoreUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-black text-white"
            style={{ backgroundColor: accentColor }}
          >
            <Store className="h-4 w-4" />
            زيارة المتجر الإلكتروني
          </a>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => {
          const productUrl = productExternalLinks[product.id] ?? "";
          const hasDiscount = Boolean(product.oldPrice && product.oldPrice > product.price);
          return (
            <article key={product.id} className={`overflow-hidden rounded-2xl border ${darkMode ? "border-white/10 bg-white/5" : "border-[#e8ebf7] bg-[#fcfdff]"}`}>
              <div className={`relative h-40 w-full ${darkMode ? "bg-[#0f1830]" : "bg-[#f3f6ff]"}`}>
                {product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" loading="lazy" /> : null}
              </div>

              <div className="space-y-2 p-3">
                <h3 className={`line-clamp-1 text-base font-black ${darkMode ? "text-white" : "text-[#1f2552]"}`}>{product.name}</h3>
                <p className={`line-clamp-2 text-xs leading-6 ${darkMode ? "text-slate-300" : "text-slate-600"}`}>{product.description || "وصف مختصر للمنتج"}</p>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black" style={{ color: accentColor }}>{formatPrice(product.price)}</p>
                    {hasDiscount ? <p className={`text-[11px] line-through ${darkMode ? "text-slate-500" : "text-slate-400"}`}>{formatPrice(product.oldPrice ?? 0)}</p> : null}
                  </div>

                  {productUrl ? (
                    <a
                      href={productUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className={`inline-flex h-9 items-center gap-1 rounded-lg border px-3 text-xs font-bold ${darkMode ? "border-white/15 bg-white/5 text-white" : "border-[#dce2f8] bg-white text-[#2f3a8a]"}`}
                    >
                      عرض المنتج
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <span className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold ${darkMode ? "border-white/10 text-slate-400" : "border-[#e5e9f7] text-slate-400"}`}>
                      الرابط غير متاح
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
