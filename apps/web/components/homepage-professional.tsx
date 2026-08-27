"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BarChart3, Building2, Check, CheckCircle2, Eye, Link2, Loader2, Menu, Palette, ShieldCheck, Sparkles, X, XCircle } from "lucide-react";
import { IrLogo } from "./brand/ir-logo";

type Availability = "idle" | "checking" | "available" | "taken" | "invalid" | "error";

const plans = [
  { name: "Free", price: "مجانًا", text: "ابدأ بهويتك الرقمية دون تعقيد.", items: ["صفحة أعمال iR", "حتى 3 منتجات", "فرع واحد", "معاينة قبل النشر"] },
  { name: "Business", price: "199 ر.س / شهر", featured: true, text: "للمنشآت التي تعتمد على حضورها الرقمي يوميًا.", items: ["حتى 10 منتجات و5 فروع", "تحليلات متقدمة", "فريق وجهات اتصال", "أهلية طلب التوثيق"] },
  { name: "Pro", price: "399 ر.س / شهر", text: "للشركات ذات الفروع والفرق الأكبر.", items: ["حتى 30 منتجًا", "حدود موسعة للفروع والفريق", "تحليلات متقدمة", "أهلية طلب التوثيق"] },
];

const samples = [
  ["مطعم", "القائمة · الفروع · الحجز", "🍽️"],
  ["عيادة", "الخدمات · الفريق · الموقع", "✦"],
  ["متجر", "المنتجات · التواصل · الفروع", "◆"],
  ["شركة خدمات", "الخدمات · الفريق · التواصل", "◈"],
];

function Logo({ header = false }: { header?: boolean }) {
  return <IrLogo className={header ? "h-[42px] sm:h-[50px]" : "h-10"} priority={header} />;
}

