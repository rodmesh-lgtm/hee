"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Building2, Check, Eye, Link2, Menu, Palette, ShieldCheck, Sparkles, X } from "lucide-react";
import { IrLogo } from "./brand/ir-logo";

const plans = [
  { name: "Free", price: "مجانًا", text: "بداية عملية لهوية منشأتك الرقمية.", items: ["صفحة أعمال iR", "حتى 3 منتجات", "فرع واحد وفريق محدود", "معاينة قبل النشر"] },
  { name: "Business", price: "199 ر.س / شهر", featured: true, text: "للمنشآت النامية التي تعتمد على صفحتها يوميًا.", items: ["حتى 10 منتجات و5 فروع", "حتى 8 أقسام و8 جهات اتصال", "تحليلات متقدمة", "أهلية طلب التوثيق"] },
  { name: "Pro", price: "399 ر.س / شهر", text: "مرونة أكبر للفروع والفرق المتعددة.", items: ["حتى 30 منتجًا", "حدود موسعة للفروع والفريق", "تحليلات متقدمة", "أهلية طلب التوثيق"] },
];

const samples = [
  { name: "مطعم", detail: "قائمة الطعام · الفروع · الحجز", tone: "from-[#171127] to-[#34204f]", icon: "🍽️" },
  { name: "عيادة", detail: "الخدمات · الأطباء · الموقع", tone: "from-[#e8fbff] to-[#f7fdff]", icon: "✦" },
  { name: "متجر", detail: "المنتجات · التواصل · الفروع", tone: "from-[#fff3ed] to-[#fffaf7]", icon: "◆" },
  { name: "شركة خدمات", detail: "الخدمات · الفريق · التواصل", tone: "from-[#f2edff] to-[#fbf9ff]", icon: "◈" },
];

function Logo({ header = false }: { header?: boolean }) {
  return <IrLogo className={header ? "h-[42px] sm:h-[50px]" : "h-10"} priority={header} />;
}

