"use client";

import { useEffect, useState } from "react";
import { Gift, Heart, House, Info, MapPin, MessageSquareText } from "lucide-react";

type PublicStickyMobileActionsProps = {
  businessKind?: "restaurant" | "services" | "store";
  servicesLabel?: string;
  contactHref?: string | null;
  hasOffers: boolean;
  hasLocation: boolean;
  hasGallery: boolean;
  hasReviews: boolean;
  hasServices: boolean;
  hasProducts: boolean;
  hasContact: boolean;
};

export function PublicStickyMobileActions({ businessKind = "services", servicesLabel = "الخدمات", contactHref = null, hasOffers, hasLocation, hasGallery, hasReviews, hasServices, hasProducts, hasContact }: PublicStickyMobileActionsProps) {
  void hasGallery;
  void hasReviews;
  const [activeHref, setActiveHref] = useState<string>("#top");

  useEffect(() => {
    const syncFromHash = () => setActiveHref(window.location.hash || "#top");
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  const restaurantActions = [
    { key: "home", label: "الرئيسية", icon: House, href: "#top" },
    hasServices ? { key: "services", label: servicesLabel, icon: Info, href: "#services-section" } : null,
    { key: "request", label: "احجز", icon: MessageSquareText, href: "#request-section" },
    hasLocation ? { key: "location", label: "الموقع", icon: MapPin, href: "#location-section" } : null,
    hasContact && contactHref ? { key: "contact", label: "تواصل", icon: MessageSquareText, href: contactHref } : null,
  ];

  const servicesActions = [
    { key: "home", label: "الرئيسية", icon: House, href: "#top" },
    hasServices ? { key: "services", label: servicesLabel, icon: Info, href: "#services-section" } : null,
    { key: "request", label: "اطلب", icon: MessageSquareText, href: "#request-section" },
    hasLocation ? { key: "location", label: "الموقع", icon: MapPin, href: "#location-section" } : null,
    hasContact && contactHref ? { key: "contact", label: "تواصل", icon: MessageSquareText, href: contactHref } : null,
  ];

  const storeActions = [
    { key: "home", label: "الرئيسية", icon: House, href: "#top" },
    hasProducts ? { key: "products", label: "المنتجات", icon: Gift, href: "#products-section" } : null,
    { key: "store", label: "المتجر", icon: Gift, href: "#external-store-link" },
    hasOffers ? { key: "offers", label: "العروض", icon: Heart, href: "#offers-section" } : null,
    hasContact && contactHref ? { key: "contact", label: "تواصل", icon: MessageSquareText, href: contactHref } : null,
  ];

  const source = businessKind === "restaurant" ? restaurantActions : businessKind === "store" ? storeActions : servicesActions;
  const actions = source
    .filter((item): item is { key: string; label: string; icon: typeof House; href: string } => Boolean(item))
    .slice(0, 5);

  if (actions.length === 0) return null;

  return (
    <nav
      data-public-mobile-nav
      aria-label="التنقل السريع"
      className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#dfe9e4] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+7px)] pt-1.5 shadow-[0_-14px_34px_-24px_rgba(4,54,43,0.32)] backdrop-blur-xl md:hidden"
    >
      <div
        className="mx-auto grid max-w-[560px] gap-1"
        style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0,1fr))` }}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = activeHref === action.href || (activeHref === "" && action.href === "#top");
          return (
            <a
              key={action.key}
              href={action.href}
              onClick={() => setActiveHref(action.href)}
              aria-current={isActive ? "page" : undefined}
              className={`group inline-flex min-h-[56px] flex-col items-center justify-center gap-0.5 rounded-[14px] px-1 py-1.5 text-[10px] font-extrabold transition-all duration-200 active:scale-[.97] ${
                isActive
                  ? "bg-[#edf8f3] text-[#087653] shadow-[inset_0_0_0_1px_rgba(14,159,110,0.08)]"
                  : "text-slate-500 hover:bg-[#f4faf7] hover:text-[#087653]"
              }`}
            >
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${isActive ? "bg-white text-[#0e9f6e] shadow-sm" : "text-slate-500"}`}>
                <Icon className="h-[17px] w-[17px]" strokeWidth={2.2} />
              </span>
              <span className="max-w-full truncate leading-4">{action.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
