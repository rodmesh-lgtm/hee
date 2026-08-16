"use client";

import { Headset, MessageCircle, Phone, Share2 } from "lucide-react";

type Props = {
  whatsapp?: string | null;
  phone?: string | null;
  mapHref?: string | null;
  hasContacts?: boolean;
  hasAbout?: boolean;
};

const digits = (value?: string | null) => String(value ?? "").replace(/\D/g, "");

export function PublicV3MobileDock({ whatsapp, phone, hasContacts }: Props) {
  const wa = digits(whatsapp);
  const tel = digits(phone);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
    } catch {}
  };

  return (
    <nav
      aria-label="إجراءات المنشأة"
      className="fixed inset-x-0 bottom-0 z-[90] px-3 pt-2 md:hidden"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-[430px] rounded-[22px] border border-[#dfe7e3] bg-white/95 px-2 py-1.5 shadow-[0_-7px_30px_-18px_rgba(5,55,43,.42)] backdrop-blur-xl">
        <div className="grid grid-cols-4 items-end gap-1">
          <a
            href={hasContacts ? "#hee-contact-directory" : "#"}
            aria-disabled={!hasContacts}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[15px] text-[8px] font-black ${hasContacts ? "text-[#5f6b66]" : "pointer-events-none text-[#c2c9c6]"}`}
          >
            <Headset className="h-[17px] w-[17px]" />
            <span>الفريق</span>
          </a>

          <a
            href={wa ? `https://wa.me/${wa}` : "#"}
            target={wa ? "_blank" : undefined}
            rel={wa ? "noreferrer noopener" : undefined}
            aria-disabled={!wa}
            className={`-mt-4 flex min-h-[67px] flex-col items-center justify-center gap-1 rounded-[19px] border-4 border-white text-[8px] font-black shadow-[0_10px_24px_-13px_rgba(13,108,85,.75)] ${wa ? "bg-[#0d6c55] text-white" : "pointer-events-none bg-[#dce5e1] text-white"}`}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/12">
              <MessageCircle className="h-[18px] w-[18px]" />
            </span>
            <span>واتساب</span>
          </a>

          <a
            href={tel ? `tel:${tel}` : "#"}
            aria-disabled={!tel}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[15px] text-[8px] font-black ${tel ? "text-[#5f6b66]" : "pointer-events-none text-[#c2c9c6]"}`}
          >
            <Phone className="h-[17px] w-[17px]" />
            <span>اتصال</span>
          </a>

          <button
            type="button"
            onClick={share}
            className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[15px] text-[8px] font-black text-[#5f6b66]"
          >
            <Share2 className="h-[17px] w-[17px]" />
            <span>مشاركة</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
