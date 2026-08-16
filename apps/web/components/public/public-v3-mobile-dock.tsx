"use client";

import { Building2, MapPin, MessageCircle, Phone, Users } from "lucide-react";

type Props = {
  whatsapp?: string | null;
  phone?: string | null;
  mapHref?: string | null;
  hasContacts?: boolean;
  hasAbout?: boolean;
};

export function PublicV3MobileDock({ whatsapp, phone, mapHref, hasContacts = false, hasAbout = false }: Props) {
  const actions = [
    whatsapp ? { key: "whatsapp", label: "واتساب", href: `https://wa.me/${whatsapp}`, icon: MessageCircle, external: true, primary: true } : null,
    phone ? { key: "phone", label: "اتصال", href: `tel:${phone}`, icon: Phone, external: false, primary: false } : null,
    mapHref ? { key: "map", label: "الموقع", href: mapHref, icon: MapPin, external: true, primary: false } : null,
    hasContacts ? { key: "contacts", label: "التواصل", href: "#hee-contact-directory", icon: Users, external: false, primary: false } : null,
    hasAbout ? { key: "about", label: "عن المنشأة", href: "#hee-about", icon: Building2, external: false, primary: false } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item)).slice(0, 4);

  if (!actions.length) return null;

  return (
    <nav
      aria-label="إجراءات المنشأة"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#dce7e2] bg-white/94 px-2.5 pt-2 shadow-[0_-18px_48px_-30px_rgba(4,54,43,.55)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-[520px] gap-1.5" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0,1fr))` }}>
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.key}
              href={action.href}
              target={action.external && !action.href.startsWith("tel:") ? "_blank" : undefined}
              rel={action.external ? "noreferrer noopener" : undefined}
              className={`group flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[17px] px-1.5 py-1.5 text-[9.5px] font-black transition active:scale-[.97] ${action.primary ? "bg-[#0b8f66] text-white shadow-[0_10px_24px_-14px_rgba(11,143,102,.75)]" : "text-slate-600 hover:bg-[#f0f8f4] hover:text-[#087653]"}`}
            >
              <span className={`grid h-7 w-7 place-items-center rounded-full ${action.primary ? "bg-white/14" : "bg-[#edf7f2] text-[#0b8f66]"}`}>
                <Icon className="h-[16px] w-[16px]" strokeWidth={2.35} />
              </span>
              <span className="max-w-full truncate">{action.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
