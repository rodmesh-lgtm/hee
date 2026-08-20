"use client";

import Link from "next/link";
import { ArrowLeft, BadgeCheck, BarChart3, BriefcaseBusiness, Building2, Check, Eye, Link2, MapPin, MessageCircle, Palette, ShieldCheck, Sparkles } from "lucide-react";

const features = [
  { icon: BadgeCheck, title: "هوية موثوقة", text: "اسم منشأتك وشعارها ومعلوماتها الأساسية في صفحة أعمال احترافية وواضحة." },
  { icon: BriefcaseBusiness, title: "الخدمات بوضوح", text: "عرّف بخدمات منشأتك بدون تحويل الصفحة إلى متجر أو واجهة طلبات مزدحمة." },
  { icon: Building2, title: "الفروع والفريق", text: "اعرض فروعك وممثلي المبيعات وخدمة العملاء والعمليات بطريقة منظمة." },
  { icon: MessageCircle, title: "تواصل مباشر", text: "الهاتف وواتساب والموقع والبريد تظهر فقط عندما تضيفها وبأسلوب غير مزعج." },
  { icon: Palette, title: "مظهر احترافي", text: "قالب HEE موحد ومصمم للجوال أولًا، مع ثيمات إضافية ضمن الباقات الاحترافية." },
  { icon: BarChart3, title: "أداء قابل للقياس", text: "تابع المشاهدات وتفاعل الزوار مع الاتصال وواتساب والموقع من لوحة واحدة." },
];

const plans = [
  { name: "Free", badge: "للبداية", text: "أنشئ هويتك الرقمية وابدأ بمشاركة صفحة أعمال احترافية.", items: ["صفحة أعمال HEE", "الخدمات الأساسية", "فرع وفريق محدود", "معاينة قبل النشر"] },
  { name: "Business", badge: "للمنشآت النامية", text: "حدود أعلى ومزايا إضافية للمنشآت التي تعتمد على صفحتها يوميًا.", items: ["فروع وفريق أكثر", "أهلية طلب التوثيق", "مزايا احترافية إضافية", "ثيمات Business عند اعتمادها"] },
  { name: "Pro", badge: "للأعمال الأكبر", text: "مرونة أكبر للمنشآت ذات الفروع والفرق المتعددة.", items: ["حدود موسعة", "مزايا متقدمة", "أولوية في المزايا الجديدة", "ثيمات Pro عند اعتمادها"] },
];

