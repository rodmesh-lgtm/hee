"use client";

import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  Eye,
  Link2,
  MapPin,
  MessageCircle,
  Palette,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { IrLogo } from "./brand/ir-logo";

const features = [
  { icon: BadgeCheck, title: "هوية موثوقة", text: "اسم منشأتك وشعارها ومعلوماتها الأساسية في صفحة أعمال احترافية وواضحة." },
  { icon: BriefcaseBusiness, title: "الخدمات بوضوح", text: "عرّف بخدمات منشأتك بدون تحويل الصفحة إلى متجر أو واجهة طلبات مزدحمة." },
  { icon: Building2, title: "الفروع والفريق", text: "اعرض فروعك وممثلي المبيعات وخدمة العملاء والعمليات بطريقة منظمة." },
  { icon: MessageCircle, title: "تواصل مباشر", text: "الهاتف وواتساب والموقع والبريد تظهر فقط عندما تضيفها وبأسلوب غير مزعج." },
  { icon: Palette, title: "مظهر احترافي", text: "قالب iR موحد ومصمم للجوال أولًا، مع تخصيص ألوان الهوية من لوحة المنشأة." },
  { icon: BarChart3, title: "أداء قابل للقياس", text: "تابع المشاهدات وتفاعل الزوار مع الاتصال وواتساب والموقع من لوحة واحدة." },
];

const plans = [
  {
    name: "Free",
    price: "مجانًا",
    badge: "للبداية",
    text: "أنشئ هويتك الرقمية وابدأ بمشاركة صفحة أعمال احترافية.",
    items: ["صفحة أعمال iR", "حتى 3 منتجات", "فرع واحد وفريق محدود", "معاينة قبل النشر"],
  },
  {
    name: "Business",
    price: "199 ر.س / شهر",
    badge: "للمنشآت النامية",
    text: "حدود أعلى ومزايا إضافية للمنشآت التي تعتمد على صفحتها يوميًا.",
    items: ["حتى 10 منتجات و5 فروع", "حتى 8 أقسام و8 جهات اتصال", "تحليلات متقدمة", "أهلية طلب التوثيق ومصمم العروض"],
  },
  {
    name: "Pro",
    price: "399 ر.س / شهر",
    badge: "للأعمال الأكبر",
    text: "مرونة أكبر للمنشآت ذات الفروع والفرق المتعددة.",
    items: ["حتى 30 منتجًا", "حدود موسعة للفروع والفريق", "تحليلات متقدمة", "أهلية طلب التوثيق ومصمم العروض"],
  },
];

function BrandMark({ compact = false, header = false }: { compact?: boolean; header?: boolean }) {
  return <IrLogo className={compact ? "h-8" : header ? "h-[58px] sm:h-[62px]" : "h-12"} priority={header} />;
}