export function HomepageConversion() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const normalized = useMemo(() => slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").slice(0, 30), [slug]);
  const registerHref = normalized ? `/register?slug=${encodeURIComponent(normalized)}` : "/register";

  return <main id="home" dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#171a3d]">
    <header className="ir-home-header sticky top-3 z-50 mx-3 rounded-[26px] border border-[#e9e4f2] bg-white/95 shadow-[0_12px_40px_rgba(38,27,71,.08)] backdrop-blur-xl lg:mx-auto lg:max-w-[1180px]">
      <div dir="ltr" className="flex h-16 items-center justify-between px-4 sm:h-[72px] sm:px-6">
        <Link href="/" aria-label="iR"><Logo header /></Link>
        <nav dir="rtl" className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          <Link className="rounded-xl px-4 py-2 text-sm font-black text-[#6841d8]" href="#home">الرئيسية</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#features">المميزات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#samples">نماذج الصفحات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#pricing">الباقات</Link>
        </nav>
        <div dir="rtl" className="hidden gap-2 lg:flex"><Link href="/login" className="rounded-xl border border-[#e3ddec] px-4 py-2 text-sm font-black">تسجيل الدخول</Link><Link href="/register" className="rounded-xl bg-[#6841d8] px-5 py-2 text-sm font-black text-white">ابدأ مجانًا</Link></div>
        <button className="grid h-11 w-11 place-items-center rounded-full border border-[#e4deed] lg:hidden" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
      </div>
    </header>

    {menuOpen && <div className="fixed inset-0 z-[100] lg:hidden"><button aria-label="إغلاق القائمة" className="absolute inset-0 bg-[#151027]/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} /><div className="absolute inset-x-3 top-3 rounded-[28px] bg-white p-5 shadow-2xl"><div dir="ltr" className="flex items-center justify-between"><Logo header /><button onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-[#f5f2f8]" aria-label="إغلاق"><X className="h-5 w-5" /></button></div><nav className="mt-5 grid gap-1 text-right font-black">{[["#features","المميزات"],["#samples","نماذج الصفحات"],["#pricing","الباقات"]].map(([href,label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 hover:bg-[#f8f5ff]">{label}</Link>)}</nav><div className="mt-4 grid gap-2"><Link href="/register" className="rounded-full bg-[#6841d8] px-5 py-3 text-center font-black text-white">ابدأ مجانًا</Link><Link href="/login" className="rounded-full border border-[#e3ddec] px-5 py-3 text-center font-black">تسجيل الدخول</Link></div></div></div>}

    <section className="relative bg-[radial-gradient(circle_at_10%_25%,rgba(111,68,218,.15),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(169,130,255,.13),transparent_26%),linear-gradient(180deg,#fcfbff_0%,#fff_100%)] px-4 pb-16 pt-14 sm:px-6 lg:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[.82fr_1.18fr]">
        <div className="order-2 mx-auto w-full max-w-[330px] lg:order-1">
          <div className="rounded-[42px] border-[7px] border-[#17151f] bg-[#17151f] p-2 shadow-[0_35px_80px_-35px_rgba(65,38,111,.55)]"><div className="overflow-hidden rounded-[30px] bg-white"><div className="h-28 bg-gradient-to-br from-[#241231] to-[#5b2f73]" /><div className="-mt-10 px-5 pb-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-[#1c1830] text-2xl text-white">✦</div><h3 className="mt-3 text-xl font-black">منشأتك</h3><p className="mt-1 text-xs text-[#777181]">هويتك الرقمية في مكان واحد</p><div className="mt-4 flex justify-center gap-2"><span className="h-9 w-9 rounded-full bg-[#6841d8]"/><span className="h-9 w-9 rounded-full bg-[#6841d8]"/><span className="h-9 w-9 rounded-full bg-[#6841d8]"/></div><div className="mt-5 grid gap-2">{["من نحن","خدماتنا","فروعنا","تواصل معنا"].map(x => <div key={x} className="rounded-full border border-[#eee9f3] bg-white px-4 py-3 text-sm font-black shadow-sm">{x}</div>)}</div></div></div></div>
          <div className="-mt-8 mr-auto w-fit rounded-2xl border border-[#e6e0ef] bg-white px-4 py-3 text-sm font-black shadow-lg"><ShieldCheck className="ml-2 inline h-5 w-5 text-[#6841d8]" />صفحتك. هويتك.</div>
        </div>
        <div className="order-1 text-center lg:order-2 lg:text-right">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f1ebff] px-4 py-2 text-xs font-black text-[#6841d8]"><Sparkles className="h-4 w-4" />هوية أعمالك الرقمية</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-[2.5rem] font-black leading-[1.18] tracking-tight sm:text-5xl lg:mx-0 lg:text-[4rem]">صفحتك الرسمية على <span className="text-[#6841d8]">ir.sa</span><br/>تبدأ من هنا</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-8 text-[#686273] sm:text-lg lg:mx-0">أنشئ صفحة أعمال احترافية برابط مختصر، واجمع معلومات منشأتك وخدماتك وفروعك وفريقك وطرق التواصل في مكان واحد.</p>
          <div className="mx-auto mt-7 max-w-2xl rounded-[22px] border border-[#ded5ee] bg-white p-2 shadow-[0_18px_45px_-25px_rgba(83,49,146,.35)] lg:mx-0"><div dir="ltr" className="flex flex-col gap-2 sm:flex-row"><span className="flex h-12 items-center px-3 text-lg font-black text-[#6841d8]">ir.sa/</span><input value={slug} onChange={e => setSlug(e.target.value)} dir="ltr" inputMode="url" placeholder="your-business" aria-label="اسم رابط منشأتك" className="h-12 min-w-0 flex-1 rounded-xl bg-[#faf9fc] px-4 text-left outline-none ring-[#6841d8] focus:ring-2"/><Link href={registerHref} className="inline-flex h-12 items-center justify-center rounded-xl bg-[#6841d8] px-6 text-sm font-black text-white">ابدأ بهذا الرابط</Link></div></div>
          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] font-bold text-[#817a8a] lg:justify-start"><span>حروف إنجليزية وأرقام</span><span>بدون مسافات</span><span>رابط سهل المشاركة</span></div>
          {normalized && <p className="mt-4 max-w-2xl rounded-xl bg-[#edfbf3] px-4 py-3 text-sm font-bold text-[#26724a]">سيكون رابطك: <b dir="ltr">ir.sa/{normalized}</b></p>}
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center lg:justify-start"><Link href={registerHref} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6841d8] px-7 font-black text-white">ابدأ صفحتك مجانًا <ArrowLeft className="h-4 w-4" /></Link><Link href="/demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 font-black text-[#554b67]"><Eye className="h-4 w-4" />شاهد صفحة نموذجية</Link></div>
        </div>
      </div>
    </section>

    <section id="features" className="mx-auto -mt-2 max-w-6xl px-4 sm:px-6"><div className="grid overflow-hidden rounded-[26px] border border-[#ebe6f2] bg-white shadow-[0_18px_55px_-35px_rgba(44,29,78,.28)] sm:grid-cols-2 lg:grid-cols-4">{[[Link2,"رابطك المختصر","سهل الحفظ والمشاركة"],[Palette,"تخصيص احترافي","هوية تناسب علامتك"],[BarChart3,"إحصاءات واضحة","تابع تفاعل زوارك"],[ShieldCheck,"موثوق وآمن","تجربة أعمال احترافية"]].map(([Icon,title,text],i) => { const I=Icon as typeof Link2; return <div key={i} className="flex gap-3 border-b border-[#f0ecf4] p-5 last:border-0 lg:border-b-0 lg:border-l"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2edff] text-[#6841d8]"><I className="h-5 w-5"/></span><div><h3 className="font-black">{String(title)}</h3><p className="mt-1 text-xs leading-5 text-[#7b7583]">{String(text)}</p></div></div>})}</div></section>

    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6"><div className="text-center"><p className="text-sm font-black text-[#6841d8]">بسيطة من البداية</p><h2 className="mt-2 text-3xl font-black">ابدأ في 3 خطوات</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{[["1","اختر اسم رابطك","اختر اسمًا واضحًا لمنشأتك على ir.sa"],["2","أنشئ صفحتك","أضف شعارك وخدماتك وفروعك ومعلومات التواصل"],["3","انشر وشارك","شارك رابطك وQR مع عملائك في كل قنواتك"]].map(([n,t,d]) => <div key={n} className="rounded-[26px] border border-[#e9e4ef] bg-white p-6 shadow-[0_16px_45px_-35px_rgba(38,24,68,.35)]"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#6841d8] font-black text-white">{n}</span><h3 className="mt-5 text-xl font-black">{t}</h3><p className="mt-2 text-sm leading-7 text-[#77717f]">{d}</p></div>)}</div></section>

    <section id="samples" className="bg-[#faf9fd] px-4 py-20 sm:px-6"><div className="mx-auto max-w-6xl"><div className="text-center"><p className="text-sm font-black text-[#6841d8]">مرنة لمختلف الأنشطة</p><h2 className="mt-2 text-3xl font-black">نماذج لصفحات أعمال على iR</h2><p className="mt-3 text-sm text-[#77717f]">أمثلة توضيحية لتصور كيف يمكن أن تظهر هوية منشأتك.</p></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{samples.map(s => <div key={s.name} className="overflow-hidden rounded-[28px] border border-[#e7e1ed] bg-white shadow-sm"><div className={`h-32 bg-gradient-to-br ${s.tone} grid place-items-center text-4xl`}>{s.icon}</div><div className="p-5"><h3 className="text-lg font-black">{s.name}</h3><p className="mt-2 text-xs leading-6 text-[#77717f]">{s.detail}</p><div className="mt-5 grid gap-2">{["من نحن","خدماتنا","تواصل معنا"].map(x => <span key={x} className="rounded-full border border-[#eee9f3] px-3 py-2 text-center text-xs font-bold">{x}</span>)}</div></div></div>)}</div></div></section>

    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6"><div className="text-center"><p className="text-sm font-black text-[#6841d8]">اختر ما يناسب نموك</p><h2 className="mt-2 text-3xl font-black">باقات مرنة للأعمال</h2></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map(p => <div key={p.name} className={`relative rounded-[28px] border p-7 ${p.featured ? "border-[#6841d8] shadow-[0_22px_55px_-32px_rgba(104,65,216,.55)]" : "border-[#e8e2ee]"}`}>{p.featured && <span className="absolute -top-3 right-6 rounded-full bg-[#6841d8] px-3 py-1 text-[11px] font-black text-white">الأكثر ملاءمة للنمو</span>}<h3 className="text-xl font-black">{p.name}</h3><p className="mt-2 text-2xl font-black text-[#6841d8]">{p.price}</p><p className="mt-3 min-h-12 text-sm leading-6 text-[#77717f]">{p.text}</p><ul className="mt-5 grid gap-3">{p.items.map(i => <li key={i} className="flex gap-2 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6841d8]" />{i}</li>)}</ul><Link href="/register" className={`mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl font-black ${p.featured ? "bg-[#6841d8] text-white" : "border border-[#dcd4e8]"}`}>ابدأ الآن</Link></div>)}</div></section>

    <section className="px-4 pb-20 sm:px-6"><div className="mx-auto max-w-6xl rounded-[32px] bg-[#171333] px-6 py-10 text-center text-white sm:px-10"><Building2 className="mx-auto h-8 w-8 text-[#a98aff]"/><h2 className="mt-4 text-2xl font-black sm:text-3xl">بُنيت iR لتكون الواجهة الرقمية الموثوقة لمنشأتك</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-[#cbc5da]">صفحة واحدة مرتبة تساعد عملاءك على الوصول إلى معلومات نشاطك وخدماتك وطرق التواصل معك بسرعة.</p><Link href="/register" className="mt-6 inline-flex rounded-xl bg-white px-6 py-3 font-black text-[#39226f]">أنشئ صفحة منشأتك</Link></div></section>

    <footer className="bg-[#11102a] px-4 py-12 text-white sm:px-6"><div className="mx-auto grid max-w-6xl gap-9 md:grid-cols-4"><div><Logo/><p className="mt-4 text-sm leading-7 text-[#aaa5bd]">منصة هوية أعمال رقمية تجمع معلومات منشأتك وروابطها في صفحة احترافية واحدة.</p></div><div><h3 className="font-black">المنتج</h3><div className="mt-4 grid gap-3 text-sm text-[#aaa5bd]"><Link href="#features">المميزات</Link><Link href="#pricing">الباقات</Link><Link href="#samples">نماذج الصفحات</Link></div></div><div><h3 className="font-black">الحساب</h3><div className="mt-4 grid gap-3 text-sm text-[#aaa5bd]"><Link href="/register">إنشاء حساب</Link><Link href="/login">تسجيل الدخول</Link></div></div><div><h3 className="font-black">iR</h3><p className="mt-4 text-sm text-[#aaa5bd]">ir.sa · هوية أعمالك الرقمية</p></div></div></footer>
  </main>;
}
