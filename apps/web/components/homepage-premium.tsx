"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, BarChart3, BriefcaseBusiness, Building2, Eye, Link2, MapPin, MessageCircle, Palette, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { icon: BadgeCheck, title: "هوية موثوقة", text: "اسم منشأتك وشعارها ومعلوماتها الأساسية في صفحة أعمال احترافية وواضحة." },
  { icon: BriefcaseBusiness, title: "خدماتك بوضوح", text: "عرّف بخدمات ومنتجات منشأتك في تجربة مرتبة تعكس هويتك." },
  { icon: Building2, title: "الفروع والفريق", text: "اعرض فروعك وفريقك وجهات التواصل بطريقة منظمة وسهلة." },
  { icon: MessageCircle, title: "تواصل مباشر", text: "اجمع الهاتف وواتساب والموقع والبريد في نقطة وصول واحدة لعملائك." },
  { icon: Palette, title: "هوية متناسقة", text: "صفحة أعمال مصممة للجوال أولًا وتتكيف مع ألوان وهوية منشأتك." },
  { icon: BarChart3, title: "أداء قابل للقياس", text: "تابع المشاهدات وتفاعل الزوار مع قنوات التواصل من لوحة واحدة." },
];

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return <Image src="/brand/ir-logo.svg" alt="iR" width={compact ? 42 : 54} height={compact ? 44 : 56} priority className={compact ? "h-9 w-auto object-contain" : "h-11 w-auto object-contain sm:h-12"} />;
}

