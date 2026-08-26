import { Prisma } from "@prisma/client";
import { Box, CircleOff, PackagePlus, Pencil, Power, Store } from "lucide-react";
import {
  createBusinessStoreProductAdminAction,
  toggleBusinessStoreProductAdminAction,
  updateBusinessStoreProductAdminAction,
} from "../../actions/admin-business-store";
import { requireAdmin } from "../../lib/admin";
import { listBusinessStoreCatalogProductsForAdmin } from "../../lib/business-store-catalog";
import { db } from "../../lib/db";

function sar(halalas: number) {
  return new Intl.NumberFormat("ar-SA", { style: "currency", currency: "SAR", maximumFractionDigits: 2 }).format(halalas / 100);
}
function sarInput(halalas: number) {
  return (halalas / 100).toFixed(2).replace(/\.00$/, "");
}

const resultMessages: Record<string, string> = {
  created: "تم إنشاء المنتج ونشره فورًا في متجر الأعمال للعملاء.",
  updated: "تم تحديث المنتج. السعر والبيانات الجديدة أصبحت مرجع الخادم للمسودات الجديدة والتعديلات التالية.",
  activated: "تم تفعيل المنتج وإعادته إلى متجر الأعمال.",
  deactivated: "تم إيقاف المنتج عن الطلبات الجديدة مع الحفاظ على سجلات الطلبات السابقة.",
  "duplicate-sku": "رمز SKU مستخدم مسبقًا. اختر رمزًا فريدًا.",
  invalid: "بعض بيانات المنتج غير صالحة. راجع الحقول والحدود المطلوبة.",
  missing: "المنتج المطلوب لم يعد موجودًا.",
  error: "تعذر حفظ المنتج بسبب خطأ غير متوقع.",
  unchanged: "لم يتغير وضع المنتج.",
};

type AuditRow = {
  id: string;
  action: string;
  createdAt: Date;
  productId: string | null;
  snapshot: unknown;
  actorName: string;
  actorEmail: string;
};

