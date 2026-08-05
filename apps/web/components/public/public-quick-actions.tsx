"use client";

import { CalendarClock, GalleryHorizontal, Gift, MapPin, MessageCircle, PackageOpen, ShoppingBag, Sparkles, Star } from "lucide-react";
import type { PublicOffer, PublicService } from "./types";

type PublicQuickActionsProps = {
  accentColor: string;
  businessName: string;
  whatsapp: string | null;
  phone: string | null;
  services: PublicService[];
  offers: PublicOffer[];
  bookingAvailable: boolean;
  onlineOrdersEnabled: boolean;
  hasGallery: boolean;
  hasLocation: boolean;
  hasReviews: boolean;
};

type QuickAction = {
  key: string;
  label: string;
  icon: typeof CalendarClock;
  href: string;
  target?: string;
};

export function PublicQuickActions({
  accentColor,
  businessName,
  whatsapp,
  phone,
  services,
  offers,
  bookingAvailable,
  onlineOrdersEnabled,
  hasGallery,
  hasLocation,
  hasReviews,
}: PublicQuickActionsProps) {
  const actions: QuickAction[] = [];

  if (bookingAvailable && (whatsapp || phone)) {
    actions.push({
      key: "booking",
      label: "احجز",
      icon: CalendarClock,
      href: whatsapp
        ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(`مرحباً ${businessName}، أرغب بحجز موعد.`)}`
        : `tel:${phone}`,
      target: whatsapp ? "_blank" : undefined,
    });
  }

  if (onlineOrdersEnabled && whatsapp) {
    actions.push({
      key: "order",
      label: "اطلب",
      icon: ShoppingBag,
      href: `https://wa.me/${whatsapp}?text=${encodeURIComponent(`مرحباً ${businessName}، أود تنفيذ طلب جديد.`)}`,
      target: "_blank",
    });
  }

  if (services.length > 0) {
    actions.push({ key: "services", label: "الخدمات", icon: PackageOpen, href: "#services-section" });
  }

  if (offers.length > 0) {
    actions.push({ key: "offers", label: "العروض", icon: Gift, href: "#offers-section" });
  }

  if (hasGallery) {
    actions.push({ key: "gallery", label: "المعرض", icon: GalleryHorizontal, href: "#gallery-section" });
  }

  if (hasLocation) {
    actions.push({ key: "location", label: "الموقع", icon: MapPin, href: "#location-section" });
  }

  if (hasReviews) {
    actions.push({ key: "reviews", label: "التقييمات", icon: Star, href: "#reviews-section" });
  }

  if (whatsapp || phone) {
    actions.push({
      key: "contact",
      label: "تواصل",
      icon: MessageCircle,
      href: whatsapp ? `https://wa.me/${whatsapp}` : `tel:${phone}`,
      target: whatsapp ? "_blank" : undefined,
    });
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[26px] border border-white/10 bg-slate-950/70 p-4 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-black">إجراءات النشاط</h2>
        <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-300">
          <Sparkles className="h-3.5 w-3.5" />
          أسرع وصول
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <a
              key={action.key}
              href={action.href}
              target={action.target}
              rel={action.target ? "noreferrer" : undefined}
              className="group rounded-[16px] border border-white/10 bg-white/[0.04] px-3 py-3 text-right transition-all duration-300 hover:-translate-y-1 hover:border-white/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              style={{
                boxShadow: `inset 0 0 0 1px ${accentColor}20`,
                borderColor: `${accentColor}30`,
              }}
              aria-label={action.label}
            >
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" style={{ color: accentColor }} />
                <span className="text-xs font-bold text-white">{action.label}</span>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
