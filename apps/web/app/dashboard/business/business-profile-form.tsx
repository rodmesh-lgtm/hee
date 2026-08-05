"use client";

import Image from "next/image";
import { useActionState, useMemo, useState } from "react";
import { CheckCircle2, ImagePlus } from "lucide-react";
import { saveBusinessProfileAction, type ActionState } from "../../actions/business";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Textarea } from "../../../components/ui/textarea";
import { Button } from "../../../components/ui/button";

type BusinessProfileData = {
  name: string | null;
  nameEn: string | null;
  businessType: string | null;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  country: string | null;
  city: string | null;
  district: string | null;
  googleMapsLink: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
  snapchatUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
  workingHours: string | null;
  deliveryAvailable: boolean;
  bookingAvailable: boolean;
  acceptOnlineOrders: boolean;
  primaryColor: string | null;
  secondaryColor: string | null;
  buttonColor: string | null;
  slug: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  isPublished: boolean;
} | null;

const defaultState: ActionState = {
  error: "",
  success: "",
};

function readFilePreview(file: File, setter: (value: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    setter(typeof reader.result === "string" ? reader.result : "");
  };
  reader.readAsDataURL(file);
}

export function BusinessProfileForm({ business }: { business: BusinessProfileData }) {
  const [state, action, pending] = useActionState(saveBusinessProfileAction, defaultState);
  const [logoPreview, setLogoPreview] = useState(business?.logoUrl ?? "");
  const [coverPreview, setCoverPreview] = useState(business?.coverUrl ?? "");

  const defaults = useMemo(
    () => ({
      name: business?.name ?? "",
      nameEn: business?.nameEn ?? "",
      businessType: business?.businessType ?? "",
      description: business?.description ?? "",
      phone: business?.phone ?? "",
      whatsapp: business?.whatsapp ?? "",
      email: business?.email ?? "",
      website: business?.website ?? "",
      country: business?.country ?? "",
      city: business?.city ?? "",
      district: business?.district ?? "",
      googleMapsLink: business?.googleMapsLink ?? "",
      xUrl: business?.xUrl ?? "",
      instagramUrl: business?.instagramUrl ?? "",
      snapchatUrl: business?.snapchatUrl ?? "",
      tiktokUrl: business?.tiktokUrl ?? "",
      facebookUrl: business?.facebookUrl ?? "",
      workingHours: business?.workingHours ?? "",
      primaryColor: business?.primaryColor ?? "#5D43EF",
      secondaryColor: business?.secondaryColor ?? "#1E293B",
      buttonColor: business?.buttonColor ?? "#4F46E5",
      slug: business?.slug ?? "",
      metaTitle: business?.metaTitle ?? "",
      metaDescription: business?.metaDescription ?? "",
      deliveryAvailable: business?.deliveryAvailable ?? false,
      bookingAvailable: business?.bookingAvailable ?? false,
      acceptOnlineOrders: business?.acceptOnlineOrders ?? false,
      isPublished: business?.isPublished ?? false,
    }),
    [business],
  );

  return (
    <div className="space-y-6">
      {state.success ? (
        <div className="fixed left-4 top-4 z-50 rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm font-bold text-emerald-100 shadow-xl backdrop-blur">
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {state.success}
          </span>
        </div>
      ) : null}

      <form id="business-profile-form" action={action} className="space-y-6">
        <input type="hidden" name="logoUrl" value={logoPreview} />
        <input type="hidden" name="coverUrl" value={coverPreview} />

        <Card className="space-y-4" hoverLift={false}>
          <h2 className="text-xl font-black text-white">المعلومات الأساسية</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              اسم النشاط (عربي)
              <Input name="name" required defaultValue={defaults.name} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              اسم النشاط (English)
              <Input name="nameEn" required defaultValue={defaults.nameEn} dir="ltr" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">
              تصنيف النشاط
              <Input name="businessType" required defaultValue={defaults.businessType} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">
              وصف النشاط
              <Textarea name="description" required defaultValue={defaults.description} />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              رفع الشعار
              <Input
                type="file"
                accept="image/*"
                name="logoFile"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    readFilePreview(file, setLogoPreview);
                  }
                }}
              />
              {logoPreview ? (
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/10">
                  <Image src={logoPreview} alt="Logo preview" fill sizes="96px" className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="inline-flex h-24 w-24 items-center justify-center rounded-2xl border border-dashed border-white/15 text-slate-400">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
            </label>

            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              رفع صورة الغلاف
              <Input
                type="file"
                accept="image/*"
                name="coverFile"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) {
                    readFilePreview(file, setCoverPreview);
                  }
                }}
              />
              {coverPreview ? (
                <div className="relative h-24 w-full overflow-hidden rounded-2xl border border-white/10">
                  <Image src={coverPreview} alt="Cover preview" fill sizes="(max-width: 768px) 100vw, 420px" className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="inline-flex h-24 w-full items-center justify-center rounded-2xl border border-dashed border-white/15 text-slate-400">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
            </label>
          </div>
        </Card>

        <Card className="space-y-4" hoverLift={false}>
          <h2 className="text-xl font-black text-white">معلومات التواصل</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              الهاتف
              <Input name="phone" required defaultValue={defaults.phone} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              واتساب
              <Input name="whatsapp" required defaultValue={defaults.whatsapp} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              البريد الإلكتروني
              <Input name="email" type="email" required defaultValue={defaults.email} dir="ltr" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              الموقع الإلكتروني
              <Input name="website" defaultValue={defaults.website} dir="ltr" />
            </label>
          </div>
        </Card>

        <Card className="space-y-4" hoverLift={false}>
          <h2 className="text-xl font-black text-white">الموقع</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              الدولة
              <Input name="country" required defaultValue={defaults.country} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              المدينة
              <Input name="city" required defaultValue={defaults.city} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              الحي
              <Input name="district" required defaultValue={defaults.district} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              رابط Google Maps
              <Input name="googleMapsLink" defaultValue={defaults.googleMapsLink} dir="ltr" />
            </label>
          </div>
        </Card>

        <Card className="space-y-4" hoverLift={false}>
          <h2 className="text-xl font-black text-white">وسائل التواصل الاجتماعي</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              X
              <Input name="xUrl" defaultValue={defaults.xUrl} dir="ltr" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Instagram
              <Input name="instagramUrl" defaultValue={defaults.instagramUrl} dir="ltr" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              Snapchat
              <Input name="snapchatUrl" defaultValue={defaults.snapchatUrl} dir="ltr" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              TikTok
              <Input name="tiktokUrl" defaultValue={defaults.tiktokUrl} dir="ltr" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">
              Facebook
              <Input name="facebookUrl" defaultValue={defaults.facebookUrl} dir="ltr" />
            </label>
          </div>
        </Card>

        <Card className="space-y-4" hoverLift={false}>
          <h2 className="text-xl font-black text-white">إعدادات النشاط</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">
              ساعات العمل
              <Input name="workingHours" required defaultValue={defaults.workingHours} />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
              التوصيل متاح
              <input type="checkbox" name="deliveryAvailable" defaultChecked={defaults.deliveryAvailable} className="h-5 w-5 rounded border-white/20" />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
              الحجز متاح
              <input type="checkbox" name="bookingAvailable" defaultChecked={defaults.bookingAvailable} className="h-5 w-5 rounded border-white/20" />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white md:col-span-2">
              قبول الطلبات أونلاين
              <input type="checkbox" name="acceptOnlineOrders" defaultChecked={defaults.acceptOnlineOrders} className="h-5 w-5 rounded border-white/20" />
            </label>
          </div>
        </Card>

        <Card className="space-y-4" hoverLift={false}>
          <h2 className="text-xl font-black text-white">الهوية البصرية</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              اللون الأساسي
              <Input type="color" name="primaryColor" required defaultValue={defaults.primaryColor} className="h-12 p-2" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              اللون الثانوي
              <Input type="color" name="secondaryColor" required defaultValue={defaults.secondaryColor} className="h-12 p-2" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              لون الأزرار
              <Input type="color" name="buttonColor" required defaultValue={defaults.buttonColor} className="h-12 p-2" />
            </label>
          </div>
        </Card>

        <Card className="space-y-4" hoverLift={false}>
          <h2 className="text-xl font-black text-white">تهيئة SEO والنشر</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-200">
              الرابط العام (Slug)
              <Input name="slug" required defaultValue={defaults.slug} dir="ltr" />
            </label>
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white">
              نشر الصفحة العامة
              <input type="checkbox" name="isPublished" defaultChecked={defaults.isPublished} className="h-5 w-5 rounded border-white/20" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">
              Meta Title
              <Input name="metaTitle" required defaultValue={defaults.metaTitle} />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-200 md:col-span-2">
              Meta Description
              <Textarea name="metaDescription" required defaultValue={defaults.metaDescription} className="min-h-[100px]" />
            </label>
          </div>
        </Card>

        {state.error ? <p className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">{state.error}</p> : null}

        <div className="flex justify-start">
          <Button type="submit" size="lg" disabled={pending} icon={<CheckCircle2 className="h-5 w-5" />}>
            {pending ? "جاري حفظ الملف..." : "حفظ ملف النشاط"}
          </Button>
        </div>
      </form>
    </div>
  );
}
