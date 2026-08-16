"use client";

import { MapPin, MessageCircle, Phone, Users } from "lucide-react";

type Props = {
  whatsapp?: string | null;
  phone?: string | null;
  mapHref?: string | null;
  hasContacts?: boolean;
  hasAbout?: boolean;
};

export function PublicV3MobileDock({ whatsapp, phone, mapHref, hasContacts = false }: Props) {
  const actions = [
    phone ? { key: "phone", label: "اتصال", href: `tel:${phone}`, icon: Phone, external: false, primary: false } : null,
    whatsapp ? { key: "whatsapp", label: "واتساب", href: `https://wa.me/${whatsapp}`, icon: MessageCircle, external: true, primary: true } : null,
    mapHref ? { key: "map", label: "الموقع", href: mapHref, icon: MapPin, external: true, primary: false } : null,
    hasContacts ? { key: "contacts", label: "تواصل", href: "#hee-contact-directory", icon: Users, external: false, primary: false } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!actions.length) return null;

  return (
    <nav
      aria-label="إجراءات المنشأة"
      className="fixed inset-x-0 bottom-0 z-[90] px-3 pt-2 md:hidden"
      style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto max-w-[520px] rounded-[24px] border border-[#dce7e2]/90 bg-white/95 p-1.5 shadow-[0_-8px_38px_-18px_rgba(4,54,43,.42),0_12px_34px_-20px_rgba(4,54,43,.35)] backdrop-blur-2xl">
        <div className="grid items-end gap-1" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0,1fr))` }}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <a
                key={action.key}
                href={action.href}
                target={action.external && !action.href.startsWith("tel:") ? "_blank" : undefined}
                rel={action.external ? "noreferrer noopener" : undefined}
                className={`group relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[18px] px-1 py-1.5 text-[9px] font-black transition-all active:scale-[.96] ${action.primary ? "-mt-4 min-h-[68px] bg-[linear-gradient(145deg,#10a875,#087b59)] text-white shadow-[0_12px_28px_-12px_rgba(8,123,89,.72)] ring-4 ring-white" : "text-slate-600 hover:bg-[#f0f8f4] hover:text-[#087653]"}`}
              >
                <span className={`grid place-items-center rounded-full transition ${action.primary ? "h-9 w-9 bg-white/15" : "h-7 w-7 bg-[#edf7f2] text-[#0b8f66] group-hover:bg-emerald-100"}`}>
                  <Icon className={action.primary ? "h-[19px] w-[19px]" : "h-[16px] w-[16px]"} strokeWidth={2.35} />
                </span>
                <span className="max-w-full truncate">{action.label}</span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
