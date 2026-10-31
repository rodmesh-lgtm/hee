import { createElement, type ComponentType, type SVGProps } from "react";
import {
  BarChart3,
  BadgeCheck,
  Bell,
  BellRing,
  CalendarDays,
  Video,
  Home,
  Inbox,
  LifeBuoy,
  NotebookPen,
  Settings2,
  UsersRound,
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

export type DashboardNavGroup = "daily" | "presence" | "growth" | "account";
export const dashboardNavGroups: { id: DashboardNavGroup; label: string }[] = [
  { id: "daily", label: "أعمالك اليومية" },
  { id: "presence", label: "صفحتك وهويتك" },
  { id: "growth", label: "التسويق والنمو" },
  { id: "account", label: "إدارة الحساب" },
];

export type DashboardNavItem = { group: DashboardNavGroup; keywords: string; label: string; href: string; icon: NavIcon; exact?: boolean; activePrefixes?: string[] };

/** Customer navigation stays intentionally compact. Advanced editing surfaces remain reachable from their parent studios instead of competing for attention in the rail. */
export const dashboardNavItems: DashboardNavItem[] = [
  { group: "daily", keywords: "الرئيسية ملخص متابعة", label: "مركز العمل", href: "/dashboard", icon: Home, exact: true },
  { group: "daily", keywords: "حملات قوالب جهات اتصال رسائل WhatsApp ميتا ربط", label: "تسويق واتساب", href: "/dashboard/whatsapp", icon: WhatsAppIcon, activePrefixes: ["/dashboard/whatsapp"] },
  { group: "daily", keywords: "سلة Salla متجر ربط تجربة بدء تشخيص الحجز", label: "Salla", href: "/dashboard/commerce/salla", icon: ShoppingBag },
  { group: "presence", keywords: "تعديل تصميم شعار خدمات منتجات فروع فريق ساعات معرض روابط", label: "صفحتي", href: "/dashboard/my-page", icon: UserRound, activePrefixes: ["/dashboard/services", "/dashboard/products", "/dashboard/catalog", "/dashboard/gallery", "/dashboard/offers", "/dashboard/contact-links", "/dashboard/page-builder", "/dashboard/page-customization", "/dashboard/preview", "/dashboard/share", "/dashboard/branding", "/dashboard/directory", "/dashboard/tools"] },
  { group: "presence", keywords: "توثيق ملف تعريفي PDF سيو SEO", label: "الهوية الرقمية", href: "/dashboard/digital-identity", icon: BadgeCheck, activePrefixes: ["/dashboard/verification"] },
  { group: "daily", keywords: "عملاء طلب خدمة وارد", label: "الطلبات", href: "/dashboard/inbox", icon: Inbox },
  { group: "daily", keywords: "حجز ساعات العمل جدول مواعيد إعدادات رمز تحقق OTP", label: "المواعيد والحجوزات", href: "/dashboard/appointments", icon: CalendarDays, activePrefixes: ["/dashboard/working-hours"] },
  { group: "daily", keywords: "كاميرا كاميرات بث مباشر ورش رافعة مشاهدة مؤقتة جلسات", label: "المشاهدة المؤقتة", href: "/dashboard/live-view", icon: Video },
  { group: "daily", keywords: "تذكير مهام مواعيد تنبيه", label: "التذكيرات الذكية", href: "/dashboard/reminders", icon: BellRing },
  { group: "daily", keywords: "تنبيهات أخبار", label: "الإشعارات", href: "/dashboard/notifications", icon: Bell },
  { group: "daily", keywords: "ملاحظات مذكرة مهام", label: "مذكرات الأعمال", href: "/dashboard/notes", icon: NotebookPen },
  { group: "daily", keywords: "محاسبة كاشير فواتير دفتر قيود مورد اشتراكات عملاء مخزون جرد توصيل غسيل كوي مغسلة", label: "البرنامج المحاسبي", href: "/Accounting", icon: BarChart3, activePrefixes: ["/Accounting", "/Laundromat"] },
  { group: "growth", keywords: "شراء خدمات متجر", label: "متجر الأعمال", href: "/dashboard/business-store", icon: ShoppingBag },
  { group: "growth", keywords: "إحصائيات تقارير تحليلات زيارات", label: "الأداء", href: "/dashboard/analytics", icon: BarChart3 },
  { group: "account", keywords: "تواصل دعم مساعدة مشكلة", label: "الدعم والمساعدة", href: "/dashboard/support", icon: LifeBuoy },
  { group: "account", keywords: "فريق مستخدمين موظف صلاحية", label: "الموظفون والصلاحيات", href: "/dashboard/staff", icon: UsersRound },
  { group: "account", keywords: "إعدادات بريد ايميل جوال اسم اشتراك فاتورة دفع", label: "الحساب والباقات", href: "/dashboard/settings", icon: Settings2, activePrefixes: ["/dashboard/billing", "/dashboard/plans", "/dashboard/account-deletion"] },
];

function normalizeNavSearch(value: string) {
  return value.normalize("NFKC").replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").toLocaleLowerCase("ar");
}

export function matchesDashboardNav(item: DashboardNavItem, query: string) {
  const terms = normalizeNavSearch(query).trim().split(/\s+/).filter(Boolean);
  const words = normalizeNavSearch(`${item.label} ${item.keywords}`).split(/\s+/).map(word => word.replace(/^ال/, ""));
  return terms.every(term => words.some(word => word.startsWith(term.replace(/^ال/, "")))) ;
}
