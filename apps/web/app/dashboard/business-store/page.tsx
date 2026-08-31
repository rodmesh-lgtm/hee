import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, ExternalLink, PackageCheck, QrCode, ShoppingBag, Sparkles } from "lucide-react";
import { BusinessStoreDraftBuilder } from "../../../components/business-store/business-store-draft-builder";
import { getActiveBusinessForUser } from "../../lib/active-business";
import { getCurrentUser } from "../../lib/auth";
import { listBusinessStoreCatalogItems } from "../../lib/business-store-catalog";

export default async function BusinessStorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const [catalog] = await Promise.all([listBusinessStoreCatalogItems()]);
  const publicUrl = `https://ir.sa/${business.slug}`;
  const identityReady = Boolean(business.logoUrl && business.name && business.slug);

  return <div className="space-y-4 pb-4">
    <section className="overflow-hidden rounded-[28px] border border-[#e7e9f4] bg-white">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-[#6f3bd2]"><ShoppingBag className="h-5 w-5" /><span className="text-xs font-black">متجر iR لأصحاب الأعمال</span></div>
          <h1 className="mt-3 text-2xl font-black leading-tight text-[#20264f] sm:text-3xl">حوّل هويتك الرقمية إلى منتجات أعمال حقيقية</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">منتجات مكتبية وتسويقية مخصصة بهوية منشأتك، مع ربطها بصفحتك على iR عبر QR. مشترياتك هنا منفصلة تمامًا عن الطلبات التي يستقبلها نشاطك من عملائه.</p>
          <div className="mt-4 flex flex-wrap gap-2"><span className="rounded-full bg-[#f1edff] px-3 py-1.5 text-xs font-black text-[#5d49cc]">تخصيص بهوية المنشأة</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">QR لصفحة الأعمال</span><span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">منتجات مادية للأعمال</span></div>
        </div>
        <div className="rounded-[24px] border border-[#e8e4f7] bg-[#faf9ff] p-4">
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#6f3bd2]" /><h2 className="text-sm font-black text-[#20264f]">هوية الطلب الحالية</h2></div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white p-3"><div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-[#ece9f8] bg-[#f6f3ff]"><BadgeCheck className="h-6 w-6 text-[#6f3bd2]" /></div><div className="min-w-0"><div className="truncate text-sm font-black text-[#20264f]">{business.name}</div><code dir="ltr" className="mt-1 block truncate text-[10px] text-slate-400">{publicUrl}</code></div></div>
          <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-bold ${identityReady ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{identityReady ? "✓ الهوية جاهزة لتخصيص منتجات المتجر." : "أضف شعار المنشأة قبل اعتماد أي تصميم للطباعة."}</div>
          <Link href="/dashboard/digital-identity" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#ddd8f4] bg-white px-3 text-xs font-black text-[#5d49cc]">مراجعة الهوية الرقمية <ExternalLink className="h-3.5 w-3.5" /></Link>
        </div>
      </div>
    </section>

    <section className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">منتجات متجر الأعمال</h2></div><p className="mt-1 text-xs leading-6 text-slate-500">يعرض هذا القسم المنتجات النشطة التي تديرها iR مركزيًا. السعر والحد الأقصى للكمية يعاد التحقق منهما من الخادم عند كل حفظ.</p></div><span className="rounded-full bg-[#f1edff] px-3 py-1.5 text-xs font-black text-[#6543ce]">{catalog.length} منتج متاح</span></div>
      <div className="mt-5">{catalog.length ? <BusinessStoreDraftBuilder catalog={catalog} /> : <div className="rounded-2xl border border-dashed border-[#dcd7ec] bg-[#faf9fd] p-8 text-center"><b className="block text-sm text-[#303653]">لا توجد منتجات متاحة حاليًا</b><p className="mt-2 text-xs leading-6 text-slate-500">لا تحتاج إلى إجراء شيء الآن. ستظهر المنتجات هنا تلقائيًا عند تفعيلها في متجر الأعمال.</p></div>}</div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><h2 className="font-black text-[#20264f]">دورة الطلب</h2><div className="mt-4 space-y-2 text-xs leading-6 text-slate-600"><p>1. <b>مفعّل الآن:</b> اختيار المنتج والكمية وحفظها في مسودة مرتبطة بمنشأتك.</p><p>2. سحب اسم المنشأة والشعار والرابط والألوان من الهوية الرقمية.</p><p>3. معاينة التصميم ثم اعتماد نسخة ثابتة للطباعة.</p><p>4. العنوان والشحن والدفع ثم التجهيز والتسليم.</p></div></article>
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><QrCode className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">فصل مالي وتشغيلي</h2></div><p className="mt-3 text-xs leading-6 text-slate-500">مسودة متجر iR مستقلة عن طلبات زبائن المنشأة وعن اشتراك iR المتكرر. حفظ المنتجات هنا لا ينشئ دفعة ولا يغيّر الباقة. سيُفتح الدفع فقط بعد إضافة مسار متجر مستقل وآمن.</p></article>
    </section>
  </div>;
}