export function HomepageProfessional() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const normalized = useMemo(() => slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60), [slug]);
  const registerHref = normalized && availability === "available" ? `/register?slug=${encodeURIComponent(normalized)}` : "/register";

  useEffect(() => {
    if (!slug.trim()) { setAvailability("idle"); return; }
    if (normalized.length < 4) { setAvailability("invalid"); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailability("checking");
      try {
        const response = await fetch(`/api/public/slug-availability?slug=${encodeURIComponent(normalized)}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) { setAvailability("error"); return; }
        const data = await response.json() as { available?: boolean; reason?: string };
        setAvailability(data.available ? "available" : data.reason === "invalid" ? "invalid" : "taken");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setAvailability("error");
      }
    }, 420);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, slug]);

  const status = availability === "checking" ? { text: "جارٍ التحقق من الرابط…", cls: "text-[#6f6879]", icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    : availability === "available" ? { text: `رائع، ir.sa/${normalized} متاح الآن`, cls: "text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> }
    : availability === "taken" ? { text: "هذا الرابط مستخدم. جرّب اسمًا آخر مميزًا لمنشأتك.", cls: "text-rose-700", icon: <XCircle className="h-4 w-4" /> }
    : availability === "invalid" ? { text: "اكتب 4 أحرف على الأقل باستخدام الإنجليزية والأرقام والشرطة -", cls: "text-amber-700", icon: <XCircle className="h-4 w-4" /> }
    : availability === "error" ? { text: "تعذر التحقق الآن. حاول مرة أخرى بعد قليل.", cls: "text-amber-700", icon: <XCircle className="h-4 w-4" /> }
    : null;

  return <main id="home" dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#171a3d]">
    <header className="sticky top-3 z-50 mx-3 rounded-[26px] border border-[#e9e4f2] bg-white/95 shadow-[0_12px_40px_rgba(38,27,71,.08)] backdrop-blur-xl lg:mx-auto lg:max-w-[1180px]">
      <div dir="ltr" className="flex h-16 items-center justify-between px-4 sm:h-[72px] sm:px-6">
        <Link href="/" aria-label="iR"><Logo header /></Link>
        <nav dir="rtl" className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          <Link className="rounded-xl px-4 py-2 text-sm font-black text-[#6841d8]" href="#home">الرئيسية</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#features">المميزات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#samples">نماذج الصفحات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#pricing">الباقات</Link>
        </nav>
        <div dir="rtl" className="hidden gap-2 lg:flex"><Link href="/login" className="rounded-xl border border-[#e3ddec] px-4 py-2 text-sm font-black hover:bg-[#faf8ff]">تسجيل الدخول</Link><Link href="/register" className="rounded-xl bg-[#6841d8] px-5 py-2 text-sm font-black text-white shadow-sm hover:bg-[#5b34c9]">ابدأ مجانًا</Link></div>
        <button className="grid h-11 w-11 place-items-center rounded-full border border-[#e4deed] lg:hidden" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
      </div>
    </header>

    {menuOpen && <div className="fixed inset-0 z-[100] lg:hidden"><button aria-label="إغلاق القائمة" className="absolute inset-0 bg-[#151027]/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} /><div className="absolute inset-x-3 top-3 rounded-[28px] bg-white p-5 shadow-2xl"><div dir="ltr" className="flex items-center justify-between"><Logo header /><button onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-[#f5f2f8]" aria-label="إغلاق"><X className="h-5 w-5" /></button></div><nav className="mt-5 grid gap-1 text-right font-black">{[["#features","المميزات"],["#samples","نماذج الصفحات"],["#pricing","الباقات"]].map(([href,label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 hover:bg-[#f8f5ff]">{label}</Link>)}</nav><div className="mt-4 grid gap-2"><Link href="/register" className="rounded-full bg-[#6841d8] px-5 py-3 text-center font-black text-white">ابدأ مجانًا</Link><Link href="/login" className="rounded-full border border-[#e3ddec] px-5 py-3 text-center font-black">تسجيل الدخول</Link></div></div></div>}

    <section className="relative bg-[radial-gradient(circle_at_10%_25%,rgba(111,68,218,.15),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(169,130,255,.13),transparent_26%),linear-gradient(180deg,#fcfbff_0%,#fff_100%)] px-4 pb-16 pt-14 sm:px-6 lg:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[.82fr_1.18fr]">
        <div className="order-2 mx-auto w-full max-w-[330px] lg:order-1"><div className="rounded-[42px] border-[7px] border-[#17151f] bg-[#17151f] p-2 shadow-[0_35px_80px_-35px_rgba(65,38,111,.55)]"><div className="overflow-hidden rounded-[30px] bg-white"><div className="h-28 bg-gradient-to-br from-[#241231] to-[#5b2f73]" /><div className="-mt-10 px-5 pb-6 text-center"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-4 border-white bg-[#1c1830] text-2xl text-white">✦</div><h3 className="mt-3 text-xl font-black">منشأتك</h3><p className="mt-1 text-xs text-[#777181]">هويتك الرقمية في مكان واحد</p><div className="mt-5 grid gap-2">{["من نحن","خدماتنا","فروعنا","تواصل معنا"].map(x => <div key={x} className="rounded-full border border-[#eee9f3] bg-white px-4 py-3 text-sm font-black shadow-sm">{x}</div>)}</div></div></div></div><div className="-mt-8 mr-auto w-fit rounded-2xl border border-[#e6e0ef] bg-white px-4 py-3 text-sm font-black shadow-lg"><ShieldCheck className="ml-2 inline h-5 w-5 text-[#6841d8]" />صفحتك. هويتك.</div></div>
        <div className="order-1 text-center lg:order-2 lg:text-right">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f1ebff] px-4 py-2 text-xs font-black text-[#6841d8]"><Sparkles className="h-4 w-4" />هوية أعمالك الرقمية</span>
          <h1 className="mx-auto mt-5 max-w-3xl text-[2.5rem] font-black leading-[1.18] tracking-tight sm:text-5xl lg:mx-0 lg:text-[4rem]">اسم منشأتك. هويتها.<br/><span className="text-[#6841d8]">رابط واحد يختصرها.</span></h1>
          <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-8 text-[#686273] sm:text-lg lg:mx-0">أنشئ حضورًا رقميًا احترافيًا لمنشأتك على iR، واجمع معلوماتها وخدماتها وفروعها وفريقها وطرق التواصل في صفحة واحدة سهلة المشاركة.</p>
          <div className={`mx-auto mt-7 max-w-2xl rounded-[24px] border bg-white p-2 shadow-[0_18px_45px_-25px_rgba(83,49,146,.35)] transition ${availability === "available" ? "border-emerald-300" : availability === "taken" ? "border-rose-300" : "border-[#ded5ee]"} lg:mx-0`}><div dir="ltr" className="flex flex-col gap-2 sm:flex-row"><span className="flex h-12 items-center px-3 text-lg font-black text-[#6841d8]">ir.sa/</span><input value={slug} onChange={e => setSlug(e.target.value)} dir="ltr" inputMode="url" autoComplete="off" spellCheck={false} placeholder="your-business" aria-label="تحقق من توفر اسم رابط منشأتك" className="h-12 min-w-0 flex-1 rounded-xl bg-[#faf9fc] px-4 text-left font-semibold outline-none ring-[#6841d8] focus:ring-2"/><Link aria-disabled={availability !== "available"} href={registerHref} className={`inline-flex h-12 items-center justify-center rounded-xl px-6 text-sm font-black text-white transition ${availability === "available" ? "bg-[#6841d8] hover:bg-[#5b34c9]" : "pointer-events-none bg-[#aaa2b8]"}`}>احجز هذا الرابط</Link></div></div>
          <div className="mt-3 min-h-6">{status ? <p aria-live="polite" className={`inline-flex items-center gap-2 text-sm font-bold ${status.cls}`}>{status.icon}{status.text}</p> : <p className="text-xs font-bold text-[#817a8a]">اكتب اسم منشأتك بالإنجليزية وسنتحقق من توفره مباشرة.</p>}</div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center lg:justify-start"><Link href="/register" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#6841d8] px-7 font-black text-white">ابدأ صفحتك مجانًا <ArrowLeft className="h-4 w-4" /></Link><Link href="/demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 font-black text-[#554b67]"><Eye className="h-4 w-4" />شاهد صفحة نموذجية</Link></div>
        </div>
      </div>
    </section>

    <section id="features" className="mx-auto -mt-2 max-w-6xl px-4 sm:px-6"><div className="grid overflow-hidden rounded-[26px] border border-[#ebe6f2] bg-white shadow-[0_18px_55px_-35px_rgba(44,29,78,.28)] sm:grid-cols-2 lg:grid-cols-4">{[[Link2,"رابط مختصر","سهل الحفظ والمشاركة"],[Palette,"هوية احترافية","تخصيص يناسب علامتك"],[BarChart3,"إحصاءات واضحة","افهم تفاعل زوارك"],[ShieldCheck,"حضور موثوق","واجهة أعمال منظمة"]].map(([Icon,title,text],i) => { const I=Icon as typeof Link2; return <div key={i} className="flex gap-3 border-b border-[#f0ecf4] p-5 last:border-0 lg:border-b-0 lg:border-l"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2edff] text-[#6841d8]"><I className="h-5 w-5"/></span><div><h3 className="font-black">{String(title)}</h3><p className="mt-1 text-xs leading-5 text-[#7b7583]">{String(text)}</p></div></div>})}</div></section>

    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6"><div className="text-center"><p className="text-sm font-black text-[#6841d8]">من الفكرة إلى رابطك</p><h2 className="mt-2 text-3xl font-black">ابدأ في 3 خطوات واضحة</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{[["1","اختر اسم رابطك","تحقق من توفر اسم منشأتك واحجز رابطها."],["2","ابنِ هويتك","أضف الشعار والخدمات والفروع والفريق وبيانات التواصل."],["3","انشر وشارك","انشر صفحتك وشارك الرابط وQR في جميع قنواتك."]].map(([n,t,d]) => <div key={n} className="rounded-[26px] border border-[#e9e4ef] bg-white p-6 shadow-[0_16px_45px_-35px_rgba(38,24,68,.35)]"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#6841d8] font-black text-white">{n}</span><h3 className="mt-5 text-xl font-black">{t}</h3><p className="mt-2 leading-7 text-[#746d7d]">{d}</p></div>)}</div></section>

    <section id="samples" className="bg-[#faf8ff] px-4 py-20 sm:px-6"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="text-sm font-black text-[#6841d8]">مرنة لكل نشاط</p><h2 className="mt-2 text-3xl font-black">صفحة تبدو كجزء من علامتك</h2></div><p className="max-w-xl leading-7 text-[#746d7d]">من المطاعم والعيادات إلى المتاجر وشركات الخدمات، صُممت iR لتعرض أهم ما يحتاجه عميلك بسرعة ووضوح.</p></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{samples.map(([name,detail,icon]) => <div key={name} className="group rounded-[28px] border border-[#e8e2f0] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="grid h-44 place-items-center rounded-[22px] bg-gradient-to-br from-[#f0eaff] to-[#fbf9ff] text-5xl transition group-hover:scale-[1.02]">{icon}</div><h3 className="mt-5 text-lg font-black">{name}</h3><p className="mt-1 text-sm text-[#7a7382]">{detail}</p></div>)}</div></div></section>

    <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6"><div className="text-center"><p className="text-sm font-black text-[#6841d8]">باقات تناسب نموك</p><h2 className="mt-2 text-3xl font-black">ابدأ مجانًا، وطوّر حضورك عند الحاجة</h2></div><div className="mt-10 grid gap-5 lg:grid-cols-3">{plans.map(plan => <div key={plan.name} className={`relative rounded-[30px] border p-7 ${plan.featured ? "border-[#6841d8] bg-[#faf8ff] shadow-[0_24px_70px_-35px_rgba(104,65,216,.5)]" : "border-[#e8e3ed] bg-white"}`}>{plan.featured && <span className="absolute -top-3 right-7 rounded-full bg-[#6841d8] px-4 py-1 text-xs font-black text-white">الأكثر ملاءمة للأعمال</span>}<h3 className="text-xl font-black">{plan.name}</h3><p className="mt-3 text-3xl font-black">{plan.price}</p><p className="mt-3 min-h-12 text-sm leading-6 text-[#756e7d]">{plan.text}</p><div className="mt-6 grid gap-3">{plan.items.map(item => <p key={item} className="flex items-center gap-2 text-sm font-bold"><Check className="h-4 w-4 text-[#6841d8]" />{item}</p>)}</div><Link href="/register" className={`mt-7 flex h-12 items-center justify-center rounded-xl font-black ${plan.featured ? "bg-[#6841d8] text-white" : "border border-[#ddd6e7]"}`}>ابدأ الآن</Link></div>)}</div></section>

    <section className="px-4 pb-20 sm:px-6"><div className="mx-auto max-w-6xl overflow-hidden rounded-[34px] bg-[#171127] px-6 py-12 text-center text-white sm:px-10"><Building2 className="mx-auto h-9 w-9 text-[#bda5ff]"/><h2 className="mt-4 text-3xl font-black">حوّل اسم منشأتك إلى حضور رقمي يستحق الثقة</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-white/70">ابدأ برابط واضح على ir.sa، ثم ابنِ صفحة أعمال تجمع هويتك ومعلوماتك وخدماتك في مكان واحد.</p><Link href="/register" className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-7 font-black text-[#30204f]">أنشئ صفحتك مجانًا <ArrowLeft className="h-4 w-4"/></Link></div></section>
  </main>;
}
