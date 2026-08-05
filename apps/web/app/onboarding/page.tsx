"use client";

import { useActionState, useState } from "react";
import { createBusinessFromOnboarding } from "../actions/business";
import { businessTypes } from "../lib/business-types";

const steps = [
  "اختيار نوع النشاط",
  "اسم النشاط",
  "اسم الرابط",
  "تفاصيل النشاط",
  "إعدادات العلامة",
  "مراجعة وإنشاء",
];

export default function OnboardingPage() {
  const [state, action, pending] = useActionState(createBusinessFromOnboarding, { error: "" });
  const [currentStep, setCurrentStep] = useState(0);
  const [businessType, setBusinessType] = useState("Cafe");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");

  const onContinue = () => setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  const onBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/5 p-5">
          <div className="text-sm text-indigo-300">HEE · التأسيس السريع</div>
          <h1 className="mt-2 text-3xl font-black">إنشاء نشاطك</h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="space-y-3">
              {steps.map((item, index) => (
                <div key={item} className={`rounded-2xl px-4 py-3 text-sm font-semibold ${index === currentStep ? "bg-indigo-500/20 text-indigo-200" : "bg-slate-900/60 text-slate-300"}`}>
                  {index + 1}. {item}
                </div>
              ))}
            </div>
          </aside>

          <form action={action} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
            {currentStep === 0 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black">اختر نوع النشاط</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {businessTypes.map((type) => (
                    <button key={type} type="button" onClick={() => { setBusinessType(type); onContinue(); }} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-right font-semibold hover:border-indigo-400">
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black">اسم النشاط</h2>
                <input name="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="مثال: Bean Point" required />
                <div className="flex gap-3">
                  <button type="button" onClick={onBack} className="rounded-2xl border border-white/10 px-4 py-3">رجوع</button>
                  <button type="button" onClick={onContinue} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">متابعة</button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black">اختر الرابط العام</h2>
                <div className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-slate-300">hee.sa/<span className="text-white">{slug || "your-slug"}</span></div>
                <input name="slug" value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="bean-point" required />
                <div className="flex gap-3">
                  <button type="button" onClick={onBack} className="rounded-2xl border border-white/10 px-4 py-3">رجوع</button>
                  <button type="button" onClick={onContinue} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">متابعة</button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black">تفاصيل النشاط</h2>
                <textarea name="description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="وصف النشاط" required />
                <div className="grid gap-4 md:grid-cols-2">
                  <input name="city" value={city} onChange={(e) => setCity(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="المدينة" required />
                  <input name="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="واتساب" required />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="الهاتف" required />
                  <input name="address" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="العنوان" required />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={onBack} className="rounded-2xl border border-white/10 px-4 py-3">رجوع</button>
                  <button type="button" onClick={onContinue} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">متابعة</button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black">إعدادات العلامة</h2>
                <input name="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" placeholder="رابط الشعار" />
                <input name="primaryColor" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} type="color" className="h-12 w-full rounded-2xl border border-white/10 bg-slate-900 px-2 py-2" />
                <div className="flex gap-3">
                  <button type="button" onClick={onBack} className="rounded-2xl border border-white/10 px-4 py-3">رجوع</button>
                  <button type="button" onClick={onContinue} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">متابعة</button>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-4">
                <h2 className="text-2xl font-black">مراجعة وإنشاء</h2>
                <div className="rounded-2xl bg-slate-900 p-4 text-sm text-slate-300">
                  <div>الاسم: {name}</div>
                  <div>النوع: {businessType}</div>
                  <div>الرابط: hee.sa/{slug}</div>
                </div>
                {state.error ? <p className="rounded-2xl bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{state.error}</p> : null}
                <div className="flex gap-3">
                  <button type="button" onClick={onBack} className="rounded-2xl border border-white/10 px-4 py-3">رجوع</button>
                  <button type="submit" disabled={pending} className="rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-bold">
                    {pending ? "جاري الإنشاء..." : "إنشاء النشاط"}
                  </button>
                </div>
              </div>
            )}

            <input type="hidden" name="businessType" value={businessType} />
          </form>
        </div>
      </div>
    </main>
  );
}
