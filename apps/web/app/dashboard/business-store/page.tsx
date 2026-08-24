import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CreditCard,
  ExternalLink,
  Gift,
  IdCard,
  PackageCheck,
  QrCode,
  ShoppingBag,
  Sparkles,
  Sticker,
} from "lucide-react";
import { getCurrentUser } from "../../lib/auth";
import { getActiveBusinessForUser } from "../../lib/active-business";

const catalog = [
  { title: "لوحة اسم مكتبية للمدير", description: "لوحة مكتبية باسم المدير والمسمى الوظيفي وشعار المنشأة، مع QR اختياري لصفحة HEE.", icon: IdCard, badge: "مقترح الإطلاق الأول" },
  { title: "كوب بهوية المنشأة + QR", description: "كوب مخصص يحمل شعار المنشأة وألوانها ورمز QR الذي يقود مباشرة إلى صفحة الأعمال.", icon: Gift, badge: "قابل للتخصيص" },
  { title: "حامل QR للاستقبال والطاولات", description: "ستاند مكتبي يفتح صفحة المنشأة أو وسائل التواصل عبر QR واضح وسهل المسح.", icon: QrCode, badge: "للعملاء والزوار" },
  { title: "بطاقة أعمال NFC + QR", description: "بطاقة أعمال ذكية للمدير أو الموظف تجمع NFC وQR للوصول إلى صفحة HEE ومعلومات التواصل.", icon: CreditCard, badge: "هوية رقمية + مادية" },
  { title: "ملصقات QR للواجهة", description: "ملصقات للأبواب والكاشير والمركبات تربط الزائر مباشرة بصفحة الأعمال أو واتساب.", icon: Sticker, badge: "استخدام مرن" },
  { title: "باقة هوية مكتبية", description: "حزمة تجمع لوحة الاسم والكوب وبطاقة NFC وحامل QR بتصميم موحد لهوية المنشأة.", icon: PackageCheck, badge: "باقة متكاملة" },
];

export default async function BusinessStorePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const business = await getActiveBusinessForUser(user.id);
  if (!business) redirect("/onboarding");

  const publicUrl = `https://hee.sa/${business.slug}`;
  const identityReady = Boolean(business.logoUrl && business.name && business.slug);

  return <div className="space-y-4 pb-4">
    <section className="overflow-hidden rounded-[28px] border border-[#e7e9f4] bg-white">
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-[#6f3bd2]"><ShoppingBag className="h-5 w-5" /><span className="text-xs font-black">متجر HEE لأصحاب الأعمال</span></div>
          <h1 className="mt-3 text-2xl font-black leading-tight text-[#20264f] sm:text-3xl">حوّل هويتك الرقمية إلى منتجات أعمال حقيقية</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">منتجات مكتبية وتسويقية مخصصة بهوية منشأتك، مع ربطها بصفحتك على HEE عبر QR. مشترياتك هنا منفصلة تمامًا عن الطلبات التي يستقبلها نشاطك من عملائه.</p>
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
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">منتجات البداية</h2></div><p className="mt-1 text-xs leading-6 text-slate-500">نؤسس الآن دورة الطلب والتخصيص والدفع والشحن قبل فتح الشراء الفعلي.</p></div><span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">الشراء مغلق أثناء التأسيس</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{catalog.map((product) => { const Icon = product.icon; return <article key={product.title} className="flex min-h-[220px] flex-col rounded-[22px] border border-[#e9eaf4] bg-[#fcfcff] p-4"><div className="flex items-start justify-between gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6745cf]"><Icon className="h-5 w-5" /></div><span className="rounded-full border border-[#e5e0f7] bg-white px-2.5 py-1 text-[10px] font-black text-[#6a58bb]">{product.badge}</span></div><h3 className="mt-4 text-base font-black text-[#20264f]">{product.title}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{product.description}</p><div className="mt-auto pt-4"><button type="button" disabled className="min-h-10 w-full cursor-not-allowed rounded-xl bg-slate-100 px-3 text-xs font-black text-slate-400">سيتاح بعد اكتمال مسار الطلب</button></div></article>; })}</div>
    </section>

    <section className="grid gap-4 lg:grid-cols-2">
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><h2 className="font-black text-[#20264f]">دورة الطلب المخطط لها</h2><div className="mt-4 space-y-2 text-xs leading-6 text-slate-600"><p>1. اختيار المنتج والمقاس والخامة والكمية.</p><p>2. سحب اسم المنشأة والشعار والرابط والألوان من الهوية الرقمية.</p><p>3. معاينة التصميم ثم اعتماد نسخة ثابتة للطباعة.</p><p>4. العنوان والشحن والدفع ثم التجهيز والتسليم.</p></div></article>
      <article className="rounded-[24px] border border-[#e7e9f4] bg-white p-4 sm:p-5"><div className="flex items-center gap-2"><QrCode className="h-5 w-5 text-[#6f3bd2]" /><h2 className="font-black text-[#20264f]">فصل مالي وتشغيلي</h2></div><p className="mt-3 text-xs leading-6 text-slate-500">متجر HEE سيستخدم نماذج طلب ودفع مستقلة عن طلبات زبائن المنشأة وعن اشتراك HEE المتكرر. كما سيُنشأ QR داخل HEE بدل إرسال روابط العملاء إلى مولد خارجي.</p></article>
    </section>
  </div>;
}
