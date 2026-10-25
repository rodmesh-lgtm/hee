"use client";

import Link from "next/link";
import { COMMERCIAL_PLANS, PLAN_BILLING_NOTE } from "../app/lib/commercial-plans";
import styles from "./homepage-professional.module.css";
import { usePlatformBrand } from "./brand/platform-brand-provider";
import { HomePhonePreview } from "./home-phone-preview";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, BarChart3, BriefcaseBusiness, Building2, Check, CheckCircle2, Eye, Link2, Loader2, Menu, MessageCircle, Palette, PhoneCall, ShieldCheck, Stethoscope, Store, UtensilsCrossed, X, XCircle } from "lucide-react";
import { IrLogo } from "./brand/ir-logo";

type Availability = "idle" | "checking" | "available" | "taken" | "protected" | "invalid" | "error";

const plans=COMMERCIAL_PLANS.map(plan=>({name:plan.name,price:plan.monthlyPrice?`${plan.monthlyPrice} ر.س / شهر`:"مجانية",text:plan.description,items:[...plan.features],featured:plan.featured}));

const samples = [
  { name: "مطعم", detail: "القائمة · الفروع · الحجز", icon: UtensilsCrossed },
  { name: "عيادة", detail: "الخدمات · الفريق · الموقع", icon: Stethoscope },
  { name: "متجر", detail: "المنتجات · التواصل · الفروع", icon: Store },
  { name: "شركة خدمات", detail: "الخدمات · الفريق · التواصل", icon: BriefcaseBusiness },
];

const frequentlyAsked = [
  { question: "هل تبقى هوية INFRO ثابتة في صفحة منشأتي؟", answer: "نعم. تعتمد صفحات العملاء قالبًا موحدًا وعلامة INFRO ثابتة، وتعرض كل صفحة اسم المنشأة وشعارها والبايو وخدماتها وبياناتها الخاصة." },
  { question: "هل أستطيع تغيير ألوان الصفحة والخط؟", answer: "يمكنك اختيار مجموعة ألوان جاهزة أو تخصيص اللون الرئيسي والتفاصيل والخلفية، والاختيار بين ثلاثة خطوط عربية. عاين النتيجة ثم احفظها، ويمكنك العودة إلى مظهر INFRO الافتراضي." },
  { question: "كيف أنشر صفحة منشأتي؟", answer: "أنشئ حسابك وأكد بريدك الإلكتروني، ثم أكمل بيانات المنشأة وعاين صفحتك قبل نشرها من لوحة التحكم. يمكنك تعديل بياناتك لاحقًا من الحساب نفسه." },
  { question: "هل يمكن إضافة موظفين بصلاحيات محددة؟", answer: "يمكن لصاحب المنشأة إضافة مستخدمين موظفين وتحديد الأقسام المسموح لهم بفتحها، دون منحهم الوصول إلى جميع أقسام الحساب." },
  { question: "متى تعمل رسائل واتساب وتأكيدات الحجوزات؟", answer: "يتطلب الإرسال ربط حساب واتساب للأعمال وإكمال تسجيل الرقم لدى Meta، واختيار قالب معتمد وإعداد الخدمة. الربط وحده لا يعني أن الإرسال أصبح جاهزًا؛ راجع حالة الاتصال والقوالب داخل حسابك." },
];

function Logo({ header = false }: { header?: boolean }) {
  return <IrLogo className={header ? "h-9 sm:h-11" : "h-10"} priority={header} />;
}

