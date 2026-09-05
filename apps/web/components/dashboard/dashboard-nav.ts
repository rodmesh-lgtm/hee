import { createElement, type ComponentType, type SVGProps } from "react";
import {
  BarChart3,
  BadgeCheck,
  BellRing,
  Home,
  Inbox,
  LifeBuoy,
  Settings2,
  ShoppingBag,
  UserRound,
} from "lucide-react";

type NavIcon = ComponentType<SVGProps<SVGSVGElement>>;

function WhatsAppIcon(props: SVGProps<SVGSVGElement>) {
  return createElement("svg", { ...props, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true },
    createElement("path", { d: "M20 11.5a8 8 0 0 1-11.84 7.02L4 19.6l1.12-4.02A8 8 0 1 1 20 11.5Z" }),
    createElement("path", { d: "M9.15 8.15c.18-.36.37-.37.56-.37h.47c.16 0 .31.05.4.28l.72 1.73c.08.2.04.38-.08.54l-.56.72c-.11.14-.09.32 0 .47.48.78 1.1 1.42 1.87 1.91.17.1.35.12.49 0l.77-.63c.16-.13.34-.16.53-.08l1.68.79c.2.09.29.25.27.45-.05.57-.27 1.15-.66 1.49-.44.39-1.07.58-1.82.42-1.28-.27-2.84-1.14-4.11-2.42-1.27-1.27-2.08-2.75-2.33-4.02-.15-.73.06-1.33.45-1.72.34-.34.78-.5 1.35-.55Z" }),
  );
}

export type DashboardNavItem = { label: string; href: string; icon: NavIcon; exact?: boolean; activePrefixes?: string[] };

/** Customer navigation stays intentionally compact. Advanced editing surfaces remain reachable from their parent studios instead of competing for attention in the rail. */
export const dashboardNavItems: DashboardNavItem[] = [
  { label: "مركز العمل", href: "/dashboard", icon: Home, exact: true },
  { label: "صفحتي", href: "/dashboard/my-page", icon: UserRound, activePrefixes: ["/dashboard/services", "/dashboard/products", "/dashboard/catalog", "/dashboard/gallery", "/dashboard/offers", "/dashboard/contact-links", "/dashboard/working-hours", "/dashboard/page-builder", "/dashboard/page-customization", "/dashboard/preview", "/dashboard/share", "/dashboard/branding", "/dashboard/directory", "/dashboard/tools"] },
  { label: "الهوية الرقمية", href: "/dashboard/digital-identity", icon: BadgeCheck, activePrefixes: ["/dashboard/verification"] },
  { label: "الطلبات والحجوزات", href: "/dashboard/inbox", icon: Inbox },
  { label: "تسويق واتساب", href: "/dashboard/whatsapp", icon: WhatsAppIcon, activePrefixes: ["/dashboard/whatsapp"] },
  { label: "التذكيرات الذكية", href: "/dashboard/reminders", icon: BellRing },
  { label: "متجر الأعمال", href: "/dashboard/business-store", icon: ShoppingBag },
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "الدعم والمساعدة", href: "/dashboard/support", icon: LifeBuoy },
  { label: "الحساب والباقات", href: "/dashboard/settings", icon: Settings2, activePrefixes: ["/dashboard/billing", "/dashboard/account-deletion"] },
];
