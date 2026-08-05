"use client";

import { useActionState } from "react";
import {
  saveContactStepAction,
  saveLocationStepAction,
  type BuilderActionState,
} from "../../app/actions/page-builder";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

type ContactLinksData = {
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  googleMapsLink: string | null;
  address: string | null;
  country: string | null;
  city: string | null;
  district: string | null;
  xUrl: string | null;
  instagramUrl: string | null;
  snapchatUrl: string | null;
  tiktokUrl: string | null;
  facebookUrl: string | null;
};

const defaultState: BuilderActionState = {};

export function ContactLinksManager({ business }: { business: ContactLinksData }) {
  const [contactState, contactAction, contactPending] = useActionState(saveContactStepAction, defaultState);
  const [locationState, locationAction, locationPending] = useActionState(saveLocationStepAction, defaultState);

  return (
    <div className="space-y-6">
      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h2 className="text-2xl font-black text-white">بيانات التواصل</h2>
        <form action={contactAction} className="grid gap-3 lg:grid-cols-2">
          <input name="phone" defaultValue={business.phone ?? ""} placeholder="رقم الهاتف" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="whatsapp" defaultValue={business.whatsapp ?? ""} placeholder="رقم واتساب" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="email" defaultValue={business.email ?? ""} placeholder="البريد الإلكتروني" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="website" defaultValue={business.website ?? ""} placeholder="الموقع الإلكتروني" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />

          <input name="instagramUrl" defaultValue={business.instagramUrl ?? ""} placeholder="Instagram" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="tiktokUrl" defaultValue={business.tiktokUrl ?? ""} placeholder="TikTok" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="snapchatUrl" defaultValue={business.snapchatUrl ?? ""} placeholder="Snapchat" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="xUrl" defaultValue={business.xUrl ?? ""} placeholder="X" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="facebookUrl" defaultValue={business.facebookUrl ?? ""} placeholder="Facebook" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white lg:col-span-2" />

          {contactState.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">{contactState.error}</p> : null}
          {contactState.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 lg:col-span-2">{contactState.success}</p> : null}

          <div className="lg:col-span-2">
            <Button type="submit" disabled={contactPending}>{contactPending ? "جاري الحفظ..." : "حفظ بيانات التواصل"}</Button>
          </div>
        </form>
      </Card>

      <Card className="space-y-4 bg-slate-950/75" hoverLift={false}>
        <h2 className="text-2xl font-black text-white">الموقع والعنوان</h2>
        <form action={locationAction} className="grid gap-3 lg:grid-cols-2">
          <input name="country" defaultValue={business.country ?? "السعودية"} placeholder="الدولة" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="city" defaultValue={business.city ?? ""} placeholder="المدينة" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="district" defaultValue={business.district ?? ""} placeholder="الحي" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="address" defaultValue={business.address ?? ""} placeholder="العنوان" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white" />
          <input name="googleMapsLink" defaultValue={business.googleMapsLink ?? ""} placeholder="رابط Google Maps" dir="ltr" className="h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white lg:col-span-2" />

          {locationState.error ? <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 lg:col-span-2">{locationState.error}</p> : null}
          {locationState.success ? <p className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 lg:col-span-2">{locationState.success}</p> : null}

          <div className="lg:col-span-2">
            <Button type="submit" disabled={locationPending}>{locationPending ? "جاري الحفظ..." : "حفظ بيانات الموقع"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
