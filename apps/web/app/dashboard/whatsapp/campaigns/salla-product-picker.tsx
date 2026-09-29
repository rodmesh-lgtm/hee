"use client";
import { useState } from "react";
import Link from "next/link";
import { PackageSearch } from "lucide-react";
import type { SallaCampaignProduct } from "../../../lib/commerce/salla-product-domain";

const control = "min-h-11 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900";
const button = "min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-800 disabled:opacity-50";
const errors: Record<string, string> = {
  RECONNECT_REQUIRED: "انتهى تفويض المتجر أو يحتاج تحديثًا. أعد ربط سلة من المواعيد والحجوزات.",
  PRODUCT_PERMISSION_REQUIRED: "الربط الحالي لا يسمح بقراءة المنتجات. يلزم تفعيل صلاحية قراءة المنتجات في تطبيق سلة ثم إعادة تفويض المتجر.",
  STORE_UNAVAILABLE: "هذا المتجر غير متاح لحسابك أو تم فصله.",
  RATE_LIMITED: "وصلت إلى حد الطلبات المؤقت. انتظر قليلًا ثم أعد المحاولة.",
  SUBSCRIPTION_REQUIRED: "يلزم اشتراك نشط في تسويق واتساب.",
};
export function SallaProductPicker({ fields, onUse }: { fields: Array<{ key: string; label: string }>; onUse: (key: string, value: string) => void }) {
  const [opened, setOpened] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [stores, setStores] = useState<Array<{ id: string; name: string }>>([]);
  const [store, setStore] = useState(""), [keyword, setKeyword] = useState(""), [loadedKeyword, setLoadedKeyword] = useState("");
  const [products, setProducts] = useState<SallaCampaignProduct[]>([]), [selected, setSelected] = useState<SallaCampaignProduct | null>(null);
  const [page, setPage] = useState(1), [hasMore, setHasMore] = useState(false), [loaded, setLoaded] = useState(false);
  const [field, setField] = useState(fields[0]?.key ?? ""), [applied, setApplied] = useState("");
  async function request(query: string) {
    const response = await fetch(`/api/commerce/salla/products${query}`, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
    const data = await response.json();
    if (!response.ok) throw new Error(errors[data.error] || "تعذر تحميل المنتجات الآن. حاول مرة أخرى.");
    return data;
  }
  async function open() {
    setOpened(true); setBusy(true); setError(""); setProducts([]); setSelected(null); setLoaded(false); setApplied("");
    try { const data = await request(""); setStores(data.stores); setStore(data.stores[0]?.id ?? ""); }
    catch (error) { setError(error instanceof Error ? error.message : "تعذر الاتصال"); }
    finally { setBusy(false); }
  }
  async function search(nextPage: number, query = keyword) {
    setBusy(true); setError(""); setSelected(null); setApplied("");
    try { const data = await request(`?${new URLSearchParams({ store, q: query, page: String(nextPage) })}`); setProducts(data.products); setPage(data.page); setHasMore(data.hasMore); setLoaded(true); setLoadedKeyword(query); }
    catch (error) { setProducts([]); setLoaded(false); setError(error instanceof Error ? error.message : "تعذر الاتصال"); }
    finally { setBusy(false); }
  }
  function use(value: string) { if (fields.some(item => item.key === field) && value) { onUse(field, value); setApplied("أُدرجت القيمة في المتغير المختار. راجع المعاينة قبل الإرسال."); } }
  return <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4" aria-label="منتجات سلة للحملة">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><b className="flex items-center gap-2 text-sm text-slate-900"><PackageSearch className="h-5 w-5 text-teal-700"/>منتج من متجرك إلى رسالتك</b><p className="mt-1 text-xs leading-6 text-slate-600">اختر منتجًا وأدرج بياناته في متغيرات القالب المعتمد.</p></div><button type="button" className={button} disabled={busy} onClick={open}>{opened ? "تحديث المتاجر" : "استعراض منتجات سلة"}</button></div>
    {error ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}</p> : null}
    {busy ? <p role="status" className="mt-3 text-sm text-slate-600">جارٍ التحميل…</p> : null}
    {opened && !busy && !error && !stores.length ? <p className="mt-3 text-sm text-slate-600">لا يوجد متجر سلة متصل. <Link href="/dashboard/working-hours" className="font-bold underline">ربط متجر سلة</Link></p> : null}
    {opened && stores.length ? <div className="mt-4 space-y-3">
      <label className="block text-xs text-slate-700">المتجر<select aria-label="متجر منتجات الحملة" disabled={busy} value={store} onChange={e => { setStore(e.target.value); setProducts([]); setSelected(null); setLoaded(false); setApplied(""); }} className={`mt-1 ${control}`}>{stores.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <div className="flex flex-wrap items-end gap-2"><label className="min-w-0 flex-1 text-xs text-slate-700">البحث عن منتج<input aria-label="البحث عن منتج سلة" maxLength={80} value={keyword} disabled={busy} onChange={e => setKeyword(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!busy) void search(1); } }} className={`mt-1 ${control}`}/></label><button type="button" disabled={busy || !store} className={button} onClick={() => search(1)}>عرض المنتجات</button></div>
      {loaded ? <><label className="block text-xs text-slate-700">المنتج<select aria-label="منتج سلة للحملة" disabled={busy} value={selected?.id ?? ""} onChange={e => { setSelected(products.find(item => item.id === e.target.value) ?? null); setApplied(""); }} className={`mt-1 ${control}`}><option value="">{products.length ? "اختر منتجًا متاحًا" : "لا توجد منتجات متاحة في هذه الصفحة"}</option>{products.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="flex items-center gap-3"><button type="button" className={button} disabled={busy || page <= 1} onClick={() => search(page - 1, loadedKeyword)}>السابق</button><span className="text-xs text-slate-600">صفحة {page}</span><button type="button" className={button} disabled={busy || !hasMore} onClick={() => search(page + 1, loadedKeyword)}>التالي</button></div></> : null}
      {selected ? <div className="space-y-3 rounded-xl bg-white p-3 text-slate-800"><b className="block break-words text-sm">{selected.name}</b><span className="block text-sm" dir="ltr">{selected.price || "السعر غير متاح"}</span><span dir="ltr" className="block break-all text-xs">{selected.url}</span>
        {fields.length ? <><label className="block text-xs">المتغير الذي تريد تعبئته<select aria-label="متغير القالب لبيانات المنتج" value={field} onChange={e => setField(e.target.value)} className={`mt-1 ${control}`}>{fields.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><div className="flex flex-wrap gap-2"><button type="button" className={button} onClick={() => use(selected.name)}>إدراج اسم المنتج</button><button type="button" className={button} disabled={!selected.price} onClick={() => use(selected.price)}>إدراج السعر</button><button type="button" className={button} onClick={() => use(selected.url)}>إدراج رابط المنتج</button></div></> : <p className="text-xs">القالب الحالي لا يحتوي متغيرات نصية. اختر قالبًا معتمدًا يتضمن متغيرات لإدراج بيانات المنتج.</p>}
        <p className="text-xs leading-6 text-slate-500">تُنسخ القيم كما تظهر الآن؛ راجع السعر والرابط قبل الإرسال. هذا تخصيص لقالبك، وليس كتالوج Meta. لا يُرسل اختيار المنتج أي رسالة.</p>
      </div> : null}
      {applied ? <p role="status" className="text-xs text-teal-700">{applied}</p> : null}
    </div> : null}
  </div>;
}
