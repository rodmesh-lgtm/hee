import {
  BarChart3,
  BadgeCheck,
  Home,
  Inbox,
  MessageCircle,
  LifeBuoy,
  Settings2,
  ShoppingBag,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean; activePrefixes?: string[] };

/**
 * Customer navigation stays intentionally compact. Advanced editing surfaces remain
 * reachable from their parent studios instead of competing for attention in the rail.
 */
export const dashboardNavItems: DashboardNavItem[] = [
  { label: "مركز العمل", href: "/dashboard", icon: Home, exact: true },
  { label: "صفحتي", href: "/dashboard/my-page", icon: UserRound, activePrefixes: ["/dashboard/services", "/dashboard/products", "/dashboard/catalog", "/dashboard/gallery", "/dashboard/offers", "/dashboard/contact-links", "/dashboard/working-hours", "/dashboard/page-builder", "/dashboard/page-customization", "/dashboard/preview", "/dashboard/share", "/dashboard/branding", "/dashboard/directory", "/dashboard/tools"] },
  { label: "الهوية الرقمية", href: "/dashboard/digital-identity", icon: BadgeCheck, activePrefixes: ["/dashboard/verification"] },
  { label: "الطلبات والحجوزات", href: "/dashboard/inbox", icon: Inbox },
  { label: "تسويق واتساب", href: "/dashboard/whatsapp", icon: MessageCircle, activePrefixes: ["/dashboard/whatsapp"] },
  { label: "متجر الأعمال", href: "/dashboard/business-store", icon: ShoppingBag },
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "الدعم والمساعدة", href: "/dashboard/support", icon: LifeBuoy },
  { label: "الحساب والباقات", href: "/dashboard/settings", icon: Settings2, activePrefixes: ["/dashboard/billing", "/dashboard/account-deletion"] },
];
