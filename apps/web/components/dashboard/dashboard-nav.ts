import {
  BarChart3,
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
  { label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "أدوات HEE", href: "/dashboard/tools", icon: Sparkles },
  { label: "حسابي", href: "/dashboard/settings", icon: Settings2 },
];