export function HomepageProfessional() {
  const design = usePlatformBrand();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = menuRef.current;
    if (!dialog) return;
    if (menuOpen) dialog.showModal();
    else dialog.close();
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [menuOpen]);
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
        setAvailability(data.available ? "available" : data.reason === "protected" ? "protected" : data.reason === "invalid" ? "invalid" : "taken");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setAvailability("error");
      }
    }, 420);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [normalized, slug]);

  const status = effectiveAvailability === "checking" ? { text: "جارٍ التحقق من الرابط…", cls: "text-slate-500", icon: <Loader2 className="h-4 w-4 animate-spin" /> }
    : effectiveAvailability === "available" ? { text: `رائع، ir.sa/${normalized} متاح الآن`, cls: "text-emerald-700", icon: <CheckCircle2 className="h-4 w-4" /> }
    : effectiveAvailability === "taken" ? { text: "هذا الرابط مستخدم. جرّب اسمًا آخر مميزًا لمنشأتك.", cls: "text-rose-700", icon: <XCircle className="h-4 w-4" /> }
    : effectiveAvailability === "protected" ? { text: "هذا الاسم محمي وغير متاح للحجز الذاتي. تخصيصه يتطلب تفويضًا ومراجعة إدارية.", cls: "text-amber-800", icon: <ShieldCheck className="h-4 w-4" /> }
    : effectiveAvailability === "invalid" ? { text: "اكتب 4 أحرف على الأقل باستخدام الإنجليزية والأرقام والشرطة -", cls: "text-amber-700", icon: <XCircle className="h-4 w-4" /> }
    : effectiveAvailability === "error" ? { text: "تعذر التحقق الآن. حاول مرة أخرى بعد قليل.", cls: "text-amber-700", icon: <XCircle className="h-4 w-4" /> }
    : null;

  return <main style={{ background:design.backgroundColor,color:design.foregroundColor }} id="home" data-infro-home dir="rtl" className={`${styles.page} min-h-screen overflow-x-clip bg-white text-slate-950`}>
    <header style={{ background:design.headerBackground,color:design.headerForeground }} className="sticky top-2 z-50 mx-2 rounded-full border border-[#d9ebe8] bg-white/95 shadow-[0_10px_34px_rgba(0,95,88,.10)] backdrop-blur-xl sm:top-3 sm:mx-3 lg:mx-auto lg:max-w-[1180px]">
      <div dir="ltr" className="flex h-[58px] items-center justify-between gap-2 px-3 sm:h-[68px] sm:px-5">
        <Link href="/" aria-label="INFRO" className="shrink-0"><Logo header /></Link>
        <nav dir="rtl" className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
          <Link className="rounded-xl px-4 py-2 text-sm font-black text-[#008f87]" href="#home">الرئيسية</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-[#effbf9]" href="#about">عن INFRO</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-[#effbf9]" href="#features">المميزات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-[#effbf9]" href="#samples">نماذج الصفحات</Link>
          <Link className="rounded-xl px-4 py-2 text-sm font-bold text-slate-600 hover:bg-[#effbf9]" href="#pricing">الباقات</Link>
          <Link className="rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-[#effbf9]" href="#faq">الأسئلة الشائعة</Link>
        </nav>
        <div dir="rtl" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          <Link href="/login" className="inline-flex h-10 items-center rounded-full px-2.5 text-[12px] font-black text-slate-700 hover:bg-[#effbf9] sm:px-4 sm:text-sm">دخول</Link>
          <Link href={design.headerCtaHref ?? "/register"} className="inline-flex h-10 items-center rounded-full bg-[#008f87] px-3 text-[12px] font-black text-white shadow-sm hover:bg-[#007d75] sm:px-5 sm:text-sm">{design.headerCtaLabel ?? "ابدأ مجانًا"}</Link>
          <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#d9ebe8] lg:hidden" type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="home-mobile-menu" aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
        </div>
      </div>
    </header>

    <dialog ref={menuRef} id="home-mobile-menu" aria-label="قائمة التنقل" onCancel={() => setMenuOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-2 backdrop:bg-[#061619]/40 backdrop:backdrop-blur-sm">
      <div className="max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-[28px] bg-white p-4 shadow-2xl">
        <div dir="ltr" className="flex items-center justify-between"><Logo header /><button type="button" onClick={() => setMenuOpen(false)} className="grid h-11 w-11 place-items-center rounded-full bg-[#eef8f7]" aria-label="إغلاق القائمة"><X className="h-5 w-5" /></button></div>
        <nav aria-label="التنقل على الجوال" className="mt-4 grid gap-1 text-right font-bold">{[["#about","عن INFRO"],["#features","المميزات"],["#samples","نماذج الصفحات"],["#pricing","الباقات"],["#faq","الأسئلة الشائعة"]].map(([href,label]) => <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-2xl px-4 py-3 hover:bg-[#effbf9]">{label}</Link>)}</nav>
        <div className="mt-4 grid grid-cols-2 gap-2"><Link href="/register" className="rounded-full bg-[#008f87] px-4 py-3 text-center text-sm font-black text-white">ابدأ مجانًا</Link><Link href="/login" className="rounded-full border border-[#bdebe5] px-4 py-3 text-center text-sm font-black">تسجيل الدخول</Link></div>
      </div>
    </dialog>

    <section className={styles.hero}>
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[.82fr_1.18fr] lg:gap-14">
        <div className="order-2 mx-auto w-full max-w-[300px] sm:max-w-[330px] lg:order-1">
          <HomePhonePreview />

        </div>

        <div className="order-1 text-center lg:order-2 lg:text-right">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e9fbf8] px-3.5 py-2 text-[11px] font-black text-[#008f87] sm:text-xs"><span className={styles.brandRule} aria-hidden="true" />مصممة للأعمال والمنشآت</span>
          <h1 className="mx-auto mt-4 max-w-3xl text-[2.15rem] font-black leading-[1.14] tracking-tight sm:mt-5 sm:text-5xl lg:mx-0 lg:text-[4rem]">{design.homeHeroTitleAr ?? <>هويتك الرقمية والتسويقية.<br/><span className="text-[#008f87]">في مساحة أعمال واحدة.</span></>}</h1>
          <p className="mx-auto mt-4 max-w-xl text-[14px] leading-7 text-slate-600 sm:text-lg sm:leading-8 lg:mx-0">{design.homeHeroSubtitleAr ?? "اجمع هوية منشأتك وحضورها الرقمي وتذكيرات أعمالك وتسويق واتساب في تجربة واحدة مترابطة وسهلة الإدارة."}</p>

          <div className={`mx-auto mt-6 max-w-xl rounded-[22px] border bg-white p-2 shadow-[0_18px_45px_-25px_rgba(0,143,135,.30)] transition ${effectiveAvailability === "available" ? "border-emerald-300" : effectiveAvailability === "taken" ? "border-rose-300" : "border-[#bdebe5]"} lg:mx-0`}>
            <div dir="ltr" className="flex min-w-0 items-center gap-1 rounded-2xl bg-[#f5fffd] px-3"><span className="shrink-0 text-base font-black text-[#008f87]">ir.sa/</span><input value={slug} onChange={e => { setSlug(e.target.value); setAvailability("idle"); }} dir="ltr" inputMode="url" autoComplete="off" spellCheck={false} placeholder="your-business" aria-label="تحقق من توفر اسم رابط منشأتك" className="h-14 min-w-0 flex-1 bg-transparent px-1 text-left text-base font-semibold outline-none"/></div>
            <Link tabIndex={effectiveAvailability === "available" ? 0 : -1} aria-disabled={effectiveAvailability !== "available"} href={registerHref} className={`mt-2 inline-flex h-13 w-full items-center justify-center rounded-2xl px-6 text-sm font-black text-white transition ${effectiveAvailability === "available" ? "bg-[#008f87] hover:bg-[#007d75]" : "pointer-events-none bg-slate-400"}`}>تحقق وابدأ التسجيل</Link>
          </div>
          <div className="mx-auto mt-2 min-h-6 max-w-xl lg:mx-0">{status ? <p aria-live="polite" className={`inline-flex items-center gap-2 text-xs font-bold sm:text-sm ${status.cls}`}>{status.icon}{status.text}</p> : <p className="text-[11px] font-bold text-slate-500 sm:text-xs">اكتب اسم منشأتك بالإنجليزية وسنتحقق من توفره مباشرة.</p>}</div>

          <div className="mx-auto mt-4 flex max-w-xl items-center justify-center gap-4 text-[11px] font-bold text-slate-600 sm:text-xs lg:mx-0 lg:justify-start"><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#008f87]"/>ابدأ مجانًا</span><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#008f87]"/>بدون تعقيد</span><span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-[#008f87]"/>جاهزة للجوال</span></div>
          <Link href="/demo" className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-black text-slate-700 hover:bg-[#effbf9]"><Eye className="h-4 w-4" />شاهد صفحة أعمال نموذجية</Link>
        </div>
      </div>
    </section>

    <section id="features" className="scroll-mt-28 mx-auto max-w-6xl px-4 pb-16 sm:px-6"><div className="grid overflow-hidden rounded-[26px] border border-[#dcebea] bg-white shadow-[0_18px_55px_-35px_rgba(0,95,88,.24)] sm:grid-cols-2 lg:grid-cols-4">{[[Link2,"رابط مختصر","سهل الحفظ والمشاركة"],[Palette,"هوية احترافية","تخصيص يناسب علامتك"],[BarChart3,"إحصاءات واضحة","افهم تفاعل زوارك"],[ShieldCheck,"حضور موثوق","واجهة أعمال منظمة"]].map(([Icon,title,text],i) => { const I=Icon as typeof Link2; return <div key={i} className="flex gap-3 border-b border-[#e7f0ef] p-4 last:border-0 sm:p-5 lg:border-b-0 lg:border-l"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e9fbf8] text-[#008f87]"><I className="h-5 w-5"/></span><div><h3 className="text-sm font-black sm:text-base">{String(title)}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{String(text)}</p></div></div>})}</div></section>

    <section id="about" aria-labelledby="about-title" className="scroll-mt-24 px-4 pb-16 sm:px-6 sm:pb-20">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-[#d7e9e7] bg-[linear-gradient(135deg,#f5fffd,#fff)] shadow-[0_24px_70px_-45px_rgba(0,95,88,.28)]">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
          <div className="p-6 sm:p-9 lg:p-11">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#e9fbf8] px-3 py-1.5 text-xs font-black text-[#008f87]"><BadgeCheck className="h-4 w-4" />من نحن</span>
            <h2 id="about-title" className="mt-4 text-2xl font-black leading-tight sm:text-4xl">INFRO للهوية الرقمية والتسويقية</h2>
            <p className="mt-4 max-w-3xl text-sm leading-8 text-slate-600 sm:text-base">INFRO مشروع تقني سعودي يساعد المنشآت على بناء هوية أعمال رقمية وتسويقية موثوقة ومنظمة، ويجمع الحضور الرقمي وإدارة الأعمال والتواصل التسويقي في مساحة واحدة مترابطة.</p>
            <p className="mt-4 text-sm font-bold text-slate-700">الكيان القانوني: مجموعة طلبات المعلومات لخدمات الأعمال</p>
            <div className="mt-6 rounded-[24px] border border-[#d7e9e7] bg-white p-5">
              <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><MessageCircle className="h-5 w-5" /></span><div><h3 className="font-black text-slate-900">WhatsApp Business Platform الرسمي</h3><p className="mt-2 text-sm leading-7 text-slate-600">تتضمن منظومة INFRO خدمة WhatsApp Marketing المبنية حصريًا على WhatsApp Business Platform / Cloud API الرسمي من Meta، لربط كل منشأة بحساب WABA ورقمها الخاص وإدارة القوالب والحملات والمحادثات، مع احترام موافقة العملاء والخصوصية وإلغاء الاشتراك.</p></div></div>
            </div>
          </div>
          <aside className="flex flex-col justify-center bg-[#07181b] p-6 text-white sm:p-9 lg:p-10" aria-label="بيانات التواصل">
            <p className="text-xs font-black text-[#6eead8]">التواصل والتحقق التجاري</p>
            <h3 className="mt-2 text-2xl font-black">يسعدنا تواصلك</h3>
            <p className="mt-3 text-sm leading-7 text-white/65">للاستفسارات المتعلقة بمنصة INFRO أو خدمات WhatsApp Business الرسمية، تواصل معنا عبر الرقم المسجل في بياناتنا الرسمية.</p>
            <a href="tel:+966564212464" dir="ltr" className="mt-6 inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-white px-5 text-lg font-black text-[#07181b]"><PhoneCall className="h-5 w-5" />0564212464</a>
            <a href="https://wa.me/966564212464" className="mt-3 inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-5 text-sm font-black text-white hover:bg-white/10"><MessageCircle className="h-4 w-4" />التواصل عبر واتساب</a>
          </aside>
        </div>
      </div>
    </section>

    <section className="bg-[#07181b] px-4 py-16 text-white sm:px-6 sm:py-20"><div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2"><div><p className="text-sm font-black text-[#6eead8]">مساحة أعمال وليست مجرد روابط</p><h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">اجعل عميلك يصل إلى المهم، واجعل فريقك يعرف الخطوة التالية.</h2><p className="mt-4 max-w-xl leading-8 text-white/70">من أول زيارة يستطيع العميل فهم نشاطك والوصول لخدماتك، بينما تساعدك أدوات INFRO على تنظيم حضورك ومتابعة أعمالك والتواصل مع عملائك.</p></div><div className="grid grid-cols-2 gap-3">{[["الهوية الرقمية","حضور موحد وواضح"],["التذكيرات الذكية","متابعة ما يجب إنجازه"],["مذكرات الأعمال","ذاكرة تشغيلية منظمة"],["تسويق واتساب","قنوات رسمية ومتوافقة"]].map(([t,d]) => <div key={t} className="rounded-[22px] border border-white/10 bg-white/5 p-4 sm:p-5"><h3 className="font-black">{t}</h3><p className="mt-2 text-xs leading-5 text-white/60">{d}</p></div>)}</div></div></section>

    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"><div className="text-center"><p className="text-sm font-black text-[#008f87]">من الفكرة إلى مساحة عملك</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">ابدأ في 3 خطوات واضحة</h2></div><div className="mt-8 grid gap-4 md:grid-cols-3">{[["1","اختر اسم رابطك","تحقق من توفر اسم منشأتك ثم ابدأ التسجيل."],["2","ابنِ هويتك","أضف بيانات منشأتك وخدماتها وفروعها ووسائل التواصل."],["3","نظّم وتواصل","استخدم مذكرات الأعمال والتذكيرات وتسويق واتساب من مركز عمل واحد."]].map(([n,t,d]) => <div key={n} className="infro-home-card rounded-[24px] border border-[#dbe9e7] bg-white p-5 shadow-[0_16px_45px_-35px_rgba(0,95,88,.28)] sm:p-6"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#008f87] text-sm font-black text-white">{n}</span><h3 className="mt-4 text-lg font-black sm:text-xl">{t}</h3><p className="mt-2 text-sm leading-7 text-slate-600 sm:text-base">{d}</p></div>)}</div></section>

    <section id="samples" className={styles.showcase} aria-labelledby="showcase-title">
      <div className={styles.showcaseIntro}><span className={styles.kicker}>INFRO / حضور يخصّك</span><h2 id="showcase-title">نشاطك مختلف.<br/>وحضورك يستحق أن يعبّر عنه.</h2><p>صُممت INFRO لتجمع اسمك وخدماتك وفروعك في صفحة واحدة. ترتيب واضح لعميلك، ومساحة مرنة لألوان علامتك وخطها.</p><Link href="/demo" className={styles.demoLink}>استكشف الصفحة النموذجية <ArrowLeft aria-hidden="true" className="h-4 w-4"/></Link><span className={styles.demoNote}>نموذج توضيحي قابل للتصفح، وليس حساب عميل.</span></div>
      <div className={styles.activityList}>{samples.map(({name,detail,icon:Icon},index)=><article key={name} className={styles.activity}><span className={styles.activityNumber} aria-hidden="true">0{index+1}</span><div><h3>{name}</h3><p>{detail}</p></div><Icon aria-hidden="true" className="h-6 w-6"/></article>)}</div>
    </section>

    <section className="px-4 py-16 sm:px-6 sm:py-20"><div className="mx-auto max-w-6xl rounded-[32px] bg-[#008f87] px-6 py-10 text-center text-white sm:px-10"><Building2 className="mx-auto h-9 w-9"/><p className="mt-4 text-sm font-black text-white/75">بُنيت للمنشآت السعودية</p><h2 className="mx-auto mt-2 max-w-3xl text-2xl font-black leading-tight sm:text-4xl">هوية رقمية وتسويقية واضحة تساعدك على إدارة حضور منشأتك وعلاقات عملائك من مكان واحد.</h2><div className="mt-7 flex flex-wrap justify-center gap-2 text-xs font-black sm:text-sm">{["مطاعم ومقاهي","عيادات","متاجر","شركات خدمات","مكاتب مهنية"].map(x => <span key={x} className="rounded-full bg-white/12 px-4 py-2">{x}</span>)}</div></div></section>

    <section id="pricing" className="scroll-mt-28 mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20"><div className="text-center"><p className="text-sm font-black text-[#008f87]">باقات تناسب نموك</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">ابدأ مجانًا، وطوّر حضورك عند الحاجة</h2><p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">التسجيل يبدأ بحساب مجاني. تُعرض إمكانية الترقية وشروطها داخل الحساب عند إتاحتها، ولا يتم تفعيل اشتراك مدفوع بمجرد التسجيل.</p></div><div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">{plans.map(plan => <div key={plan.name} className={`infro-home-card relative flex flex-col rounded-[28px] border p-6 ${plan.featured ? "border-[#008f87] bg-[#f5fffd] shadow-[0_24px_70px_-35px_rgba(0,143,135,.38)]" : "border-[#dbe9e7] bg-white"}`}>{plan.featured && <span className="absolute -top-3 right-6 rounded-full bg-[#008f87] px-3 py-1 text-xs font-black text-white">للأعمال المتنامية</span>}<h3 className="text-xl font-black">{plan.name}</h3><p className="mt-3 text-2xl font-black text-[#008f87]">{plan.price}</p><p className="mt-3 text-sm leading-6 text-slate-600">{plan.text}</p><div className="mb-7 mt-5 grid gap-3">{plan.items.map(item => <div key={item} className="flex items-start gap-2 text-sm font-bold"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#008f87]"/>{item}</div>)}</div><Link href="/register" className={`mt-auto inline-flex h-12 w-full items-center justify-center rounded-full font-black ${plan.featured ? "bg-[#008f87] text-white" : "border border-[#bdebe5] text-[#008f87]"}`}>أنشئ حسابك المجاني</Link></div>)}</div><p className="mt-5 text-xs leading-7 text-slate-600">{PLAN_BILLING_NOTE}</p></section>

    <section className="px-4 pb-16 sm:px-6 sm:pb-20"><div className="mx-auto max-w-5xl rounded-[32px] border border-[#d7e9e7] bg-[linear-gradient(135deg,#f5fffd,#fff)] p-7 text-center sm:p-10"><span className={styles.signature} dir="ltr" aria-hidden="true">ir.sa /</span><h2 className="mt-3 text-2xl font-black sm:text-3xl">اسم منشأتك يستحق رابطًا يليق بها.</h2><p className="mx-auto mt-3 max-w-xl leading-7 text-slate-600">تحقق من توفره الآن وابدأ بناء حضورك الرقمي والتسويقي على INFRO.</p><Link href="#home" className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#008f87] px-7 font-black text-white">تحقق من اسم رابطك <ArrowLeft className="h-4 w-4"/></Link></div></section>

    <section id="faq" aria-labelledby="home-faq-title" className="scroll-mt-28 border-t border-[#d7e9e7] bg-[#f8fcfb] px-4 py-14 sm:px-6 sm:py-20"><div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[.65fr_1fr]"><div><p className="text-sm font-bold text-[#008f87]">قبل أن تبدأ</p><h2 id="home-faq-title" className="mt-3 text-3xl font-black">إجابات واضحة لخطوتك الأولى</h2><p className="mt-4 text-sm leading-8 text-slate-600">تعرّف على ما يمكنك تخصيصه، وطريقة النشر، ومتطلبات تشغيل قنوات التواصل.</p><Link href="/contact" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#bdebe5] bg-white px-5 text-sm font-bold text-[#08756e]">لديك سؤال آخر؟ تواصل معنا<ArrowLeft className="h-4 w-4" aria-hidden="true"/></Link></div><div className="space-y-3">{frequentlyAsked.map(item=><details key={item.question} className="group rounded-2xl border border-[#d7e9e7] bg-white p-5 open:border-[#80c9bd]"><summary className="cursor-pointer text-sm font-bold leading-7 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#008f87]">{item.question}</summary><p className="mt-3 text-sm leading-8 text-slate-600">{item.answer}</p></details>)}</div></div></section>

    <footer style={{ background:design.footerBackground,color:design.footerForeground }} className="bg-[#061619] px-4 py-10 text-white sm:px-6"><div className="mx-auto flex max-w-6xl flex-col gap-7 md:flex-row md:items-center md:justify-between"><div><Logo/><p className="mt-3 max-w-md text-sm leading-7 text-white/60">INFRO منصة سعودية لهويتك الرقمية والتسويقية. اجمع حضور منشأتك وأدوات عملك في مساحة واحدة مترابطة.</p></div><div className="flex flex-wrap gap-x-5 gap-y-3 text-sm font-bold text-white/70"><Link href="#about">عن INFRO</Link><Link href="#faq">الأسئلة الشائعة</Link><Link href="/privacy">سياسة الخصوصية</Link><Link href="/terms">الشروط والأحكام</Link><Link href="/contact">تواصل معنا</Link><Link href="/login">تسجيل الدخول</Link></div></div><p className="mx-auto mt-6 max-w-6xl text-xs">{design.footerCopyright}</p></footer>
  </main>;
}
