export const STAFF_SECTIONS = {
  laundry: { label: "كاشير المغسلة", href: "/Laundromat" },
  page: { label: "صفحتي والخدمات والفروع", href: "/dashboard/my-page" },
  identity: { label: "الهوية الرقمية والتوثيق", href: "/dashboard/digital-identity" },
  orders: { label: "الطلبات", href: "/dashboard/inbox" },
  appointments: { label: "المواعيد وإعدادات الحجز", href: "/dashboard/appointments" },
  whatsapp: { label: "واتساب", href: "/dashboard/whatsapp" },
  reminders: { label: "التذكيرات الذكية", href: "/dashboard/reminders" },
  notifications: { label: "الإشعارات", href: "/dashboard/notifications" },
  notes: { label: "مذكرات الأعمال", href: "/dashboard/notes" },
  store: { label: "متجر الأعمال", href: "/dashboard/business-store" },
  analytics: { label: "الأداء", href: "/dashboard/analytics" },
  support: { label: "الدعم والمساعدة", href: "/dashboard/support" },
} as const;
export type StaffSection = keyof typeof STAFF_SECTIONS;
export function staffSections(value: unknown): StaffSection[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is StaffSection => typeof item === "string" && Object.hasOwn(STAFF_SECTIONS, item)))] : [];
}
export function memberCanAccess(permissions: unknown, section: StaffSection) {
  // Existing WhatsApp memberships retain their previous role-based access only.
  return permissions == null ? section === "whatsapp" : staffSections(permissions).includes(section);
}
export function staffSectionForPath(pathname: string): StaffSection | null {
  const root = pathname.split("/")[2] ?? "";
  if (["my-page", "services", "products", "catalog", "gallery", "offers", "contact-links", "page-builder", "page-customization", "preview", "share", "branding", "directory", "tools"].includes(root)) return "page";
  if (["digital-identity", "verification"].includes(root)) return "identity";
  if (["appointments", "working-hours"].includes(root)) return "appointments";
  const roots: Record<string, StaffSection> = { inbox: "orders", whatsapp: "whatsapp", reminders: "reminders", notifications: "notifications", notes: "notes", "business-store": "store", analytics: "analytics", support: "support" };
  return roots[root] ?? null;
}
export function staffCanOpenPath(pathname: string, permissions: unknown) {
  if (pathname === "/Laundromat") return memberCanAccess(permissions, "laundry");
  if (["/dashboard", "/dashboard/settings", "/dashboard/settings/sessions"].includes(pathname)) return true;
  const section = staffSectionForPath(pathname);
  return section !== null && memberCanAccess(permissions, section);
}
