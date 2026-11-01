export type BookingAudience = "everyone" | "store_orders" | "legacy";

/** Stored with the establishment's existing settings, never in global settings. */
export function bookingAudience(pageModules: unknown): BookingAudience {
  if (!Array.isArray(pageModules)) return "legacy";
  const contact = pageModules.filter(item => item && typeof item === "object" && item.id === "contact").at(-1);
  const value = contact?.config?.bookingAudience;
  return value === "everyone" || value === "store_orders" ? value : "legacy";
}

export function bookingOrderRequired(audience: BookingAudience, hasActiveStore: boolean) {
  return audience === "store_orders" || (audience === "legacy" && hasActiveStore);
}
