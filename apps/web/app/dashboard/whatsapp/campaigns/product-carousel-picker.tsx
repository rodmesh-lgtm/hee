"use client";
import { useState, useTransition } from "react";
import { loadMetaCatalogAction } from "../../../actions/whatsapp-product-carousel";
import type { ProductCarousel } from "../../../lib/whatsapp/product-carousel";
import type { CatalogProduct } from "../../../lib/whatsapp/meta-catalog";

export function ProductCarouselPicker({ connectionId, value, onChange }: { connectionId: string; value?: ProductCarousel; onChange: (value: ProductCarousel | undefined) => void }) {
  const [catalogs, setCatalogs] = useState<{ id: string; name: string }[]>([]);
  const [catalogId, setCatalogId] = useState(value?.catalogId ?? "");
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const ids = value?.retailerIds ?? [];
  function load(id?: string) {
    startTransition(async () => {
      setNotice("");
      const result = await loadMetaCatalogAction(connectionId, id);
      if ("error" in result) { setNotice(result.error ?? "تعذرت القراءة"); return; }
      setCatalogs(result.catalogs); setProducts(result.products);
      if (!result.catalogs.length) setNotice("لم يُربط كتالوج بهذا الحساب في Meta بعد.");
      else if (id && !result.products.length) setNotice("لا توجد منتجات متاحة في هذا الكتالوج.");
      else if (result.truncated) setNotice("نعرض أول 500 منتج في الكتالوج. يمكنك اختيار المنتجات الظاهرة هنا.");
    });
  }
  return <section className="wa-page wa-panel wa-stack"><h3>بطاقات منتجات Meta</h3><p className="wa-note">اختر من منتجين إلى 10 منتجات من كتالوج الرقم نفسه. تظهر الصور والأسعار داخل واتساب من بيانات Meta الحالية.</p><button type="button" className="wa-button wa-secondary" disabled={pending || !connectionId} onClick={() => load()}>{pending ? "جارٍ القراءة…" : "قراءة كتالوجات الرقم"}</button>
    {catalogs.length ? <label>الكتالوج<select disabled={pending} value={catalogId} onChange={event => { const id = event.target.value; setCatalogId(id); setProducts([]); onChange(undefined); if (id) load(id); }}><option value="">اختر الكتالوج</option>{catalogs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label> : null}
    {products.length ? <><label>ابحث في المنتجات<input value={query} onChange={event => setQuery(event.target.value)} placeholder="اسم المنتج أو معرفه" maxLength={100}/></label><div className="wa-carousel-options">{products.filter(p => `${p.name} ${p.retailerId}`.toLowerCase().includes(query.toLowerCase())).map(product => <label className="wa-check" key={product.retailerId}><input type="checkbox" checked={ids.includes(product.retailerId)} disabled={pending || (ids.length >= 10 && !ids.includes(product.retailerId))} onChange={event => onChange({ catalogId, retailerIds: event.target.checked ? [...ids, product.retailerId] : ids.filter(id => id !== product.retailerId) })}/><span>{product.name}<small dir="ltr">{product.retailerId}</small></span></label>)}</div></> : null}
    <p role="status">{notice}</p><p className="wa-note">{ids.length} / 10 منتجات محددة · ترتيب الاختيار هو ترتيب البطاقات.</p>
    {ids.length ? <ol className="wa-carousel-preview" aria-label="ترتيب بطاقات الكاروسيل">{ids.map((id, index) => <li key={id}><span className="wa-badge">{index+1}</span><strong>{products.find(p => p.retailerId === id)?.name ?? id}</strong><small>الصورة والسعر من كتالوج Meta</small><button type="button" className="wa-text-link" onClick={() => onChange({ catalogId, retailerIds: ids.filter(item => item !== id) })}>إزالة</button></li>)}</ol> : null}
  </section>;
}
