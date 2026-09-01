"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Link2, MapPin, MessageCircle, Sparkles } from "lucide-react";
import { businessTypes } from "../app/lib/business-types";

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function OnboardingClient() {
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

  const canContinue = useMemo(() => name.trim().length >= 2 && businessType.trim().length >= 2 && description.trim().length >= 8, [name, businessType, description]);
  const canCreate = useMemo(() => normalizeSlug(slug).length >= 4 && (whatsapp.trim().length >= 8 || phone.trim().length >= 8), [slug, whatsapp, phone]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (step === 0) {
      if (!canContinue) { setError("أكمل اسم المنشأة ونوع النشاط والنبذة."); return; }
      setError(""); setStep(1); return;
    }
    if (!canCreate || pending) { setError("اختر رابطًا صالحًا وأضف وسيلة تواصل واحدة على الأقل."); return; }
    setError(""); setPending(true);
    try {
      const response = await fetch("/api/business/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug: normalizeSlug(slug), businessType, entityType: businessType, businessCategory: businessType, description: description.trim(), shortDescription: description.trim(), city: city.trim(), whatsapp: whatsapp.trim(), phone: phone.trim(), primaryColor: "#6f3bd2", onboardingStep: "profile_created" }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string; redirectTo?: string };
      if (!response.ok) { if (response.status === 401) { router.push("/login"); return; } setError(result.error ?? "تعذر إنشاء الصفحة"); return; }
      router.push(result.redirectTo ?? "/dashboard?welcome=1"); router.refresh();
    } catch { setError("تعذر إنشاء الصفحة. حاول مرة أخرى."); }
    finally { setPending(false); }
  }

  return <main dir="rtl" className="min-h-screen bg-[linear-gradient(180deg,#fbfaff_0%,#fff_45%,#f8f6ff_100%)] text-[#1f2552]">
    <div className="mx-auto w-full max-w-[680px] px-4 py-7 sm:py-10">
      <div className="flex items-center justify-between"><div><div className="text-3xl font-black tracking-[-.08em] text-[#6f3bd2]">iR</div><p className="mt-1 text-xs font-bold text-slate-500">أنشئ هويتك الرقمية</p></div><span className="rounded-full border border-[#e5e0f3] bg-white px-3 py-1.5 text-[11px] font-black text-[#6543ce]" aria-label={`الخطوة ${step + 1} من 2`}>{step + 1} / 2</span></div>
      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[#ece8f6]" role="progressbar" aria-label="تقدم إعداد الصفحة" aria-valuemin={1} aria-valuemax={2} aria-valuenow={step + 1}><div className="h-full rounded-full bg-[#6f3bd2] transition-all duration-300" style={{ width: step === 0 ? "50%" : "100%" }} /></div>
      <form onSubmit={onSubmit} className="mt-6 rounded-[28px] border border-[#e9e5f1] bg-white p-5 shadow-[0_24px_70px_-50px_rgba(73,48,125,.45)] sm:p-7" aria-label="إعداد صفحة المنشأة">
        {step === 0 ? <section className="space-y-4"><div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><Building2 className="h-5 w-5" /></span><h1 className="mt-4 text-2xl font-black">صفحتك تبدأ من هنا</h1><p className="mt-1 text-sm text-slate-500">ثلاث معلومات فقط الآن. يمكنك تعديلها لاحقًا.</p></div><label className="block"><span className="mb-1.5 block text-sm font-black">اسم المنشأة</span><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="مثال: شركة الرواد للمقاولات" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc]" /></label><label className="block"><span className="mb-1.5 block text-sm font-black">نوع النشاط</span><select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc]">{businessTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label className="block"><span className="mb-1.5 block text-sm font-black">نبذة قصيرة</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ماذا تقدم منشأتك؟" className="min-h-[96px] w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 py-3 text-sm leading-6 outline-none focus:border-[#8b72dc]" /></label></section> : null}
        {step === 1 ? <section className="space-y-4"><div><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f1edff] text-[#6543ce]"><Link2 className="h-5 w-5" /></span><h1 className="mt-4 text-2xl font-black">الرابط والتواصل</h1><p className="mt-1 text-sm text-slate-500">اختر رابط صفحتك وأضف وسيلة تواصل واحدة على الأقل.</p></div><div className="rounded-2xl border border-[#e5e3ec] bg-[#faf9fd] px-4 py-3 text-sm font-bold text-slate-500" dir="ltr">ir.sa/<span className="text-[#6543ce]">{normalizeSlug(slug) || "your-business"}</span></div><label className="block"><span className="mb-1.5 block text-sm font-black">الرابط بالإنجليزية</span><input value={slug} onChange={(e) => setSlug(normalizeSlug(e.target.value))} dir="ltr" placeholder="alrowad" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-left text-sm outline-none focus:border-[#8b72dc]" /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-black">واتساب</span><div className="relative"><MessageCircle className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} dir="ltr" inputMode="tel" placeholder="+9665xxxxxxxx" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] pr-11 pl-4 text-sm outline-none focus:border-[#8b72dc]" /></div></label><label><span className="mb-1.5 block text-sm font-black">الهاتف <small className="font-normal text-slate-400">اختياري</small></span><input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" inputMode="tel" placeholder="05xxxxxxxx" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] px-4 text-sm outline-none focus:border-[#8b72dc]" /></label></div><label className="block"><span className="mb-1.5 block text-sm font-black">المدينة <small className="font-normal text-slate-400">اختياري</small></span><div className="relative"><MapPin className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><input value={city} onChange={(e) => setCity(e.target.value)} placeholder="الرياض" className="h-12 w-full rounded-2xl border border-[#e5e3ec] bg-[#fbfbfd] pr-11 pl-4 text-sm outline-none focus:border-[#8b72dc]" /></div></label></section> : null}
        {error ? <p role="alert" aria-live="assertive" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#efecf3] pt-5">{step === 1 ? <button type="button" onClick={() => { setError(""); setStep(0); }} disabled={pending} className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#e6e2ec] bg-white px-4 text-sm font-black text-slate-600"><ArrowRight className="h-4 w-4" />رجوع</button> : <span />}{step === 0 ? <button type="submit" disabled={!canContinue} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5b3fd6] px-5 text-sm font-black text-white disabled:bg-slate-300">متابعة<ArrowLeft className="h-4 w-4" /></button> : <button type="submit" disabled={!canCreate || pending} aria-busy={pending} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#5b3fd6] px-5 text-sm font-black text-white disabled:bg-slate-300">{pending ? "جاري الإنشاء..." : "إنشاء الصفحة"}<Sparkles className="h-4 w-4" /></button>}</div>
      </form>
    </div>
  </main>;
}