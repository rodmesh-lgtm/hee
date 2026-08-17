"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Check, Link2, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { businessTypes } from "../lib/business-types";

const steps = ["النشاط", "الرابط", "التواصل", "المراجعة"];

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [businessType, setBusinessType] = useState(businessTypes[0] ?? "شركة");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");

  const progress = ((step + 1) / steps.length) * 100;
  const canContinue = useMemo(() => {
    if (step === 0) return name.trim().length >= 2 && businessType.trim().length >= 2 && description.trim().length >= 10;
    if (step === 1) return normalizeSlug(slug).length >= 3;
    if (step === 2) return city.trim().length >= 2 && (whatsapp.trim().length >= 8 || phone.trim().length >= 8);
    return true;
  }, [step, name, businessType, description, slug, city, whatsapp, phone]);

  function next() {
    setError("");
    if (!canContinue) {
      setError("أكمل البيانات المطلوبة قبل المتابعة.");
      return;
    }
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError("");
    setPending(true);

    try {
      const response = await fetch("/api/business/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: normalizeSlug(slug),
          businessType,
          entityType: businessType,
          businessCategory: businessType,
          description: description.trim(),
          city: city.trim(),
          whatsapp: whatsapp.trim(),
          phone: phone.trim(),
          primaryColor: "#6f3bd2",
          onboardingStep: "published",
        }),
      });
      const result = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        if (response.status === 401) { router.push("/login"); return; }
        setError(result.error ?? "تعذر إنشاء النشاط");
        return;
      }
      router.push(result.redirectTo ?? "/dashboard?welcome=1");
      router.refresh();
    } catch {
      setError("تعذر إنشاء النشاط. حاول مرة أخرى.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#fff_42%,#f8f6ff_100%)] text-[#1f2552]">
      <div className="mx-auto w-full max-w-[720px] px-4 py-7 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <div><div className="text-3xl font-black tracking-[-.08em] text-[#6f3bd2]">HEE</div><p className="mt-1 text-xs font-bold text-slate-500">أنشئ هويتك الرقمية</p></div>
          <span className="rounded-full border border-[#e5e0f3] bg-white px-3 py-1.5 text-[11px] font-black text-[#6543ce]">الخطوة {step + 1} من {steps.length}</span>
        </div>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#ece8f6]"><div className="h-full rounded-full bg-[#6f3bd2] transition-all duration-300" style={{ width: `${progress}%` }} /></div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px] font-bold text-slate-400">{steps.map((item, index)=><span key={item} className={index <= step ? "text-[#6543ce]" : ""}>{item}</span>)}</div>

        <form onSubmit={onSubmit} className="mt-6 rounded-[30px] border border-[#e9e5f1] bg-white p-5 shadow-[0_24px_70px_-50px_rgba(73,48,125,.45)] sm:p-7">
          {step === 0 ? <section className="space-y-5">
            <div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><Building2 className="h-5 w-5" /></span><h1 className="mt-4 text-2xl font-black">عرّفنا بنشاطك</h1><p className="mt-1 text-sm leading-6 text-slate-500">هذه المعلومات ستظهر في رأس صفحة هويتك الرقمية.</p></div>
            <label className="block"><span className="mb-2 block text-sm font-black">اسم المنشأة</span><input value={name} onChange={(e)=>setName(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc]" placeholder="مثال: شركة الرواد للمقاولات" autoFocus /></label>
            <label className="block"><span className="mb-2 block text-sm font-black">نوع النشاط</span><select value={businessType} onChange={(e)=>setBusinessType(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc]">{businessTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></label>
            <label className="block"><span className="mb-2 block text-sm font-black">وصف مختصر</span><textarea value={description} onChange={(e)=>setDescription(e.target.value)} className="min-h-[110px] w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 py-3 text-sm leading-6 outline-none focus:border-[#8b72dc]" placeholder="اكتب باختصار ما الذي تقدمه منشأتك ولماذا يختارك العملاء." /></label>
          </section> : null}

          {step === 1 ? <section className="space-y-5"><div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><Link2 className="h-5 w-5" /></span><h2 className="mt-4 text-2xl font-black">اختر رابط صفحتك</h2><p className="mt-1 text-sm leading-6 text-slate-500">هذا الرابط هو هويتك التي ستشاركها مع عملائك.</p></div><div className="rounded-2xl border border-[#e5e3ec] bg-[#faf9fd] px-4 py-3 text-sm font-bold text-slate-500" dir="ltr">hee.sa/<span className="text-[#6543ce]">{normalizeSlug(slug) || "your-business"}</span></div><label className="block"><span className="mb-2 block text-sm font-black">اسم الرابط بالإنجليزية</span><input value={slug} onChange={(e)=>setSlug(normalizeSlug(e.target.value))} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-left text-sm outline-none focus:border-[#8b72dc]" dir="ltr" placeholder="alrowad" /></label><p className="text-[11px] leading-5 text-slate-400">يمكن استخدام الحروف الإنجليزية والأرقام والشرطة فقط.</p></section> : null}

          {step === 2 ? <section className="space-y-5"><div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#ecfdf3] text-emerald-600"><MessageCircle className="h-5 w-5" /></span><h2 className="mt-4 text-2xl font-black">كيف يصل إليك العملاء؟</h2><p className="mt-1 text-sm leading-6 text-slate-500">أضف الأساسيات الآن، ويمكنك إضافة الفروع والفريق والموقع لاحقًا من اللوحة.</p></div><label className="block"><span className="mb-2 block text-sm font-black">المدينة</span><div className="relative"><MapPin className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"/><input value={city} onChange={(e)=>setCity(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] pr-11 pl-4 text-sm outline-none focus:border-[#8b72dc]" placeholder="الرياض" /></div></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-2 block text-sm font-black">واتساب</span><input value={whatsapp} onChange={(e)=>setWhatsapp(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc]" dir="ltr" placeholder="+9665xxxxxxxx" /></label><label><span className="mb-2 block text-sm font-black">الهاتف</span><input value={phone} onChange={(e)=>setPhone(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc]" dir="ltr" placeholder="+966xxxxxxxxx" /></label></div></section> : null}

          {step === 3 ? <section className="space-y-5"><div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><Sparkles className="h-5 w-5" /></span><h2 className="mt-4 text-2xl font-black">جاهز لإنشاء هويتك</h2><p className="mt-1 text-sm leading-6 text-slate-500">سننشئ الصفحة بالثيم الأساسي المجاني، ثم تنقلك HEE للوحة التحكم لإكمال الشعار والخدمات والفروع والفريق.</p></div><div className="space-y-3 rounded-[22px] border border-[#ebe7f2] bg-[#faf9fd] p-4 text-sm"><Review label="المنشأة" value={name}/><Review label="النشاط" value={businessType}/><Review label="الرابط" value={`hee.sa/${normalizeSlug(slug)}`}/><Review label="المدينة" value={city}/><Review label="التواصل" value={whatsapp || phone}/></div><div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs leading-6 text-emerald-800"><Check className="ml-2 inline h-4 w-4"/>ستبدأ على الباقة المجانية ويمكنك الترقية من لوحة التحكم في أي وقت.</div></section> : null}

          {error ? <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}

          <div className="mt-7 flex items-center justify-between gap-3 border-t border-[#efecf3] pt-5">
            <button type="button" onClick={()=>setStep((value)=>Math.max(0,value-1))} disabled={step===0||pending} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#e6e2ec] bg-white px-4 text-sm font-black text-slate-600 disabled:opacity-30"><ArrowRight className="h-4 w-4"/> رجوع</button>
            {step < steps.length - 1 ? <button type="button" onClick={next} disabled={!canContinue} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5b3fd6] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">متابعة <ArrowLeft className="h-4 w-4"/></button> : <button type="submit" disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5b3fd6] px-5 text-sm font-black text-white disabled:bg-slate-300">{pending ? "جاري الإنشاء..." : "إنشاء هويتي"}<Sparkles className="h-4 w-4"/></button>}
          </div>
        </form>
      </div>
    </main>
  );
}

function Review({label,value}:{label:string;value:string}) { return <div className="flex items-start justify-between gap-4"><span className="text-slate-400">{label}</span><b className="max-w-[70%] text-left text-[#252a4a]" dir={label === "الرابط" ? "ltr" : undefined}>{value || "—"}</b></div>; }