export function HomepagePremium() {
  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#ffffff_38%,#f8f6ff_100%)] text-[#1f2552]">
    <header className="sticky top-0 z-50 border-b border-[#ece8f3]/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex min-h-[62px] max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2" aria-label="HEE"><span className="text-[26px] font-black tracking-[-.08em] text-[#6f3bd2]">HEE</span><span className="h-1.5 w-1.5 rounded-full bg-[#9c6be8]" /></Link>
        <div className="flex items-center gap-2"><Link href="/login" className="inline-flex h-10 items-center rounded-xl px-3 text-xs font-black text-[#514b63] sm:px-4 sm:text-sm">دخول</Link><Link href="/register" className="inline-flex h-10 items-center rounded-xl bg-[#6f3bd2] px-3 text-xs font-black text-white sm:px-4 sm:text-sm">أنشئ هويتك</Link></div>
      </div>
    </header>

    <section className="mx-auto grid max-w-6xl gap-9 px-4 pb-12 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[1.05fr_.95fr] lg:items-center lg:gap-14 lg:pb-20">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[#ddd4fa] bg-[#f7f3ff] px-3 py-1.5 text-[11px] font-black text-[#6040c7]"><Sparkles className="h-3.5 w-3.5" />هوية أعمال رقمية</span>
        <h1 className="mt-5 max-w-3xl text-[2.15rem] font-black leading-[1.25] tracking-tight text-[#181d45] sm:text-5xl lg:text-[3.45rem]">صفحة أعمال تجعل منشأتك تبدو كما تستحق.</h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-8 text-[#696477] sm:text-lg sm:leading-9">HEE تمنح شركتك أو مؤسستك أو مصنعك أو مطعمك أو متجرك أو نشاطك الخدمي هوية رقمية احترافية في رابط واحد؛ واضحة، موثوقة، وسهلة المشاركة مع عملائك.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#6f3bd2] px-6 text-sm font-black text-white shadow-[0_16px_35px_-20px_rgba(111,59,210,.75)]">ابدأ مجانًا<ArrowLeft className="h-4 w-4" /></Link><Link href="/demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[#ded9eb] bg-white px-6 text-sm font-black text-[#51406f]"><Eye className="h-4 w-4" />شاهد صفحة نموذجية</Link></div>
        <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-[#777183]"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#6f3bd2]" />ليست متجرًا إلكترونيًا</span><span className="inline-flex items-center gap-1.5"><Link2 className="h-4 w-4 text-[#6f3bd2]" />رابط واحد سهل المشاركة</span><span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-[#6f3bd2]" />مصممة للأعمال في السعودية</span></div>
      </div>

      <div className="mx-auto w-full max-w-[430px] rounded-[34px] border border-[#e5dff0] bg-white p-3 shadow-[0_35px_90px_-48px_rgba(58,35,75,.45)]">
        <div className="rounded-[28px] bg-[linear-gradient(180deg,#faf8ff,#fff)] p-4"><div className="flex items-center justify-between"><span className="text-[21px] font-black tracking-[-.08em] text-[#6f3bd2]">HEE</span><span className="grid h-9 w-9 place-items-center rounded-full border border-[#e7e1ef] bg-white text-[#6f3bd2]">↗</span></div><div className="mt-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#e7e1ef] bg-white text-2xl font-black text-[#6f3bd2]">ر</div><div className="mt-3 flex items-center justify-center gap-1.5"><b className="text-xl text-[#181d45]">شركة الرواد</b><BadgeCheck className="h-5 w-5 fill-blue-500 text-white" /></div><p className="mt-1 text-xs font-bold text-[#777183]">مقاولات عامة</p><p className="mx-auto mt-3 max-w-[290px] text-xs leading-6 text-[#777183]">حلول احترافية في المقاولات وإدارة المشاريع بمعايير عالية.</p></div><div className="mt-4 grid grid-cols-4 gap-2">{["اتصال","واتساب","الموقع","مشاركة"].map((item) => <div key={item} className="grid min-h-14 place-items-center rounded-2xl border border-[#eee9f4] bg-white text-[10px] font-black text-[#5b5267]">{item}</div>)}</div><div className="mt-3 space-y-2">{["عن المنشأة","خدماتنا","فروعنا","فريق العمل"].map((item) => <div key={item} className="flex h-12 items-center justify-between rounded-2xl border border-[#eee9f4] bg-white px-4 text-xs font-black text-[#3b3650]"><span>{item}</span><span className="text-[#6f3bd2]">⌄</span></div>)}</div></div>
      </div>
    </section>

    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"><div className="max-w-2xl"><span className="text-xs font-black text-[#6f3bd2]">أكثر من صفحة روابط</span><h2 className="mt-2 text-3xl font-black leading-tight text-[#181d45]">هوية المنشأة أولًا.</h2><p className="mt-3 text-sm leading-7 text-[#716b7c]">HEE تنظّم أهم ما يحتاجه عميلك لفهم منشأتك والثقة بها والتواصل معها بدون تشتيت.</p></div><div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ icon: Icon, title, text }) => <article key={title} className="rounded-[24px] border border-[#ebe7f1] bg-white p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f4f0ff] text-[#6f3bd2]"><Icon className="h-5 w-5" /></span><h3 className="mt-4 font-black text-[#24294f]">{title}</h3><p className="mt-2 text-sm leading-7 text-[#746e7d]">{text}</p></article>)}</div></section>

    <section className="border-y border-[#ece8f3] bg-white/65"><div className="mx-auto grid max-w-6xl gap-7 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[.85fr_1.15fr] lg:items-center"><div><span className="text-xs font-black text-[#6f3bd2]">من التسجيل إلى المشاركة</span><h2 className="mt-2 text-3xl font-black text-[#181d45]">دقائق، لا مشروع موقع كامل.</h2><p className="mt-3 text-sm leading-7 text-[#716b7c]">أدخل المعلومات الأساسية، عاين الصفحة، ثم أضف التفاصيل التي تحتاجها منشأتك فقط.</p></div><div className="grid gap-3 sm:grid-cols-3">{[{n:"01",t:"أنشئ الحساب",x:"ابدأ باسم منشأتك ونشاطها."},{n:"02",t:"أكمل هويتك",x:"أضف الشعار والخدمات والفروع والفريق."},{n:"03",t:"عاين وانشر",x:"شاهد الصفحة قبل مشاركتها مع عملائك."}].map((step) => <article key={step.n} className="rounded-[22px] border border-[#ebe7f1] bg-white p-4"><span className="text-xs font-black text-[#9d8bd9]">{step.n}</span><h3 className="mt-3 text-sm font-black text-[#24294f]">{step.t}</h3><p className="mt-2 text-xs leading-6 text-[#777183]">{step.x}</p></article>)}</div></div></section>

    <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"><div className="text-center"><span className="text-xs font-black text-[#6f3bd2]">باقات تنمو مع عملك</span><h2 className="mt-2 text-3xl font-black text-[#181d45]">ابدأ مجانًا ثم طوّر هويتك عند الحاجة.</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#716b7c]">ابدأ بالباقة المجانية، ثم اطلب الترقية من حسابك عندما تحتاج حدودًا ومزايا إضافية.</p></div><div className="mt-8 grid gap-4 lg:grid-cols-3">{plans.map((plan, index) => <article key={plan.name} className={`rounded-[26px] border bg-white p-5 ${index === 1 ? "border-[#bdaff1] shadow-[0_24px_60px_-46px_rgba(111,59,210,.7)]" : "border-[#ebe7f1]"}`}><div className="flex items-center justify-between"><h3 className="text-xl font-black text-[#24294f]">{plan.name}</h3><span className="rounded-full bg-[#f4f0ff] px-2.5 py-1 text-[10px] font-black text-[#6243c9]">{plan.badge}</span></div><p className="mt-3 min-h-12 text-sm leading-7 text-[#716b7c]">{plan.text}</p><div className="mt-4 space-y-2">{plan.items.map((item) => <div key={item} className="flex items-center gap-2 text-xs font-bold text-[#655f70]"><Check className="h-4 w-4 text-emerald-500" />{item}</div>)}</div><Link href="/register" className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-black ${index === 1 ? "bg-[#6f3bd2] text-white" : "border border-[#ddd8e7] text-[#554d63]"}`}>ابدأ الآن</Link></article>)}</div></section>

    <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6"><div className="rounded-[30px] bg-[#211c3f] px-5 py-9 text-center text-white sm:px-8 sm:py-11"><h2 className="text-2xl font-black sm:text-3xl">اجعل منشأتك جاهزة للمشاركة.</h2><p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/70">ابدأ بالحد الأدنى ثم أكمل التفاصيل تدريجيًا من لوحة HEE.</p><Link href="/register" className="mt-6 inline-flex h-12 items-center rounded-2xl bg-white px-6 text-sm font-black text-[#3c2b76]">إنشاء حساب HEE</Link></div></section>
  </main>;
}
