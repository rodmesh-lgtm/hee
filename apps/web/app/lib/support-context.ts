// Persist only these section keys: never URLs, query strings, or customer IDs.
export const SUPPORT_CONTEXTS = {
  meta: { path: "/dashboard/whatsapp/setup", label: "ربط حساب Meta", category: "technical" },
  contacts: { path: "/dashboard/whatsapp/contacts", label: "استيراد وجهات الاتصال", category: "technical" },
  campaigns: { path: "/dashboard/whatsapp/campaigns", label: "حملات واتساب", category: "technical" },
  templates: { path: "/dashboard/whatsapp/templates", label: "قوالب واتساب", category: "technical" },
  automations: { path: "/dashboard/whatsapp/automations", label: "الرسائل التلقائية", category: "technical" },
  integrations: { path: "/dashboard/whatsapp/integrations", label: "تكاملات المتاجر", category: "technical" },
  conversations: { path: "/dashboard/whatsapp/inbox", label: "محادثات واتساب", category: "technical" },
  whatsapp: { path: "/dashboard/whatsapp", label: "واتساب للأعمال", category: "technical" },
  booking: { path: "/dashboard/working-hours", label: "المواعيد والحجوزات", category: "technical" },
  billing: { path: "/dashboard/billing", label: "الاشتراك والفوترة", category: "billing" },
  identity: { path: "/dashboard/digital-identity", label: "الهوية الرقمية", category: "technical" },
  dashboard: { path: "/dashboard", label: "لوحة الأعمال", category: "technical" },
} as const;

export type SupportContextKey = keyof typeof SUPPORT_CONTEXTS;

export function readSupportContext(value: unknown): SupportContextKey | null {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SUPPORT_CONTEXTS, value)
    ? value as SupportContextKey : null;
}

export function supportContextForPath(pathname: string): SupportContextKey | null {
  if (pathname === "/dashboard/support" || pathname.startsWith("/dashboard/support/")) return null;
  return (Object.keys(SUPPORT_CONTEXTS) as SupportContextKey[]).find((key) => {
    const path = SUPPORT_CONTEXTS[key].path;
    return pathname === path || pathname.startsWith(`${path}/`);
  }) ?? null;
}
