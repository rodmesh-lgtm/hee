"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, BarChart3, Building2, Check, CheckCircle2, Eye, Link2, Loader2, Menu, MessageCircle, Palette, PhoneCall, ShieldCheck, Sparkles, X, XCircle } from "lucide-react";
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
  return <IrLogo className={header ? "h-9 sm:h-11" : "h-10"} priority={header} />;
}

export function HomepageProfessional() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [slug, setSlug] = useState("");
  const [availability, setAvailability] = useState<Availability>("idle");
  const normalized = useMemo(() => slug.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60), [slug]);
  const effectiveAvailability: Availability = !slug.trim() ? "idle" : normalized.length < 4 ? "invalid" : availability;
  const registerHref = normalized && effectiveAvailability === "available" ? `/register?slug=${encodeURIComponent(normalized)}` : "/register";

  useEffect(() => {
    if (!slug.trim() || normalized.length < 4) return;
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

  const status = effectiveAvailability === "checking" ? { text: "جارٍ التحقق من الرابط…", cls: "text-[#6f6879]", icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    : effectiveAvailability === "available" ? { text: `رائع، ir.sa/${normalized} متاح الآن`, cls: "text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> }
    : effectiveAvailability === "taken" ? { text: "هذا الرابط مستخدم. جرّب اسمًا آخر مميزًا لمنشأتك.", cls: "text-rose-700", icon: <XCircle className="h-4 w-4" /> }
    : effectiveAvailability === "invalid" ? { text: "اكتب 4 أحرف على الأقل باستخدام الإنجليزية والأرقام والشرطة -", cls: "text-amber-700", icon: <XCircle className="h-4 w-4" /> }
    : effectiveAvailability === "error" ? { text: "تعذر التحقق الآن. حاول مرة أخرى بعد قليل.", cls: "text-amber-700", icon: <XCircle className="h-4 w-4" /> }
    : null;

  return <main id="home" dir="rtl" className="min-h-screen overflow-hidden bg-white text-[#171a3d]">
    <header className="sticky top-2 z-50 mx-2 rounded-full border border-[#e9e4f2] bg-white/95 shadow-[0_10px_34px_rgba(38,27,71,.10)] backdrop-blur-xl sm:top-3 sm:mx-3 lg:mx-auto lg:max-w-[1180px]">
      <div dir="ltr" className="flex h-[58px] items-center justify-between gap-2 px-3 sm:h-[68px] sm:px-5">
        <Link href="/" aria-label="iR" className="shrink-0"><Logo header /></Link>
        <nav dir="rtl" className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          <Link className="rounded-xl px-4 py-2 text-sm font-black text-[#6841d8]" href="#home">الرئيسية</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#about">عن iR</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#features">المميزات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#samples">نماذج الصفحات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-[#625d70] hover:bg-[#f7f4ff]" href="#pricing">الباقات</Link>
        </nav>
        <div dir="rtl" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Link href="/login" className="inline-flex h-10 items-center rounded-full px-2.5 text-[12px] font-black text-[#373143] hover:bg-[#f7f4ff] sm:px-4 sm:text-sm">دخول</Link>
          <Link href="/register" className="inline-flex h-10 items-center rounded-full bg-[#6841d8] px-3 text-[12px] font-black text-white shadow-sm hover:bg-[#5b34c9] sm:px-5 sm:text-sm">ابدأ مجانًا</Link>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#e4deed] lg:hidden" onClick={() => setMenuOpen(true)} aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
    </header>

    {menuOpen && <div className="fixed inset-0 z-[100] lg:hidden"><button aria-label="إغلاق القائمة" className="absolute inset-0 bg-[#151027]/35 backdrop-blur-sm" onClick={() => setMenuOpen(false)} /><div className="absolute inset-x-2 top-2 rounded-[28px] bg-white p-4 shadow-2xl"><div dir="ltr" className="flex items-center justify-between"><Logo header /><button onClick={() => setMenuOpen(false)} className="grid h-10 w-10 place-items-center rounded-full bg-[#f5f2f8]" aria-label="إغلاق"><X className="h-5 w-5" /></button></div><nav className="mt-4 grid gap-1 text-right font-black">{[["#about","عن iR"],["#features","المميزات"],["#samples","نماذج الصفحات"],["#pricing","الباقات"]].map(([href,label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 hover:bg-[#f8f5ff]">{label}</Link>)}</nav><div className="mt-4 grid grid-cols-2 gap-2"><Link href="/register" className="rounded-full bg-[#6841d8] px-4 py-3 text-center text-sm font-black text-white">ابدأ مجانًا</Link><Link href="/login" className="rounded-full border border-[#e3ddec] px-4 py-3 text-center text-sm font-black">تسجيل الدخول</Link></div></div></div>}

    <section className="relative bg-[radial-gradient(circle_at_15%_20%,rgba(104,65,216,.14),transparent_30%),radial-gradient(circle_at_90%_5%,rgba(168,134,255,.13),transparent_28%),linear-gradient(180deg,#fcfbff_0%,#fff_100%)] px-4 pb-14 pt-10 sm:px-6 sm:pt-14 lg:pb-20 lg:pt-20">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[.82fr_1.18fr] lg:gap-14">
        <div className="order-2 mx-auto w-full max-w-[300px] sm:max-w-[330px] lg:order-1">
          <div className="rounded-[38px] border-[6px] border-[#17151f] bg-[#17151f] p-2 shadow-[0_35px_80px_-35px_rgba(65,38,111,.55)]"><div className="overflow-hidden rounded-[27px] bg-white"><div className="h-24 bg-gradient-to-br from-[#241231] to-[#6841d8]" /><div className="-mt-9 px-5 pb-6 text-center"><div className="mx-auto grid h-[72px] w-[72px] place-items-center rounded-full border-4 border-white bg-[#1c1830] text-2xl text-white">✦</div><h3 className="mt-3 text-lg font-black">منشأتك</h3><p className="mt-1 text-xs text-[#777181]">كل ما يحتاجه عميلك في صفحة واحدة</p><div className="mt-4 grid gap-2">{["من نحن","خدماتنا","فروعنا","تواصل معنا"].map(x => <div key={x} className="rounded-full border border-[#eee9f3] bg-white px-4 py-2.5 text-sm font-black shadow-sm">{x}</div>)}</div></div></div></div>
          <div className="-mt-7 mr-auto w-fit rounded-2xl border border-[#e6e0ef] bg-white px-3.5 py-2.5 text-xs font-black shadow-lg sm:text-sm"><ShieldCheck className="ml-2 inline h-4 w-4 text-[#6841d8]" />صفحتك. هويتك.</div>
        </div>

        <div className="order-1 text-center lg:order-2 lg:text-right">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f1ebff] px-3.5 py-2 text-[11px] font-black text-[#6841d8] sm:text-xs"><Sparkles className="h-4 w-4" />مصممة للأعمال والمنشآت</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-[2.15rem] font-black leading-[1.14] tracking-tight sm:mt-5 sm:text-5xl lg:mx-0 lg:text-[4rem]">هويتك الرقمية.<br/><span className="text-[#6841d8]">في رابط واحد.</span></h1>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-7 text-[#686273] sm:text-lg sm:leading-8 lg:mx-0">اجمع معلومات منشأتك وخدماتها وفروعها وفريقها وطرق التواصل في صفحة احترافية واحدة سهلة المشاركة.</p>

          <div className={`mx-auto mt-6 max-w-xl rounded-[22px] border bg-white p-2 shadow-[0_18px_45px_-25px_rgba(83,49,146,.40)] transition ${effectiveAvailability === "available" ? "border-emerald-300" : effectiveAvailability === "taken" ? "border-rose-300" : "border-[#ded5ee]"} lg:mx-0`}>
            <div dir="ltr" className="flex min-w-0 items-center gap-1 rounded-2xl bg-[#faf9fc] px-3"><span className="shrink-0 text-base font-black text-[#6841d8]">ir.sa/</span><input value={slug} onChange={e => setSlug(e.target.value)} dir="ltr" inputMode="url" autoComplete="off" spellCheck={false} placeholder="your-business" aria-label="تحقق من توفر اسم رابط منشأتك" className="h-14 min-w-0 flex-1 bg-transparent px-1 text-left text-base font-semibold outline-none"/></div>
            <Link aria-disabled={effectiveAvailability !== "available"} href={registerHref} className={`mt-2 inline-flex h-13 w-full items-center justify-center rounded-2xl px-6 text-sm font-black text-white transition ${effectiveAvailability === "available" ? "bg-[#6841d8] hover:bg-[#5b34c9]" : "pointer-events-none bg-[#aaa2b8]"}`}>تحقق واحجز رابطك</Link>
          </div>
          <div className="mx-auto mt-2 min-h-6 max-w-xl lg:mx-0">{status ? <p aria-live="polite" className={`inline-flex items-center gap-2 text-xs font-bold sm:text-sm ${status.cls}`}>{status.icon}{status.text}</p> : <p className="text-[11px] font-bold text-[#817a8a] sm:text-xs">اكتب اسم منشأتك بالإنجليزية وسنتحقق من توفره مباشرة.</p>}</div>

          <div className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-4 text-[11px] font-bold text-[#746d7d] sm:text-xs lg:mx-0 lg:justify-start"><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#6841d8]"/>ابدأ مجانًا</span><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#6841d8]"/>بدون تعقيد</span><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#6841d8]"/>جاهزة للجوال</span></div>
          <Link href="/demo" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-[#554b67] hover:bg-[#f7f4ff]"><Eye className="h-4 w-4" />شاهد صفحة أعمال نموذجية</Link>
        </div>
      </div>
    </section>

    <section id="features" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6"><div className="grid overflow-hidden rounded-[26px] border border-[#ebe6f2] bg-white shadow-[0_18px_55px_-35px_rgba(44,29,78,.28)] sm:grid-cols-2 lg:grid-cols-4">{[[Link2,"رابط مختصر","سهل الحفظ والمشاركة"],[Palette,"هوية احترافية","تخصيص يناسب علامتك"],[BarChart3,"إحصاءات واضحة","افهم تفاعل زوارك"],[ShieldCheck,"حضور موثوق","واجهة أعمال منظمة"]].map(([Icon,title,text],i) => { const I=Icon as typeof Link2; return <div key={i} className="flex gap-3 border-b border-[#f0ecf4] p-4 last:border-0 sm:p-5 lg:border-b-0 lg:border-l"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f2edff] text-[#6841d8]"><I className="h-5 w-5"/></span><div><h3 className="text-sm font-black sm:text-base">{String(title)}</h3><p className="mt-1 text-xs leading-5 text-[#7b7583]">{String(text)}</p></div></div>})}</div></section>

    <section id="about" aria-labelledby="about-title" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-[#e8e2f0] bg-[linear-gradient(135deg,#fbf9ff,#fff)] shadow-[0_24px_70px_-45px_rgba(68,42,112,.35)]">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
          <div className="p-6 sm:p-9 lg:p-11">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f1ebff] px-3 py-1.5 text-xs font-black text-[#6841d8]"><BadgeCheck className="h-4 w-4" />من نحن</span>
            <h2 id="about-title" className="mt-4 text-2xl font-black leading-tight sm:text-4xl">iR لهوية الأعمال الرقمية</h2>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-[#686273] sm:text-base">iR مشروع تقني سعودي يساعد المنشآت على بناء هوية أعمال رقمية موثوقة ومنظمة في رابط واحد، تجمع التعريف بالنشاط والخدمات والمنتجات والفروع والفريق ووسائل التواصل، لتمنح العملاء صورة واضحة وتجربة وصول أسرع.</p>
            <p className="mt-4 text-sm font-bold text-[#403956]">الكيان القانوني: مجموعة طلبات المعلومات لخدمات الأعمال</p>
            <div className="mt-6 rounded-[24px] border border-[#e5def1] bg-white p-5">
              <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><MessageCircle className="h-5 w-5" /></span><div><h3 className="font-black text-[#242044]">WhatsApp Business Platform الرسمي</h3><p className="mt-2 text-sm leading-7 text-[#706979]">تتضمن منظومة iR خدمة WhatsApp Marketing المبنية حصريًا على WhatsApp Business Platform / Cloud API الرسمي من Meta، لربط كل منشأة بحساب WABA ورقمها الخاص وإدارة القوالب والحملات والمحادثات، مع احترام موافقة العملاء والخصوصية وإلغاء الاشتراك.</p></div></div>
            </div>
          </div>
          <aside className="flex flex-col justify-center bg-[#1b1530] p-6 text-white sm:p-9 lg:p-10" aria-label="بيانات التواصل">
            <p className="text-xs font-black text-[#bdaaff]">التواصل والتحقق التجاري</p>
            <h3 className="mt-2 text-2xl font-black">يسعدنا تواصلك</h3>
            <p className="mt-3 text-sm leading-7 text-white/65">للاستفسارات المتعلقة بمنصة iR أو خدمات WhatsApp Business الرسمية، تواصل معنا عبر الرقم المسجل في بياناتنا الرسمية.</p>
            <a href="tel:+966564212464" dir="ltr" className="mt-6 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-5 text-lg font-black text-[#241a3e]"><PhoneCall className="h-5 w-5" />0564212464</a>
            <a href="https://wa.me/966564212464" className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-black text-white hover:bg-white/10"><MessageCircle className="h-4 w-4" />التواصل عبر واتساب</a>
          </aside>
        </div>
      </div>
    </section>

    <section className="bg-[#17122a] px-4 py-16 text-white sm:px-6 sm:py-20"><div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2"><div><p className="text-sm font-black text-[#bba7ff]">صفحة أعمال وليست مجرد روابط</p><h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">اجعل عميلك يصل إلى المهم بسرعة.</h2><p className="mt-4 max-w-xl leading-8 text-white/70">من أول زيارة يستطيع العميل فهم نشاطك، رؤية خدماتك ومنتجاتك، الوصول لفروعك وفريقك، ثم التواصل أو تنفيذ الإجراء المناسب.</p></div><div className="grid grid-cols-2 gap-3">{[["الخدمات","اعرض ما تقدمه بوضوح"],["الفروع","المواقع وساعات العمل"],["الفريق","جهات الاتصال المناسبة"],["التحليلات","اعرف ما يهم زوارك"]].map(([t,d]) => <div key={t} className="rounded-[22px] border border-white/10 bg-white/5 p-4 sm:p-5"><h3 className="font-black">{t}</h3><p className="mt-2 text-xs leading-5 text-white/60">{d}</p></div>)}</div></div></section>

    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"><div className="text-center"><p className="text-sm font-black text-[#6841d8]">من الفكرة إلى رابطك</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">ابدأ في 3 خطوات واضحة</h2></div><div className="mt-8 grid gap-4 md:grid-cols-3">{[["1","اختر اسم رابطك","تحقق من توفر اسم منشأتك واحجز رابطها."],["2","ابنِ هويتك","أضف الشعار والخدمات والفروع والفريق وبيانات التواصل."],["3","انشر وشارك","انشر صفحتك وشارك الرابط وQR في جميع قنواتك."]].map(([n,t,d]) => <div key={n} className="rounded-[24px] border border-[#e9e4ef] bg-white p-5 shadow-[0_16px_45px_-35px_rgba(38,24,68,.35)] sm:p-6"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#6841d8] text-sm font-black text-white">{n}</span><h3 className="mt-4 text-lg font-black sm:text-xl">{t}</h3><p className="mt-2 text-sm leading-7 text-[#746d7d] sm:text-base">{d}</p></div>)}</div></section>

    <section id="samples" className="bg-[#faf8ff] px-4 py-16 sm:px-6 sm:py-20"><div className="mx-auto max-w-6xl"><div className="text-center md:text-right"><p className="text-sm font-black text-[#6841d8]">مرنة لكل نشاط</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">صفحة تبدو كجزء من علامتك</h2><p className="mx-auto mt-3 max-w-2xl leading-7 text-[#746d7d] md:mx-0">من المطاعم والعيادات إلى المتاجر وشركات الخدمات، صُممت iR لتعرض أهم ما يحتاجه عميلك بسرعة ووضوح.</p></div><div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">{samples.map(([name,detail,icon]) => <div key={name} className="min-w-[78vw] snap-center rounded-[28px] border border-[#e8e2f0] bg-white p-5 shadow-sm sm:min-w-0"><div className="grid h-48 place-items-center rounded-[22px] bg-gradient-to-br from-[#eee7ff] to-[#fff] text-5xl">{icon}</div><h3 className="mt-5 text-lg font-black">{name}</h3><p className="mt-1 text-sm text-[#7a7382]">{detail}</p></div>)}</div></div></section>

    <section className="px-4 py-16 sm:px-6 sm:py-20"><div className="mx-auto max-w-6xl rounded-[32px] bg-[#6841d8] px-6 py-10 text-center text-white sm:px-10"><Building2 className="mx-auto h-9 w-9"/><p className="mt-4 text-sm font-black text-white/75">بُنيت للمنشآت السعودية</p><h2 className="mx-auto mt-2 max-w-3xl text-2xl font-black leading-tight sm:text-4xl">هوية رقمية واضحة تساعد العميل على الوثوق بمنشأتك والوصول إليها.</h2><div className="mt-7 flex flex-wrap justify-center gap-2 text-xs font-black sm:text-sm">{["مطاعم ومقاهي","عيادات","متاجر","شركات خدمات","مكاتب مهنية"].map(x => <span key={x} className="rounded-full bg-white/12 px-4 py-2">{x}</span>)}</div></div></section>

    <section id="pricing" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"><div className="text-center"><p className="text-sm font-black text-[#6841d8]">باقات تناسب نموك</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">ابدأ مجانًا، وطوّر حضورك عند الحاجة</h2></div><div className="mt-8 grid gap-4 lg:grid-cols-3">{plans.map(plan => <div key={plan.name} className={`relative rounded-[28px] border p-6 ${plan.featured ? "border-[#6841d8] bg-[#faf8ff] shadow-[0_24px_70px_-35px_rgba(104,65,216,.5)]" : "border-[#e9e4ef] bg-white"}`}>{plan.featured && <span className="absolute -top-3 right-6 rounded-full bg-[#6841d8] px-3 py-1 text-xs font-black text-white">الأكثر اختيارًا</span>}<h3 className="text-xl font-black">{plan.name}</h3><p className="mt-3 text-2xl font-black text-[#6841d8]">{plan.price}</p><p className="mt-3 text-sm leading-6 text-[#756e7d]">{plan.text}</p><div className="mt-5 grid gap-3">{plan.items.map(item => <div key={item} className="flex items-start gap-2 text-sm font-bold"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#6841d8]"/>{item}</div>)}</div><Link href="/register" className={`mt-7 inline-flex h-12 w-full items-center justify-center rounded-full font-black ${plan.featured ? "bg-[#6841d8] text-white" : "border border-[#dcd3ea] text-[#6841d8]"}`}>ابدأ الآن</Link></div>)}</div></section>

    <section className="px-4 pb-16 sm:px-6 sm:pb-20"><div className="mx-auto max-w-5xl rounded-[32px] border border-[#e8e2f0] bg-[linear-gradient(135deg,#faf7ff,#fff)] p-7 text-center sm:p-10"><Sparkles className="mx-auto h-8 w-8 text-[#6841d8]"/><h2 className="mt-3 text-2xl font-black sm:text-3xl">اسم منشأتك يستحق رابطًا يليق بها.</h2><p className="mx-auto mt-3 max-w-xl leading-7 text-[#746d7d]">تحقق من توفره الآن وابدأ بناء حضورك الرقمي على iR.</p><Link href="#home" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#6841d8] px-7 font-black text-white">تحقق من اسم رابطك <ArrowLeft className="h-4 w-4"/></Link></div></section>

    <footer className="bg-[#141027] px-4 py-10 text-white sm:px-6"><div className="mx-auto flex max-w-6xl flex-col gap-7 md:flex-row md:items-center md:justify-between"><div><Logo/><p className="mt-3 max-w-md text-sm leading-7 text-white/60">منصة سعودية لهوية الأعمال الرقمية. اجمع حضور منشأتك في رابط واحد احترافي.</p></div><div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-white/70"><Link href="#about">عن iR</Link><Link href="/privacy">سياسة الخصوصية</Link><Link href="/terms">الشروط والأحكام</Link><Link href="/contact">تواصل معنا</Link><Link href="/login">تسجيل الدخول</Link></div></div></footer>
  </main>;
}
