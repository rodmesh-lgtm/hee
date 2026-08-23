import {
  BarChart3,
  Building2,
  Home,
  Inbox,
  LifeBuoy,
  Palette,
  Settings2,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
  activePrefixes?: string[];
};

// Keep the customer navigation intentionally small. Editing content belongs to
// "صفحتي"; customers should not have to understand the internal builder model.
// Nested/legacy editor routes stay visually anchored to their parent section so the
// sidebar and mobile navigation never look like the customer has left the dashboard.
export const dashboardNavItems: DashboardNavItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: Home, exact: true },
  {
    label: "صفحتي",
    href: "/dashboard/my-page",
    icon: UserRound,
    activePrefixes: [
      "/dashboard/services",
      "/dashboard/products",
      "/dashboard/catalog",
      "/dashboard/gallery",
      "/dashboard/offers",
      "/dashboard/contact-links",
      "/dashboard/working-hours",
      "/dashboard/page-builder",
      "/dashboard/page-customization",
      "/dashboard/preview",
      "/dashboard/share",
    ],
  },
  { label: "الطلبات والحجوزات", href: "/dashboard/inbox", icon: Inbox },
  { label: "المظهر", href: "/dashboard/branding", icon: Palette },
  { label: "الفروع والفريق", href: "/dashboard/directory", icon: Building2 },
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "الدعم والمساعدة", href: "/dashboard/support", icon: LifeBuoy },
  {
    label: "الحساب والباقات",
    href: "/dashboard/settings",
    icon: Settings2,
    activePrefixes: ["/dashboard/billing"],
  },
];
