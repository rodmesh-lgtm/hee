"use client";

import { Headset, MapPin, MessageCircle, MoreHorizontal, Phone } from "lucide-react";

type Props = {
  whatsapp?: string | null;
  phone?: string | null;
  mapHref?: string | null;
  hasContacts?: boolean;
  hasAbout?: boolean;
};

const validPhone = (value?: string | null) => {
  const d = String(value ?? "").replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15 ? d : null;
};

export function PublicV3MobileDock({ whatsapp, phone, mapHref, hasContacts }: Props) {
  const wa = validPhone(whatsapp);
  const tel = validPhone(phone);
  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) { await navigator.share({ title: document.title, url }); return; }
      await navigator.clipboard.writeText(url);
    } catch {}
  };

  return (
    <nav aria-label="إجراءات المنشأة" className="fixed inset-x-0 bottom-0 z-[90] px-3 pt-2 md:hidden" style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}>
      <div className="mx-auto max-w-[430px] rounded-[24px] border border-[#e2e8e5] bg-white/95 px-2 py-1.5 shadow-[0_-10px_35px_-20px_rgba(0,45,32,.45)] backdrop-blur-xl">
        <div className="grid grid-cols-5 items-end gap-1">
          <a href={hasContacts ? "#hee-contact-directory" : "#"} aria-disabled={!hasContacts} className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[15px] text-[8px] font-black ${hasContacts ? "text-[#4d5652]" : "pointer-events-none text-[#c2c9c6]"}`}><Headset className="h-[18px] w-[18px]" /><span>التواصل</span></a>
          <a href={tel ? `tel:${tel}` : "#"} aria-disabled={!tel} className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[15px] text-[8px] font-black ${tel ? "text-[#4d5652]" : "pointer-events-none text-[#c2c9c6]"}`}><Phone className="h-[18px] w-[18px]" /><span>اتصال</span></a>
          <a href={wa ? `https://wa.me/${wa}` : "#"} target={wa ? "_blank" : undefined} rel={wa ? "noreferrer noopener" : undefined} aria-disabled={!wa} className={`-mt-5 flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[20px] border-4 border-white text-[8px] font-black shadow-[0_12px_26px_-14px_rgba(0,150,98,.85)] ${wa ? "bg-[#08a56f] text-white" : "pointer-events-none bg-[#dce5e1] text-white"}`}><span className="grid h-8 w-8 place-items-center rounded-full bg-white/15"><MessageCircle className="h-[19px] w-[19px]" /></span><span>واتساب</span></a>
          <a href={mapHref || "#"} target={mapHref ? "_blank" : undefined} rel={mapHref ? "noreferrer noopener" : undefined} aria-disabled={!mapHref} className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[15px] text-[8px] font-black ${mapHref ? "text-[#4d5652]" : "pointer-events-none text-[#c2c9c6]"}`}><MapPin className="h-[18px] w-[18px]" /><span>الموقع</span></a>
          <button type="button" onClick={share} className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[15px] text-[8px] font-black text-[#4d5652]"><MoreHorizontal className="h-[19px] w-[19px]" /><span>المزيد</span></button>
        </div>
      </div>
    </nav>
  );
}
