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
    const syncFromHash = () => {
      setActiveHref(window.location.hash || "#top");
    };

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

  if (actions.length === 0) {
    return null;
  }

  return (
    <div data-public-mobile-nav className="fixed inset-x-0 bottom-0 z-[90] border-t border-[#e7ebf8] bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1.5 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.35)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-[560px] gap-1" style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0,1fr))` }}>
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = activeHref === action.href || (activeHref === "" && action.href === "#top");
          return (
            <a
              key={action.key}
              href={action.href}
              onClick={() => setActiveHref(action.href)}
              className={`inline-flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-semibold transition ${isActive ? "bg-[#eef2ff] text-[#3f49bf]" : "text-slate-600 hover:bg-[#f3f5ff] hover:text-[#3f49bf]"}`}
            >
              <Icon className="h-4 w-4" />
              <span className="leading-4">{action.label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
