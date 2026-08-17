import {
  BarChart3,
  Building2,
  Home,
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
};

// Keep the customer navigation intentionally small. Editing content belongs to
// "صفحتي"; customers should not have to understand the internal builder model.
export const dashboardNavItems: DashboardNavItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: Home, exact: true },
  { label: "صفحتي", href: "/dashboard/my-page", icon: UserRound },
  { label: "المظهر", href: "/dashboard/branding", icon: Palette },
  { label: "الفروع والفريق", href: "/dashboard/directory", icon: Building2 },
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "الحساب والباقات", href: "/dashboard/settings", icon: Settings2 },
];
