import {
  BarChart3,
  BadgeCheck,
  Building2,
  Home,
  Inbox,
  LifeBuoy,
  Palette,
  Settings2,
  ShoppingBag,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = { label: string; href: string; icon: LucideIcon; exact?: boolean; activePrefixes?: string[] };

export const dashboardNavItems: DashboardNavItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: Home, exact: true },
  { label: "صفحتي", href: "/dashboard/my-page", icon: UserRound, activePrefixes: ["/dashboard/services", "/dashboard/products", "/dashboard/catalog", "/dashboard/gallery", "/dashboard/offers", "/dashboard/contact-links", "/dashboard/working-hours", "/dashboard/page-builder", "/dashboard/page-customization", "/dashboard/preview", "/dashboard/share"] },
  { label: "الهوية الرقمية", href: "/dashboard/digital-identity", icon: BadgeCheck },
  { label: "توثيق الصفحة", href: "/dashboard/verification", icon: BadgeCheck },
  { label: "الطلبات والحجوزات", href: "/dashboard/inbox", icon: Inbox },
  { label: "متجر الأعمال", href: "/dashboard/business-store", icon: ShoppingBag },
  { label: "أدوات iR", href: "/dashboard/tools", icon: Sparkles },
  { label: "المظهر", href: "/dashboard/branding", icon: Palette },
  { label: "الفروع والفريق", href: "/dashboard/directory", icon: Building2 },
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "الدعم والمساعدة", href: "/dashboard/support", icon: LifeBuoy },
  { label: "الحساب والباقات", href: "/dashboard/settings", icon: Settings2, activePrefixes: ["/dashboard/billing"] },
];