export default async function AdminStoreProductsPage({ searchParams }: { searchParams: Promise<{ result?: string }> }) {
  await requireAdmin();
  const params = await searchParams;
  const [products, audit] = await Promise.all([
    listBusinessStoreCatalogProductsForAdmin(),
    db.$queryRaw<AuditRow[]>(Prisma.sql`
      SELECT a."id", a."action", a."createdAt", a."productId", a."snapshot",
             u."name" AS "actorName", u."email" AS "actorEmail"
      FROM "BusinessStoreCatalogAudit" a
      JOIN "User" u ON u."id" = a."actorUserId"
      ORDER BY a."createdAt" DESC
      LIMIT 20
    `),
  ]);
  const active = products.filter((product) => product.isActive).length;
  const categories = new Set(products.map((product) => product.category));
  const result = String(params.result ?? "");

  return <main className="min-h-screen bg-[#f7f8fb] px-4 py-7 text-[#1f2552] sm:px-6" dir="rtl">
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rounded-[26px] border border-[#e7e4f0] bg-white p-5">
        <div className="flex items-center gap-2 text-[#6f3bd2]"><Store className="h-5 w-5" /><span className="text-xs font-black">إدارة HEE المركزية</span></div>
        <h1 className="mt-2 text-2xl font-black">منتجات متجر الأعمال</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">هذا هو الكتالوج المركزي الحقيقي. أي منتج نشط هنا يظهر مباشرة في متجر الأعمال داخل لوحات العملاء، والسعر والكمية القصوى يعاد التحقق منهما من قاعدة البيانات عند حفظ المسودة.</p>
      </header>

      {result && resultMessages[result] ? <div role="status" className={`rounded-2xl border px-4 py-3 text-sm font-bold ${["created","updated","activated","deactivated"].includes(result) ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{resultMessages[result]}</div> : null}

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="كل المنتجات" value={products.length} />
        <Metric label="المنتجات النشطة" value={active} />
        <Metric label="الأقسام" value={categories.size} />
      </section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black">إضافة منتج جديد</h2></div>
        <p className="mt-1 text-xs leading-6 text-slate-500">SKU لا يمكن تعديله بعد الإنشاء لأنه معرف تشغيلي ثابت. إيقاف المنتج أفضل من حذفه حتى تبقى سجلات الطلبات قابلة للتدقيق.</p>
        <form action={createBusinessStoreProductAdminAction} className="mt-4 grid gap-3 lg:grid-cols-4">
          <Field label="SKU ثابت"><input required name="sku" pattern="[a-z0-9][a-z0-9-]{2,63}" placeholder="executive-gift-box" className="field" dir="ltr" /></Field>
          <Field label="اسم المنتج"><input required name="title" minLength={2} maxLength={160} className="field" /></Field>
          <Field label="القسم"><input required name="category" pattern="[a-z0-9][a-z0-9-]{1,47}" defaultValue="general" className="field" dir="ltr" /></Field>
          <Field label="شارة مختصرة"><input name="badge" maxLength={80} className="field" /></Field>
          <Field label="السعر (ر.س)"><input required name="priceSar" inputMode="decimal" pattern="\d{1,8}(\.\d{1,2})?" className="field" dir="ltr" /></Field>
          <Field label="أقصى كمية"><input required name="maxQuantity" type="number" min={1} max={1000} defaultValue={20} className="field" /></Field>
          <Field label="الترتيب"><input required name="sortOrder" type="number" min={0} max={100000} defaultValue={100} className="field" /></Field>
          <Field label="رابط الصورة HTTPS (اختياري)"><input name="imageUrl" type="url" maxLength={2048} className="field" dir="ltr" /></Field>
          <label className="grid gap-1.5 lg:col-span-4"><span className="text-xs font-bold text-slate-600">الوصف</span><textarea required name="description" minLength={5} maxLength={1500} rows={3} className="rounded-xl border border-[#e4e0ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#7b61df]" /></label>
          <div className="lg:col-span-4"><button className="min-h-11 rounded-xl bg-[#6f3bd2] px-5 text-xs font-black text-white">إنشاء ونشر المنتج</button></div>
        </form>
      </section>

      <section className="space-y-3">
        {products.map((product) => <article key={product.id} className={`rounded-[24px] border bg-white p-4 sm:p-5 ${product.isActive ? "border-[#e7e4f0]" : "border-slate-200 opacity-80"}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${product.isActive ? "bg-[#f1edff] text-[#6f3bd2]" : "bg-slate-100 text-slate-400"}`}>{product.isActive ? <Box className="h-5 w-5" /> : <CircleOff className="h-5 w-5" />}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{product.title}</h2><span className={`rounded-full px-2 py-1 text-[10px] font-black ${product.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{product.isActive ? "نشط" : "موقوف"}</span></div><code className="mt-1 block text-[10px] text-slate-400" dir="ltr">{product.sku}</code><p className="mt-2 max-w-3xl text-xs leading-6 text-slate-500">{product.description}</p></div></div>
            <div className="text-left"><b className="block text-lg text-[#5d49cc]">{sar(product.unitPrice)}</b><span className="text-[10px] text-slate-400">حد أقصى {product.maxQuantity} · ترتيب {product.sortOrder}</span></div>
          </div>
          <details className="mt-4 rounded-2xl border border-[#ece9f3] bg-[#fbfbfd] p-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-black text-[#5d49cc]"><Pencil className="h-3.5 w-3.5" />تعديل المنتج</summary>
            <form action={updateBusinessStoreProductAdminAction} className="mt-4 grid gap-3 lg:grid-cols-4">
              <input type="hidden" name="productId" value={product.id} />
              <Field label="اسم المنتج"><input required name="title" defaultValue={product.title} minLength={2} maxLength={160} className="field" /></Field>
              <Field label="القسم"><input required name="category" defaultValue={product.category} pattern="[a-z0-9][a-z0-9-]{1,47}" className="field" dir="ltr" /></Field>
              <Field label="شارة"><input name="badge" defaultValue={product.badge ?? ""} maxLength={80} className="field" /></Field>
              <Field label="السعر (ر.س)"><input required name="priceSar" defaultValue={sarInput(product.unitPrice)} inputMode="decimal" pattern="\d{1,8}(\.\d{1,2})?" className="field" dir="ltr" /></Field>
              <Field label="أقصى كمية"><input required name="maxQuantity" type="number" min={1} max={1000} defaultValue={product.maxQuantity} className="field" /></Field>
              <Field label="الترتيب"><input required name="sortOrder" type="number" min={0} max={100000} defaultValue={product.sortOrder} className="field" /></Field>
              <Field label="رابط الصورة"><input name="imageUrl" type="url" defaultValue={product.imageUrl ?? ""} maxLength={2048} className="field" dir="ltr" /></Field>
              <div className="hidden lg:block" />
              <label className="grid gap-1.5 lg:col-span-4"><span className="text-xs font-bold text-slate-600">الوصف</span><textarea required name="description" defaultValue={product.description} minLength={5} maxLength={1500} rows={3} className="rounded-xl border border-[#e4e0ec] bg-white px-3 py-2 text-sm outline-none focus:border-[#7b61df]" /></label>
              <div className="lg:col-span-4"><button className="min-h-10 rounded-xl bg-[#20264f] px-4 text-xs font-black text-white">حفظ التعديلات</button></div>
            </form>
          </details>
          <form action={toggleBusinessStoreProductAdminAction} className="mt-3"><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="activate" value={product.isActive ? "0" : "1"} /><button className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-xs font-black ${product.isActive ? "border border-rose-200 bg-rose-50 text-rose-700" : "bg-emerald-600 text-white"}`}><Power className="h-3.5 w-3.5" />{product.isActive ? "إيقاف المنتج" : "إعادة تفعيل المنتج"}</button></form>
        </article>)}
        {!products.length ? <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد منتجات بعد. استخدم نموذج الإضافة أعلاه.</div> : null}
      </section>

      <section className="rounded-[24px] border border-[#e7e4f0] bg-white p-4 sm:p-5"><h2 className="font-black">سجل تغييرات الكتالوج</h2><p className="mt-1 text-xs text-slate-500">آخر 20 تغييرًا إداريًا. لا يتم تخزين أسرار أو بيانات دفع هنا.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[720px] text-right text-xs"><thead><tr className="border-b text-slate-400"><th className="py-2">الوقت</th><th>الإجراء</th><th>المنتج</th><th>المشرف</th></tr></thead><tbody>{audit.map((entry) => { const snapshot = entry.snapshot && typeof entry.snapshot === "object" && !Array.isArray(entry.snapshot) ? entry.snapshot as Record<string, unknown> : {}; return <tr key={entry.id} className="border-b border-[#f0edf5] last:border-0"><td className="py-3 text-slate-500">{new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(entry.createdAt)}</td><td className="font-bold">{entry.action}</td><td>{String(snapshot.title ?? snapshot.sku ?? entry.productId ?? "—")}</td><td><span className="block font-bold">{entry.actorName}</span><span className="text-[10px] text-slate-400">{entry.actorEmail}</span></td></tr>; })}{!audit.length ? <tr><td colSpan={4} className="py-8 text-center text-slate-400">لا توجد تغييرات مسجلة بعد.</td></tr> : null}</tbody></table></div></section>
    </div>
    <style>{`.field{height:44px;border:1px solid #e4e0ec;border-radius:12px;background:#fff;padding:0 12px;font-size:14px;outline:none}.field:focus{border-color:#7b61df}`}</style>
  </main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="grid gap-1.5"><span className="text-xs font-bold text-slate-600">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: number }) { return <article className="rounded-[20px] border border-[#e7e4f0] bg-white p-4"><b className="text-2xl">{new Intl.NumberFormat("ar-SA").format(value)}</b><span className="mt-1 block text-xs text-slate-500">{label}</span></article>; }
