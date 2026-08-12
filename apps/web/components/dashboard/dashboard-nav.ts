import {
  BarChart3,
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
  { label: "صفحتي", href: "/dashboard/my-page", icon: UserRound },
  { label: "البناء الكامل", href: "/dashboard/page-builder", icon: Pencil },
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "أدوات HEE", href: "/dashboard/tools", icon: Sparkles },
  { label: "حسابي", href: "/dashboard/settings", icon: Settings2 },
];
