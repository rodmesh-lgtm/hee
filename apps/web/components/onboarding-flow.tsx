"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type BusinessLike = {
  id: string;
  name: string | null;
  entityType: string | null;
  businessCategory: string | null;
  city: string | null;
  description: string | null;
  whatsapp: string | null;
  slug: string | null;
};

type OnboardingFlowProps = {
  initialStep: "business" | "page-setup";
  initialBusiness: BusinessLike | null;
};

const entityOptions = ["مؤسسة", "شركة", "مكتب", "نشاط فردي", "متجر", "عيادة / مركز", "مطعم / مقهى", "أخرى"];
const categoryOptions = ["تجارة", "خدمات", "مطاعم ومقاهي", "صحة", "عقار", "تقنية", "استشارات", "مقاولات", "سيارات", "تجميل", "تعليم", "أخرى"];

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeWhatsapp(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) {
    return null;
  }

  let raw = digits;
  if (raw.startsWith("966")) {
    raw = raw.slice(3);
  }

  if (raw.startsWith("0")) {
    raw = raw.slice(1);
  }

  if (!raw.startsWith("5") || raw.length !== 9) {
    return null;
  }

  return `+966${raw}`;
}

export function OnboardingFlow({ initialStep, initialBusiness }: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<"business" | "page-setup">(initialStep);
  const [entityType, setEntityType] = useState(initialBusiness?.entityType ?? "");
  const [businessName, setBusinessName] = useState(initialBusiness?.name ?? "");
  const [businessCategory, setBusinessCategory] = useState(initialBusiness?.businessCategory ?? "");
  const [city, setCity] = useState(initialBusiness?.city ?? "");
  const [description, setDescription] = useState(initialBusiness?.description ?? "");
  const [whatsapp, setWhatsapp] = useState(initialBusiness?.whatsapp ?? "+966");
  const [slug, setSlug] = useState(initialBusiness?.slug ?? "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");

  const generatedSlug = useMemo(() => normalizeSlug(businessName || "business"), [businessName]);

  async function saveBusinessInfo() {
    if (!entityType) {
      setError("اختر نوع الكيان");
      return false;
    }

    if (!businessName.trim()) {
      setError("اسم النشاط مطلوب");
      return false;
    }

    if (!city.trim()) {
      setError("اختر المدينة");
      return false;
    }

    if (!businessCategory) {
      setError("اختر مجال النشاط");
      return false;
    }

    setError("");
    setPending(true);

    const response = await fetch("/api/business/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: businessName.trim(),
        entityType,
        businessCategory,
        city: city.trim(),
        slug: normalizeSlug(businessName.trim()) || undefined,
        onboardingStep: "business_details_completed",
      }),
    });

    const result = (await response.json()) as { error?: string; business?: { slug?: string } };
    setPending(false);

    if (!response.ok) {
      setError(result.error ?? "تعذر حفظ بيانات النشاط");
      return false;
    }

    setSlug(result.business?.slug ?? generatedSlug);
    setStep("page-setup");
    return true;
  }

  async function createPublicPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!businessName.trim()) {
      setError("اسم النشاط مطلوب");
      return;
    }

    if (!entityType) {
      setError("اختر نوع الكيان");
      return;
    }

    if (!city.trim()) {
      setError("اختر المدينة");
      return;
    }

    if (!businessCategory) {
      setError("اختر مجال النشاط");
      return;
    }

    if (!description.trim()) {
      setError("أدخل نبذة قصيرة عن النشاط");
      return;
    }

    const normalizedWhatsapp = normalizeWhatsapp(whatsapp);
    if (!normalizedWhatsapp) {
      setError("أدخل رقم واتساب صحيح");
      return;
    }

    const normalizedSlug = normalizeSlug(slug || businessName);
    if (!normalizedSlug) {
      setError("أدخل رابط الصفحة بشكل صحيح");
      return;
    }

    setError("");
    setPending(true);

    const response = await fetch("/api/business/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: businessName.trim(),
        entityType,
        businessCategory,
        city: city.trim(),
        description: description.trim(),
        whatsapp: normalizedWhatsapp,
        slug: normalizedSlug,
      }),
    });

    const result = (await response.json()) as { error?: string; publicUrl?: string };
    setPending(false);

    if (!response.ok) {
      setError(result.error ?? "تعذر إنشاء صفحتك");
      return;
    }

    router.push("/dashboard");
  }

  async function checkSlugAvailability(value: string) {
    const normalizedValue = normalizeSlug(value || businessName);
    if (!normalizedValue) {
      setSlugStatus("idle");
      return;
    }

    setSlugStatus("checking");
    const response = await fetch(`/api/business/check-slug?slug=${encodeURIComponent(normalizedValue)}`);
    const result = (await response.json()) as { available?: boolean };
    setSlugStatus(result.available ? "available" : "taken");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] text-slate-900" dir="rtl">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6 sm:px-6 sm:py-8">
        <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600 sm:text-xs">
            <span className="ml-2 text-emerald-600">{step === "business" ? "1 من 2" : "2 من 2"}</span>
            {step === "business" ? "أخبرنا عن نشاطك" : "جهّز صفحتك"}
          </div>
          <h1 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">{step === "business" ? "أخبرنا عن نشاطك" : "جهّز صفحتك"}</h1>
          <p className="mt-1 text-sm text-slate-600">{step === "business" ? "أدخل معلومات نشاطك الأساسية ثم انتقل إلى إنشاء صفحتك." : "بقيت خطوة واحدة لتصبح صفحتك جاهزة للمشاركة."}</p>
        </div>

        {step === "business" ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">نوع الكيان</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {entityOptions.map((option) => {
                    const selected = entityType === option;
                    return (
                      <button key={option} type="button" onClick={() => setEntityType(option)} className={`rounded-2xl border px-3 py-3 text-right text-sm font-semibold transition ${selected ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}>
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">اسم النشاط</span>
                <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none" placeholder="مثال: كانتابي" />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">المدينة</span>
                <input value={city} onChange={(event) => setCity(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none" placeholder="مثال: جدة" />
              </label>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">مجال النشاط</label>
                <div className="flex flex-wrap gap-2">
                  {categoryOptions.map((category) => {
                    const selected = businessCategory === category;
                    return (
                      <button key={category} type="button" onClick={() => setBusinessCategory(category)} className={`rounded-full border px-3 py-2 text-sm ${selected ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700"}`}>
                        {category}
                      </button>
                    );
                  })}
                </div>
              </div>

              {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

              <button type="button" disabled={pending} onClick={saveBusinessInfo} className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                {pending ? "جارٍ الحفظ..." : "التالي"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "page-setup" ? (
          <form onSubmit={createPublicPage} className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">اسم النشاط</span>
                <input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none" />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">نبذة قصيرة عن النشاط</span>
                <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none" placeholder="عرّف عملاءك بنشاطك وخدماتك باختصار." />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">رقم واتساب</span>
                <input value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none" dir="ltr" placeholder="+9665xxxxxxxx" />
              </label>

              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">رابط الصفحة</span>
                <input value={slug || generatedSlug} onChange={(event) => {
                  const nextValue = normalizeSlug(event.target.value);
                  setSlug(nextValue);
                  checkSlugAvailability(nextValue);
                }} className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none" dir="ltr" placeholder="my-business" />
                <p className="mt-2 text-sm text-slate-600">{slugStatus === "checking" ? "جارٍ التحقق..." : slugStatus === "available" ? "✓ الرابط متاح" : slugStatus === "taken" ? "✕ هذا الرابط مستخدم" : `مثال: hee.sa/${generatedSlug || "my-business"}`}</p>
              </label>

              <label className="block text-sm">
                <span className="mb-2 block font-semibold text-slate-700">الشعار (اختياري)</span>
                <input type="file" accept="image/*" className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-slate-900" />
              </label>

              {error ? <p className="rounded-2xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

              <button type="submit" disabled={pending} className="w-full rounded-2xl bg-[#0f172a] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                {pending ? "جارٍ الإنشاء..." : "إنشاء صفحتي"}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </main>
  );
}