export function HomepagePremium() {
  return (
    <main id="home" dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,rgba(124,84,225,.12),transparent_34%),linear-gradient(180deg,#fbfaff_0%,#ffffff_40%,#f8f6ff_100%)] text-[#1f2552]">
      <header className="sticky top-0 z-50 border-b border-[#e9e4f2]/90 bg-white/92 shadow-[0_10px_30px_-28px_rgba(44,29,82,.5)] backdrop-blur-xl">
        <div dir="ltr" className="mx-auto grid min-h-[82px] max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:min-h-[86px] sm:px-6">
          <Link href="/" className="inline-flex items-center rounded-2xl p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7146d9] focus-visible:ring-offset-2" aria-label="iR - منصة هوية أعمال رقمية">
            <BrandMark header />
          </Link>

          <nav dir="rtl" aria-label="التنقل الرئيسي" className="hidden items-center justify-center gap-1 lg:flex">
            <Link href="/#home" className="rounded-xl px-3.5 py-2 text-sm font-black text-[#30294a] transition hover:bg-[#f7f4ff] hover:text-[#7146d9]">الرئيسية</Link>
            <Link href="/#features" className="rounded-xl px-3.5 py-2 text-sm font-bold text-[#696477] transition hover:bg-[#f7f4ff] hover:text-[#7146d9]">المزايا</Link>
            <Link href="/#how-it-works" className="rounded-xl px-3.5 py-2 text-sm font-bold text-[#696477] transition hover:bg-[#f7f4ff] hover:text-[#7146d9]">كيف تعمل</Link>
            <Link href="/#pricing" className="rounded-xl px-3.5 py-2 text-sm font-bold text-[#696477] transition hover:bg-[#f7f4ff] hover:text-[#7146d9]">الباقات</Link>
          </nav>

          <div dir="rtl" className="flex items-center justify-end gap-1.5 sm:gap-2">
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl px-2.5 text-xs font-black text-[#514b63] transition hover:bg-[#f7f4ff] sm:px-4 sm:text-sm">تسجيل الدخول</Link>
            <Link href="/register" className="inline-flex h-10 items-center rounded-xl bg-[#7146d9] px-3 text-xs font-black text-white shadow-[0_10px_28px_-16px_rgba(113,70,217,.9)] transition hover:bg-[#6237ca] sm:px-4 sm:text-sm">أنشئ هويتك</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-11 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-14 lg:pb-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ddd4fa] bg-[#f7f3ff] px-3 py-1.5 text-[11px] font-black text-[#6040c7]"><Sparkles className="h-3.5 w-3.5" />منصة هوية أعمال رقمية على ir.sa</span>
          <h1 className="mt-5 max-w-3xl text-[2.2rem] font-black leading-[1.22] tracking-tight text-[#181d45] sm:text-5xl lg:text-[3.55rem]">هوية أعمال رقمية تعكس احتراف منشأتك وتسهّل الوصول إليها.</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-8 text-[#696477] sm:text-lg sm:leading-9">اجمع اسم منشأتك وشعارها وخدماتها وفروعها وفريقها ووسائل التواصل في صفحة أعمال واحدة احترافية، واضحة وسهلة المشاركة مع عملائك.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#7146d9] px-6 text-sm font-black text-white shadow-[0_18px_36px_-20px_rgba(113,70,217,.72)]">أنشئ هويتك مجانًا<ArrowLeft className="h-4 w-4" /></Link>
            <Link href="/demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#ded9eb] bg-white px-6 text-sm font-black text-[#51406f]"><Eye className="h-4 w-4" />شاهد صفحة نموذجية</Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#777183]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#7146d9]" />مصممة للأعمال</span>
            <span className="inline-flex items-center gap-1.5"><Link2 className="h-4 w-4 text-[#7146d9]" />رابط واحد سهل المشاركة</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#7146d9]" />موجهة للسوق السعودي</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[430px] rounded-[34px] border border-[#e5dff0] bg-white p-3 shadow-[0_38px_90px_-50px_rgba(58,35,75,.48)]">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#faf8ff,#fff)] p-4">
            <div className="flex items-center justify-between"><BrandMark compact /><span className="grid h-9 w-9 place-items-center rounded-full border border-[#e7e1ef] bg-white text-[#7146d9]">↗</span></div>
            <div className="mt-6 text-center">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#e7e1ef] bg-white text-2xl font-black text-[#7146d9]">ر</div>
              <div className="mt-3 flex items-center justify-center gap-1.5"><b className="text-xl text-[#181d45]">شركة الرواد</b><BadgeCheck className="h-5 w-5 fill-blue-500 text-white" /></div>
              <p className="mt-1 text-xs font-bold text-[#777183]">مقاولات عامة</p>
              <p className="mx-auto mt-3 max-w-[290px] text-xs leading-6 text-[#777183]">حلول احترافية في المقاولات وإدارة المشاريع بمعايير عالية.</p>
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">{["اتصال", "واتساب", "الموقع", "مشاركة"].map((item) => <div key={item} className="grid min-h-14 place-items-center rounded-2xl border border-[#eee9f4] bg-white text-[10px] font-black text-[#5b5267]">{item}</div>)}</div>
            <div className="mt-3 space-y-2">{["عن المنشأة", "خدماتنا", "فروعنا", "فريق العمل"].map((item) => <div key={item} className="flex h-12 items-center justify-between rounded-2xl border border-[#eee9f4] bg-white px-4 text-xs font-black text-[#3b3650]"><span>{item}</span><span className="text-[#7146d9]">⌄</span></div>)}</div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
        <div className="max-w-2xl"><span className="text-xs font-black text-[#7146d9]">أكثر من صفحة روابط</span><h2 className="mt-2 text-3xl font-black leading-tight text-[#181d45]">هوية منشأتك أولًا.</h2><p className="mt-3 text-sm leading-7 text-[#716b7c]">iR تنظّم أهم ما يحتاجه عميلك لفهم منشأتك والثقة بها والتواصل معها بدون تشتيت.</p></div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-[24px] border border-[#ebe7f1] bg-white p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4f0ff] text-[#7146d9]"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-black text-[#24294f]">{title}</h3><p className="mt-2 text-sm leading-7 text-[#746e7d]">{text}</p></article>)}</div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 border-y border-[#ece8f3] bg-white/65">
        <div className="mx-auto grid max-w-6xl gap-7 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div><span className="text-xs font-black text-[#7146d9]">من التسجيل إلى المشاركة</span><h2 className="mt-2 text-3xl font-black text-[#181d45]">دقائق، لا مشروع موقع كامل.</h2><p className="mt-3 text-sm leading-7 text-[#716b7c]">أدخل المعلومات الأساسية، عاين الصفحة، ثم أضف التفاصيل التي تحتاجها منشأتك فقط.</p></div>
          <div className="grid gap-3 sm:grid-cols-3">{[{ n: "01", t: "أنشئ الحساب", x: "ابدأ باسم منشأتك ونشاطها." }, { n: "02", t: "أكمل هويتك", x: "أضف الشعار والخدمات والفروع والفريق." }, { n: "03", t: "عاين وانشر", x: "شاهد الصفحة قبل مشاركتها مع عملائك." }].map((step) => <article key={step.n} className="rounded-[22px] border border-[#ebe7f1] bg-white p-4"><span className="text-xs font-black text-[#9d8bd9]">{step.n}</span><h3 className="mt-3 text-sm font-black text-[#24294f]">{step.t}</h3><p className="mt-2 text-xs leading-6 text-[#777183]">{step.x}</p></article>)}</div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center"><span className="text-xs font-black text-[#7146d9]">باقات تنمو مع عملك</span><h2 className="mt-2 text-3xl font-black text-[#181d45]">ابدأ مجانًا ثم طوّر هويتك عند الحاجة.</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#716b7c]">ابدأ بالباقة المجانية، ويمكنك الترقية من حسابك عندما تحتاج حدودًا ومزايا إضافية. يظهر المبلغ النهائي بوضوح قبل إدخال بيانات الدفع.</p></div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">{plans.map((plan, index) => <article key={plan.name} className={`rounded-[26px] border bg-white p-5 ${index === 1 ? "border-[#bdaff1] shadow-[0_24px_60px_-46px_rgba(111,59,210,.7)]" : "border-[#ebe7f1]"}`}><div className="flex items-center justify-between"><h3 className="text-xl font-black text-[#24294f]">{plan.name}</h3><span className="rounded-full bg-[#f4f0ff] px-2.5 py-1 text-[10px] font-black text-[#6243c9]">{plan.badge}</span></div><p className="mt-2 text-lg font-black text-[#181d45]">{plan.price}</p><p className="mt-3 min-h-12 text-sm leading-7 text-[#716b7c]">{plan.text}</p><div className="mt-4 space-y-2">{plan.items.map((item) => <div key={item} className="flex items-center gap-2 text-xs font-bold text-[#655f70]"><Check className="h-4 w-4 text-emerald-500" />{item}</div>)}</div><Link href="/register" className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-black ${index === 1 ? "bg-[#7146d9] text-white" : "border border-[#ddd8e7] text-[#554d63]"}`}>ابدأ الآن</Link></article>)}</div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6">
        <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#221b42,#513497_60%,#7146d9)] px-5 py-10 text-center text-white sm:px-8 sm:py-12">
          <div className="mx-auto mb-5 w-fit rounded-2xl bg-white/90 px-5 py-3"><BrandMark /></div>
          <h2 className="text-2xl font-black sm:text-3xl">اجعل منشأتك جاهزة للمشاركة على ir.sa.</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/75">ابدأ بالحد الأدنى، ثم أكمل التفاصيل تدريجيًا من لوحة iR.</p>
          <Link href="/register" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-white px-6 text-sm font-black text-[#3c2b76]">إنشاء حساب iR</Link>
        </div>
      </section>
    </main>
  );
}