export function HomepagePremium() {
  return (
    <main dir="rtl" className="min-h-screen bg-[radial-gradient(circle_at_15%_0%,rgba(124,84,225,.13),transparent_34%),linear-gradient(180deg,#fbfaff_0%,#ffffff_42%,#f8f6ff_100%)] text-[#1f2552]">
      <header className="sticky top-0 z-50 border-b border-[#ece8f3]/80 bg-white/92 backdrop-blur-xl">
        <div dir="ltr" className="mx-auto flex min-h-[74px] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="inline-flex shrink-0 items-center" aria-label="iR - هوية أعمال رقمية"><BrandLogo /></Link>
          <nav dir="rtl" className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
            <a href="#features" className="rounded-xl px-3 py-2 text-sm font-bold text-[#625c70] hover:bg-[#f7f4fc] hover:text-[#7146d9]">المزايا</a>
            <a href="#how" className="rounded-xl px-3 py-2 text-sm font-bold text-[#625c70] hover:bg-[#f7f4fc] hover:text-[#7146d9]">كيف تعمل</a>
            <a href="#pricing" className="rounded-xl px-3 py-2 text-sm font-bold text-[#625c70] hover:bg-[#f7f4fc] hover:text-[#7146d9]">الباقات</a>
          </nav>
          <div dir="rtl" className="flex items-center gap-2">
            <Link href="/login" className="inline-flex h-10 items-center rounded-xl px-3 text-xs font-black text-[#514b63] hover:bg-[#f7f4fc] sm:px-4 sm:text-sm">دخول</Link>
            <Link href="/register" className="inline-flex h-10 items-center rounded-xl bg-[#7146d9] px-3 text-xs font-black text-white shadow-[0_10px_24px_-14px_rgba(113,70,217,.9)] transition hover:-translate-y-0.5 sm:px-4 sm:text-sm">أنشئ هويتك</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-18 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:gap-16 lg:pb-24">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ddd4fa] bg-[#f7f3ff] px-3 py-1.5 text-[11px] font-black text-[#6040c7]"><Sparkles className="h-3.5 w-3.5" />منصة هوية الأعمال الرقمية</span>
          <h1 className="mt-5 max-w-3xl text-[2.35rem] font-black leading-[1.2] tracking-tight text-[#181d45] sm:text-5xl lg:text-[3.7rem]">هويتك الرقمية، في صفحة أعمال تليق بمنشأتك.</h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-8 text-[#696477] sm:text-lg sm:leading-9">iR تجمع هوية منشأتك وخدماتها وفروعها وفريقها ووسائل التواصل في رابط واحد احترافي على ir.sa؛ جاهز للمشاركة مع عملائك في كل مكان.</p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#7146d9] px-6 text-sm font-black text-white shadow-[0_18px_36px_-20px_rgba(113,70,217,.72)]">ابدأ هويتك مجانًا<ArrowLeft className="h-4 w-4" /></Link>
            <Link href="/demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#ded9eb] bg-white px-6 text-sm font-black text-[#51406f]"><Eye className="h-4 w-4" />شاهد نموذجًا حيًا</Link>
          </div>
          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#777183]">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#7146d9]" />مصممة للأعمال</span>
            <span className="inline-flex items-center gap-1.5"><Link2 className="h-4 w-4 text-[#7146d9]" />رابط واحد لهويتك</span>
            <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#7146d9]" />موجهة للسوق السعودي</span>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[430px] rounded-[34px] border border-[#e5dff0] bg-white p-3 shadow-[0_38px_90px_-50px_rgba(58,35,75,.48)]">
          <div className="rounded-[28px] bg-[linear-gradient(180deg,#faf8ff,#fff)] p-4">
            <div dir="ltr" className="flex items-center justify-between"><BrandLogo compact /><span className="grid h-9 w-9 place-items-center rounded-full border border-[#e7e1ef] bg-white text-[#7146d9]">↗</span></div>
            <div className="mt-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#e7e1ef] bg-white text-2xl font-black text-[#7146d9]">ر</div><div className="mt-3 flex items-center justify-center gap-1.5"><b className="text-xl text-[#181d45]">شركة الرواد</b><BadgeCheck className="h-5 w-5 fill-blue-500 text-white" /></div><p className="mt-1 text-xs font-bold text-[#777183]">مقاولات عامة</p><p className="mx-auto mt-3 max-w-[290px] text-xs leading-6 text-[#777183]">حلول احترافية في المقاولات وإدارة المشاريع بمعايير عالية.</p></div>
            <div className="mt-4 grid grid-cols-4 gap-2">{["اتصال", "واتساب", "الموقع", "مشاركة"].map((item) => <div key={item} className="grid min-h-14 place-items-center rounded-2xl border border-[#eee9f4] bg-white text-[10px] font-black text-[#5b5267]">{item}</div>)}</div>
            <div className="mt-3 space-y-2">{["عن المنشأة", "خدماتنا", "فروعنا", "فريق العمل"].map((item) => <div key={item} className="flex h-12 items-center justify-between rounded-2xl border border-[#eee9f4] bg-white px-4 text-xs font-black text-[#3b3650]"><span>{item}</span><span className="text-[#7146d9]">⌄</span></div>)}</div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"><div className="max-w-2xl"><span className="text-xs font-black text-[#7146d9]">أكثر من صفحة روابط</span><h2 className="mt-2 text-3xl font-black leading-tight text-[#181d45]">هوية منشأتك أولًا.</h2><p className="mt-3 text-sm leading-7 text-[#716b7c]">iR تنظّم أهم ما يحتاجه عميلك لفهم منشأتك والثقة بها والتواصل معها بدون تشتيت.</p></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-[24px] border border-[#ebe7f1] bg-white p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4f0ff] text-[#7146d9]"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-black text-[#24294f]">{title}</h3><p className="mt-2 text-sm leading-7 text-[#746e7d]">{text}</p></article>)}</div></section>

      <section id="how" className="border-y border-[#ece8f3] bg-white/65"><div className="mx-auto grid max-w-6xl gap-7 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><span className="text-xs font-black text-[#7146d9]">من التسجيل إلى المشاركة</span><h2 className="mt-2 text-3xl font-black text-[#181d45]">هويتك الرقمية جاهزة في خطوات واضحة.</h2><p className="mt-3 text-sm leading-7 text-[#716b7c]">أدخل معلومات منشأتك، أكمل هويتها، عاين الصفحة ثم انشرها وشاركها.</p></div><div className="grid gap-3 sm:grid-cols-3">{[{ n: "01", t: "أنشئ الحساب", x: "ابدأ باسم منشأتك ونشاطها." }, { n: "02", t: "أكمل هويتك", x: "أضف الشعار والخدمات والفروع والفريق." }, { n: "03", t: "عاين وانشر", x: "شاهد الصفحة ثم شاركها مع عملائك." }].map((step) => <article key={step.n} className="rounded-[22px] border border-[#ebe7f1] bg-white p-4"><span className="text-xs font-black text-[#9d8bd9]">{step.n}</span><h3 className="mt-3 text-sm font-black text-[#24294f]">{step.t}</h3><p className="mt-2 text-xs leading-6 text-[#777183]">{step.x}</p></article>)}</div></div></section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 text-center sm:px-6 sm:py-16"><span className="text-xs font-black text-[#7146d9]">ابدأ الآن</span><h2 className="mt-2 text-3xl font-black text-[#181d45]">ابنِ حضور منشأتك الرقمي من مكان واحد.</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#716b7c]">ابدأ بالخطة المجانية، ثم طوّر حسابك عندما تحتاج منشأتك مزايا وحدودًا أكبر.</p><Link href="/register" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#7146d9] px-7 text-sm font-black text-white">أنشئ هويتك الرقمية<ArrowLeft className="h-4 w-4" /></Link></section>

      <footer className="border-t border-[#ece8f3] bg-white"><div dir="ltr" className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-7 sm:flex-row sm:px-6"><Link href="/" aria-label="iR"><BrandLogo compact /></Link><p dir="rtl" className="text-xs font-bold text-[#85808c]">iR — هوية أعمال رقمية لمنشأتك.</p></div></footer>
    </main>
  );
}
