import {
  BarChart3,
  Building2,
  Home,
  Palette,
  Pencil,
  Settings2,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type DashboardNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
};

export const dashboardNavItems: DashboardNavItem[] = [
  { label: "الرئيسية", href: "/dashboard", icon: Home, exact: true },
  { label: "صفحتي", href: "/dashboard/my-page", icon: UserRound },
  { label: "المظهر والباقات", href: "/dashboard/branding", icon: Palette },
  { label: "الفروع والتواصل", href: "/dashboard/directory", icon: Building2 },
  { label: "محتوى الصفحة", href: "/dashboard/page-builder", icon: Pencil },
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "أدوات HEE", href: "/dashboard/tools", icon: Sparkles },
  { label: "حسابي", href: "/dashboard/settings", icon: Settings2 },
];
