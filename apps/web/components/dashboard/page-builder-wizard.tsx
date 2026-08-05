"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import type { Prisma } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  addGalleryItemBuilderAction,
  addOfferBuilderAction,
  addProductBuilderAction,
  addServiceBuilderAction,
  checkSlugAvailabilityAction,
  deleteGalleryItemBuilderAction,
  deleteOfferBuilderAction,
  deleteProductBuilderAction,
  deleteServiceBuilderAction,
  publishBusinessAction,
  saveBrandingStepAction,
  saveContactStepAction,
  saveIdentityStepAction,
  saveLocationStepAction,
  saveSlugStepAction,
  saveWorkingHoursStepAction,
  updateOfferBuilderAction,
  updateGalleryItemBuilderAction,
  updateProductBuilderAction,
  updateServiceBuilderAction,
  type BuilderActionState,
} from "../../app/actions/page-builder";
import { PublicShareButton } from "../public/public-share-button";
import { PublicQrCard } from "../public/public-qr-card";

const stepLabels = [
  "هوية النشاط",
  "الرابط العام",
  "التواصل",
  "الموقع",
  "ساعات العمل",
  "المنتجات",
  "الخدمات",
  "العروض",
  "المعرض",
  "الهوية البصرية",
  "المراجعة",
];

const dayNames = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];

type BuilderBusiness = Prisma.BusinessGetPayload<{
  include: {
    products: { include: { category: true } };
    services: true;
    offers: true;
    openingHours: true;
    galleryItems: true;
    socialLinks: true;
  };
}>;

type WizardProps = {
  business: BuilderBusiness | null;
  completion: number;
  publicUrl: string | null;
};

const defaultActionState: BuilderActionState = {};

function toInputDate(value: Date | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function suggestSlug(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function PageBuilderWizard({ business, completion, publicUrl }: WizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [slugDraft, setSlugDraft] = useState(() => business?.slug ?? suggestSlug(business?.name ?? ""));
  const [slugState, setSlugState] = useState<{ checking: boolean; available: boolean | null; message: string }>({
    checking: false,
    available: null,
    message: "",
  });
  const [checkingSlug, startCheckingSlug] = useTransition();

  const [identityState, identityAction, identityPending] = useActionState(saveIdentityStepAction, defaultActionState);
  const [slugSaveState, slugSaveAction, slugSavePending] = useActionState(saveSlugStepAction, defaultActionState);
  const [contactState, contactAction, contactPending] = useActionState(saveContactStepAction, defaultActionState);
  const [locationState, locationAction, locationPending] = useActionState(saveLocationStepAction, defaultActionState);
  const [hoursState, hoursAction, hoursPending] = useActionState(saveWorkingHoursStepAction, defaultActionState);
  const [addProductState, addProductAction, addProductPending] = useActionState(addProductBuilderAction, defaultActionState);
  const [addServiceState, addServiceAction, addServicePending] = useActionState(addServiceBuilderAction, defaultActionState);
  const [addOfferState, addOfferAction, addOfferPending] = useActionState(addOfferBuilderAction, defaultActionState);
  const [addGalleryState, addGalleryAction, addGalleryPending] = useActionState(addGalleryItemBuilderAction, defaultActionState);
  const [brandingState, brandingAction, brandingPending] = useActionState(saveBrandingStepAction, defaultActionState);
  const [publishState, publishAction, publishPending] = useActionState(publishBusinessAction, defaultActionState);

  const [hours, setHours] = useState(
    dayNames.map((_, dayOfWeek) => {
      const existing = business?.openingHours.find((item) => item.dayOfWeek === dayOfWeek);
      return {
        dayOfWeek,
        isClosed: existing?.isClosed ?? false,
        opensAt: existing?.opensAt ?? "09:00",
        closesAt: existing?.closesAt ?? "23:00",
        secondOpensAt: existing?.secondOpensAt ?? "",
        secondClosesAt: existing?.secondClosesAt ?? "",
      };
    }),
  );

  const review = useMemo(() => {
    const contactCount = [business?.whatsapp, business?.phone, business?.email, business?.website].filter(Boolean).length;
    return {
      businessName: business?.name ?? "غير مكتمل",
      logo: business?.logoUrl ?? null,
      productsCount: business?.products.length ?? 0,
      servicesCount: business?.services.length ?? 0,
      offersCount: business?.offers.length ?? 0,
      location: [business?.country, business?.city, business?.district].filter(Boolean).join(" - ") || "غير مكتمل",
      workingHoursCount: business?.openingHours.length ?? 0,
      slug: business?.slug ?? "",
      contactCount,
    };
  }, [business]);

  const reviewChecks = useMemo(
    () => [
      { label: "اسم النشاط", done: Boolean(business?.name?.trim()) },
      { label: "الرابط العام", done: Boolean(business?.slug?.trim()) },
      { label: "وسيلة تواصل واحدة على الأقل", done: review.contactCount > 0 },
      { label: "المدينة والحي والعنوان", done: Boolean(business?.city && business?.district && business?.address) },
      { label: "تحديد ساعات العمل", done: review.workingHoursCount > 0 },
    ],
    [business?.address, business?.city, business?.district, business?.name, business?.slug, review.contactCount, review.workingHoursCount],
  );

  const slugStatusClass =
    slugState.available === null
      ? "text-slate-300"
      : slugState.available
        ? "text-emerald-300"
        : "text-rose-300";

  async function checkSlug() {
    const value = slugDraft.trim();
    if (!value) {
      setSlugState({ checking: false, available: null, message: "أدخل الرابط أولاً" });
      return;
    }

    setSlugState((current) => ({ ...current, checking: true }));
    startCheckingSlug(async () => {
      const result = await checkSlugAvailabilityAction(value, business?.id);
      setSlugDraft(result.normalized);
      setSlugState({ checking: false, available: result.available, message: result.message });
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr_420px]">
      <aside className="rounded-3xl border border-white/10 bg-slate-950/70 p-4">
        <div className="mb-4 text-sm font-bold text-slate-300">خطوات البناء</div>
        <div className="space-y-2">
          {stepLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className={`w-full rounded-2xl px-3 py-2 text-right text-sm font-semibold ${step === index ? "bg-indigo-500/20 text-indigo-100" : "bg-white/5 text-slate-300"}`}
            >
              {index + 1}. {label}
            </button>
          ))}
        </div>
      </aside>

      <section className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black text-white">{stepLabels[step]}</h2>
          <div className="text-sm text-slate-400">حالة الملف: {completion}%</div>
        </div>

        {step === 0 ? (
          <form action={identityAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-200">
                اسم النشاط
                <input name="name" required defaultValue={business?.name ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                الاسم الإنجليزي (اختياري)
                <input name="nameEn" defaultValue={business?.nameEn ?? ""} dir="ltr" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              </label>
            </div>
            <label className="grid gap-2 text-sm text-slate-200">
              نوع النشاط
              <input name="businessType" required defaultValue={business?.businessType ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-200">
              وصف مختصر
              <textarea name="shortDescription" required defaultValue={business?.shortDescription ?? ""} className="min-h-20 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
            </label>
            <label className="grid gap-2 text-sm text-slate-200">
              وصف كامل
              <textarea name="description" required defaultValue={business?.description ?? ""} className="min-h-28 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-200">
                الشعار
                <input type="file" name="logoFile" accept="image/*" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                الغلاف
                <input type="file" name="coverFile" accept="image/*" className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              </label>
            </div>
            {identityState.error ? <p className="text-sm text-rose-300">{identityState.error}</p> : null}
            {identityState.success ? <p className="text-sm text-emerald-300">{identityState.success}</p> : null}
            <button disabled={identityPending} className="rounded-2xl bg-indigo-600 px-4 py-3 font-bold disabled:opacity-60">{identityPending ? "جاري الحفظ..." : "حفظ الهوية"}</button>
          </form>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <form action={slugSaveAction} className="space-y-4">
              <label className="grid gap-2 text-sm text-slate-200">
                الرابط العام
                <div className="flex items-center gap-2" dir="ltr">
                  <span className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-300">hee.sa/b/</span>
                  <input
                    name="slug"
                    value={slugDraft}
                    onChange={(event) => setSlugDraft(event.target.value)}
                    className="flex-1 rounded-2xl border border-white/10 bg-slate-900 px-4 py-3"
                  />
                </div>
              </label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={checkSlug} className="rounded-2xl border border-white/20 px-4 py-2 text-sm font-semibold">
                  {checkingSlug || slugState.checking ? "جاري الفحص..." : "فحص التوفر"}
                </button>
                <span className={`text-sm ${slugStatusClass}`}>{slugState.message || ""}</span>
              </div>
              {slugSaveState.error ? <p className="text-sm text-rose-300">{slugSaveState.error}</p> : null}
              {slugSaveState.success ? <p className="text-sm text-emerald-300">{slugSaveState.success}</p> : null}
              <button disabled={slugSavePending} className="rounded-2xl bg-indigo-600 px-4 py-3 font-bold disabled:opacity-60">{slugSavePending ? "جاري الحفظ..." : "حفظ الرابط"}</button>
            </form>
          </div>
        ) : null}

        {step === 2 ? (
          <form action={contactAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input name="whatsapp" placeholder="واتساب" defaultValue={business?.whatsapp ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="phone" placeholder="الهاتف" defaultValue={business?.phone ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="email" placeholder="البريد الإلكتروني" defaultValue={business?.email ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" dir="ltr" />
              <input name="website" placeholder="الموقع" defaultValue={business?.website ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" dir="ltr" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input name="instagramUrl" placeholder="Instagram" defaultValue={business?.instagramUrl ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" dir="ltr" />
              <input name="tiktokUrl" placeholder="TikTok" defaultValue={business?.tiktokUrl ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" dir="ltr" />
              <input name="snapchatUrl" placeholder="Snapchat" defaultValue={business?.snapchatUrl ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" dir="ltr" />
              <input name="xUrl" placeholder="X" defaultValue={business?.xUrl ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" dir="ltr" />
              <input name="facebookUrl" placeholder="Facebook" defaultValue={business?.facebookUrl ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 md:col-span-2" dir="ltr" />
            </div>
            {contactState.error ? <p className="text-sm text-rose-300">{contactState.error}</p> : null}
            {contactState.success ? <p className="text-sm text-emerald-300">{contactState.success}</p> : null}
            <button disabled={contactPending} className="rounded-2xl bg-indigo-600 px-4 py-3 font-bold disabled:opacity-60">{contactPending ? "جاري الحفظ..." : "حفظ التواصل"}</button>
          </form>
        ) : null}

        {step === 3 ? (
          <form action={locationAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input name="country" placeholder="الدولة" defaultValue={business?.country ?? "السعودية"} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="city" placeholder="المدينة" defaultValue={business?.city ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="district" placeholder="الحي" defaultValue={business?.district ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
              <input name="address" placeholder="العنوان" defaultValue={business?.address ?? ""} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" />
            </div>
            <input name="googleMapsLink" placeholder="رابط Google Maps" defaultValue={business?.googleMapsLink ?? ""} className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3" dir="ltr" />
            {locationState.error ? <p className="text-sm text-rose-300">{locationState.error}</p> : null}
            {locationState.success ? <p className="text-sm text-emerald-300">{locationState.success}</p> : null}
            <button disabled={locationPending} className="rounded-2xl bg-indigo-600 px-4 py-3 font-bold disabled:opacity-60">{locationPending ? "جاري الحفظ..." : "حفظ الموقع"}</button>
          </form>
        ) : null}

        {step === 4 ? (
          <form action={hoursAction} className="space-y-4">
            <input type="hidden" name="hoursJson" value={JSON.stringify(hours.map((item) => ({ ...item, secondOpensAt: item.secondOpensAt || null, secondClosesAt: item.secondClosesAt || null })))} />
            <div className="space-y-3">
              {hours.map((hour, index) => (
                <div key={hour.dayOfWeek} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-bold text-white">{dayNames[index]}</p>
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={hour.isClosed}
                        onChange={(event) =>
                          setHours((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, isClosed: event.target.checked } : row)))
                        }
                      />
                      مغلق
                    </label>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <input
                      type="time"
                      value={hour.opensAt}
                      disabled={hour.isClosed}
                      onChange={(event) => setHours((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, opensAt: event.target.value } : row)))}
                      className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                    />
                    <input
                      type="time"
                      value={hour.closesAt}
                      disabled={hour.isClosed}
                      onChange={(event) => setHours((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, closesAt: event.target.value } : row)))}
                      className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                    />
                    <input
                      type="time"
                      value={hour.secondOpensAt}
                      disabled={hour.isClosed}
                      onChange={(event) => setHours((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, secondOpensAt: event.target.value } : row)))}
                      className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                      placeholder="بداية الفترة الثانية"
                    />
                    <input
                      type="time"
                      value={hour.secondClosesAt}
                      disabled={hour.isClosed}
                      onChange={(event) => setHours((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, secondClosesAt: event.target.value } : row)))}
                      className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2"
                      placeholder="نهاية الفترة الثانية"
                    />
                  </div>
                </div>
              ))}
            </div>
            {hoursState.error ? <p className="text-sm text-rose-300">{hoursState.error}</p> : null}
            {hoursState.success ? <p className="text-sm text-emerald-300">{hoursState.success}</p> : null}
            <button disabled={hoursPending} className="rounded-2xl bg-indigo-600 px-4 py-3 font-bold disabled:opacity-60">{hoursPending ? "جاري الحفظ..." : "حفظ ساعات العمل"}</button>
          </form>
        ) : null}

        {step === 5 ? (
          <div className="space-y-4">
            <form action={addProductAction} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <input name="name" placeholder="اسم المنتج" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
              <textarea name="description" placeholder="الوصف" className="min-h-20 rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
              <div className="grid gap-2 md:grid-cols-3">
                <input name="categoryName" placeholder="التصنيف" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                <input name="unit" placeholder="الوحدة (اختياري)" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                <input name="price" type="number" min="0" placeholder="السعر" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
                <input name="oldPrice" type="number" min="0" placeholder="السعر قبل الخصم" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <input name="sortOrder" type="number" min="0" placeholder="ترتيب العرض" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" defaultValue="0" />
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"><input type="checkbox" name="isActive" defaultChecked /> متاح</label>
                <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"><input type="checkbox" name="featured" /> مميز</label>
              </div>
              <input name="imageFile" type="file" accept="image/*" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              {addProductState.error ? <p className="text-sm text-rose-300">{addProductState.error}</p> : null}
              {addProductState.success ? <p className="text-sm text-emerald-300">{addProductState.success}</p> : null}
              <button disabled={addProductPending} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold">{addProductPending ? "جاري الإضافة..." : "إضافة منتج"}</button>
            </form>

            <div className="space-y-3">
              {business?.products.map((product) => (
                <form
                  key={product.id}
                  action={async (formData) => {
                    await updateProductBuilderAction(formData);
                    router.refresh();
                  }}
                  className="grid gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-3"
                >
                  <input type="hidden" name="productId" value={product.id} />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input name="name" defaultValue={product.name} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="categoryName" defaultValue={product.category?.name ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="unit" defaultValue={product.unit ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" placeholder="الوحدة" />
                  </div>
                  <textarea name="description" defaultValue={product.description ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  <div className="grid gap-2 md:grid-cols-4">
                    <input name="price" type="number" min="0" defaultValue={product.price} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="oldPrice" type="number" min="0" defaultValue={product.oldPrice ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="sortOrder" type="number" min="0" defaultValue={product.sortOrder} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="imageFile" type="file" accept="image/*" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="isActive" defaultChecked={product.isActive} /> متاح</label>
                    <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="featured" defaultChecked={product.featured} /> مميز</label>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-xl bg-white/10 px-3 py-2 text-sm">حفظ التعديل</button>
                    <button
                      formAction={async (formData) => {
                        await deleteProductBuilderAction(formData);
                        router.refresh();
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                    >
                      حذف
                    </button>
                  </div>
                </form>
              ))}
              {business?.products.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">لا توجد منتجات بعد</p> : null}
            </div>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-4">
            <form action={addServiceAction} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <input name="name" placeholder="اسم الخدمة" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
              <textarea name="description" placeholder="الوصف" className="min-h-20 rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
              <div className="grid gap-2 md:grid-cols-3">
                <input name="price" type="number" min="0" placeholder="السعر" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
                <input name="durationMinutes" type="number" min="0" placeholder="المدة بالدقائق" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                <input name="sortOrder" type="number" min="0" placeholder="ترتيب العرض" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" defaultValue="0" />
              </div>
              <input name="imageFile" type="file" accept="image/*" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="bookingEnabled" defaultChecked /> الحجز مفعل</label>
                <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="isActive" defaultChecked /> متاح</label>
              </div>
              {addServiceState.error ? <p className="text-sm text-rose-300">{addServiceState.error}</p> : null}
              {addServiceState.success ? <p className="text-sm text-emerald-300">{addServiceState.success}</p> : null}
              <button disabled={addServicePending} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold">{addServicePending ? "جاري الإضافة..." : "إضافة خدمة"}</button>
            </form>

            <div className="space-y-3">
              {business?.services.map((service) => (
                <form
                  key={service.id}
                  action={async (formData) => {
                    await updateServiceBuilderAction(formData);
                    router.refresh();
                  }}
                  className="grid gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-3"
                >
                  <input type="hidden" name="serviceId" value={service.id} />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input name="name" defaultValue={service.name} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="price" type="number" min="0" defaultValue={service.price} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  </div>
                  <textarea name="description" defaultValue={service.description ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  <div className="grid gap-2 md:grid-cols-3">
                    <input name="durationMinutes" type="number" min="0" defaultValue={service.durationMinutes ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="sortOrder" type="number" min="0" defaultValue={service.sortOrder} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="imageFile" type="file" accept="image/*" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="bookingEnabled" defaultChecked={service.bookingEnabled} /> الحجز مفعل</label>
                    <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="isActive" defaultChecked={service.isActive} /> متاح</label>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-xl bg-white/10 px-3 py-2 text-sm">حفظ التعديل</button>
                    <button
                      formAction={async (formData) => {
                        await deleteServiceBuilderAction(formData);
                        router.refresh();
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                    >
                      حذف
                    </button>
                  </div>
                </form>
              ))}
              {business?.services.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">لا توجد خدمات بعد</p> : null}
            </div>
          </div>
        ) : null}

        {step === 7 ? (
          <div className="space-y-4">
            <form action={addOfferAction} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <input name="title" placeholder="عنوان العرض" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
              <textarea name="description" placeholder="الوصف" className="min-h-20 rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
              <div className="grid gap-2 md:grid-cols-4">
                <input name="discountLabel" placeholder="الخصم" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" required />
                <input type="date" name="startsAt" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                <input type="date" name="endsAt" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                <input name="sortOrder" type="number" min="0" defaultValue="0" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              </div>
              <input type="file" name="imageFile" accept="image/*" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="isActive" defaultChecked /> نشط</label>
              {addOfferState.error ? <p className="text-sm text-rose-300">{addOfferState.error}</p> : null}
              {addOfferState.success ? <p className="text-sm text-emerald-300">{addOfferState.success}</p> : null}
              <button disabled={addOfferPending} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold">{addOfferPending ? "جاري الإضافة..." : "إضافة عرض"}</button>
            </form>

            <div className="space-y-3">
              {business?.offers.map((offer) => (
                <form
                  key={offer.id}
                  action={async (formData) => {
                    await updateOfferBuilderAction(formData);
                    router.refresh();
                  }}
                  className="grid gap-2 rounded-2xl border border-white/10 bg-slate-900/50 p-3"
                >
                  <input type="hidden" name="offerId" value={offer.id} />
                  <div className="grid gap-2 md:grid-cols-2">
                    <input name="title" defaultValue={offer.title} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="discountLabel" defaultValue={offer.discountLabel ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  </div>
                  <textarea name="description" defaultValue={offer.description ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  <div className="grid gap-2 md:grid-cols-4">
                    <input type="date" name="startsAt" defaultValue={toInputDate(offer.startsAt)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input type="date" name="endsAt" defaultValue={toInputDate(offer.endsAt)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input name="sortOrder" type="number" min="0" defaultValue={offer.sortOrder} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                    <input type="file" name="imageFile" accept="image/*" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="isActive" defaultChecked={offer.isActive} /> نشط</label>
                  <div className="flex gap-2">
                    <button className="rounded-xl bg-white/10 px-3 py-2 text-sm">حفظ التعديل</button>
                    <button
                      formAction={async (formData) => {
                        await deleteOfferBuilderAction(formData);
                        router.refresh();
                      }}
                      className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                    >
                      حذف
                    </button>
                  </div>
                </form>
              ))}
              {business?.offers.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400">لا توجد عروض بعد</p> : null}
            </div>
          </div>
        ) : null}

        {step === 8 ? (
          <div className="space-y-4">
            <form action={addGalleryAction} className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <input type="file" name="imageFile" accept="image/*" required className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              <input name="caption" placeholder="وصف الصورة (اختياري)" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              <input name="sortOrder" type="number" min="0" defaultValue="0" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2" />
              {addGalleryState.error ? <p className="text-sm text-rose-300">{addGalleryState.error}</p> : null}
              {addGalleryState.success ? <p className="text-sm text-emerald-300">{addGalleryState.success}</p> : null}
              <button disabled={addGalleryPending} className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold">{addGalleryPending ? "جاري الإضافة..." : "إضافة صورة"}</button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2">
              {business?.galleryItems.map((item) => (
                <form
                  key={item.id}
                  action={async (formData) => {
                    await updateGalleryItemBuilderAction(formData);
                    router.refresh();
                  }}
                  className="rounded-2xl border border-white/10 bg-slate-900/50 p-3"
                >
                  <input type="hidden" name="galleryItemId" value={item.id} />
                  <img src={item.imageUrl} alt={item.caption ?? "gallery"} className="h-36 w-full rounded-xl object-cover" />
                  <div className="mt-2 grid gap-2">
                    <input name="caption" defaultValue={item.caption ?? ""} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm" placeholder="وصف الصورة" />
                    <input name="sortOrder" type="number" min="0" defaultValue={item.sortOrder} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm" />
                    <label className="flex items-center gap-2 text-xs text-slate-300"><input type="checkbox" name="isActive" defaultChecked={item.isActive} /> نشطة</label>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-sm">حفظ</button>
                    <button
                      formAction={async (formData) => {
                        await deleteGalleryItemBuilderAction(formData);
                        router.refresh();
                      }}
                      className="flex-1 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
                    >
                      حذف
                    </button>
                  </div>
                </form>
              ))}
              {business?.galleryItems.length === 0 ? <p className="rounded-2xl border border-dashed border-white/10 p-4 text-center text-sm text-slate-400 sm:col-span-2">لا توجد صور في المعرض</p> : null}
            </div>
          </div>
        ) : null}

        {step === 9 ? (
          <form action={brandingAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-2 text-sm text-slate-200">اللون الأساسي<input type="color" name="primaryColor" defaultValue={business?.primaryColor ?? "#5D43EF"} className="h-12 rounded-2xl border border-white/10 bg-slate-900 p-2" /></label>
              <label className="grid gap-2 text-sm text-slate-200">اللون الثانوي<input type="color" name="secondaryColor" defaultValue={business?.secondaryColor ?? "#1E293B"} className="h-12 rounded-2xl border border-white/10 bg-slate-900 p-2" /></label>
              <label className="grid gap-2 text-sm text-slate-200">لون الأزرار<input type="color" name="buttonColor" defaultValue={business?.buttonColor ?? "#4F46E5"} className="h-12 rounded-2xl border border-white/10 bg-slate-900 p-2" /></label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-slate-200">
                نمط الأزرار
                <select name="buttonStyle" defaultValue={business?.buttonStyle ?? "rounded"} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                  <option value="rounded">Rounded</option>
                  <option value="pill">Pill</option>
                  <option value="square">Square</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm text-slate-200">
                نمط البطاقات
                <select name="cardStyle" defaultValue={business?.cardStyle ?? "glass"} className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3">
                  <option value="glass">Glass</option>
                  <option value="flat">Flat</option>
                  <option value="elevated">Elevated</option>
                </select>
              </label>
            </div>
            {brandingState.error ? <p className="text-sm text-rose-300">{brandingState.error}</p> : null}
            {brandingState.success ? <p className="text-sm text-emerald-300">{brandingState.success}</p> : null}
            <button disabled={brandingPending} className="rounded-2xl bg-indigo-600 px-4 py-3 font-bold disabled:opacity-60">{brandingPending ? "جاري الحفظ..." : "حفظ الهوية البصرية"}</button>
          </form>
        ) : null}

        {step === 10 ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
                <div>
                  <p className="text-slate-400">اسم النشاط</p>
                  <p className="font-bold text-white">{review.businessName}</p>
                </div>
                <div>
                  <p className="text-slate-400">الرابط العام</p>
                  <p className="font-bold text-white" dir="ltr">{review.slug ? `hee.sa/b/${review.slug}` : "غير مكتمل"}</p>
                </div>
                <div><p className="text-slate-400">المنتجات</p><p className="font-bold text-white">{review.productsCount}</p></div>
                <div><p className="text-slate-400">الخدمات</p><p className="font-bold text-white">{review.servicesCount}</p></div>
                <div><p className="text-slate-400">العروض</p><p className="font-bold text-white">{review.offersCount}</p></div>
                <div><p className="text-slate-400">اكتمال التواصل</p><p className="font-bold text-white">{review.contactCount}/4</p></div>
                <div><p className="text-slate-400">الموقع</p><p className="font-bold text-white">{review.location}</p></div>
                <div><p className="text-slate-400">أيام العمل المحددة</p><p className="font-bold text-white">{review.workingHoursCount}</p></div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-3 text-sm font-bold text-slate-200">التحقق قبل النشر</p>
              <div className="space-y-2 text-sm">
                {reviewChecks.map((check) => (
                  <div key={check.label} className="flex items-center justify-between rounded-xl bg-slate-900/50 px-3 py-2">
                    <span className="text-slate-200">{check.label}</span>
                    <span className={check.done ? "text-emerald-300" : "text-rose-300"}>{check.done ? "مكتمل" : "غير مكتمل"}</span>
                  </div>
                ))}
              </div>
            </div>

            <form action={publishAction} className="space-y-3">
              {publishState.error ? <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">{publishState.error}</p> : null}
              {publishState.success ? <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">{publishState.success}</p> : null}
              <button disabled={publishPending} className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-500 px-4 py-3 text-base font-black disabled:opacity-60">{publishPending ? "جاري النشر..." : "نشر الصفحة"}</button>
            </form>

            {business?.isPublished && publicUrl ? (
              <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <p className="font-bold text-emerald-200">مبروك، صفحتك أصبحت جاهزة لاستقبال العملاء</p>
                <p className="text-sm text-slate-200" dir="ltr">{publicUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={publicUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-white/10 px-3 py-2 text-sm">زيارة الصفحة</a>
                  <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)} className="rounded-xl bg-white/10 px-3 py-2 text-sm">نسخ الرابط</button>
                  <PublicShareButton title={business.name} text={business.shortDescription || business.description || business.businessType} url={publicUrl} />
                  <button type="button" onClick={() => router.push("/dashboard")} className="rounded-xl bg-white/10 px-3 py-2 text-sm">الذهاب إلى لوحة التحكم</button>
                </div>
                <PublicQrCard qrDataUrl={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(publicUrl)}`} publicUrl={publicUrl} />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-white/10 pt-3">
          <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-xl border border-white/20 px-3 py-2 text-sm">السابق</button>
          <button type="button" onClick={() => setStep((value) => Math.min(stepLabels.length - 1, value + 1))} className="rounded-xl border border-white/20 px-3 py-2 text-sm">التالي</button>
        </div>
      </section>

      <aside className="space-y-4 rounded-3xl border border-white/10 bg-slate-950/70 p-4">
        <h3 className="text-lg font-black text-white">المعاينة المباشرة</h3>
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/40 p-2">
          {business?.slug ? (
            <iframe src={`/b/${business.slug}`} className="h-[640px] w-full rounded-[22px] border border-white/10 bg-slate-950" title="public-page-preview" />
          ) : (
            <div className="flex h-[640px] items-center justify-center rounded-[22px] border border-dashed border-white/10 text-sm text-slate-400">
              احفظ الهوية أولاً ليظهر الرابط والمعاينة
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
