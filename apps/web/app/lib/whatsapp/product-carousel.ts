export type ProductCarousel = { catalogId: string; retailerIds: string[] };
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};
export function parseProductCarousel(value: unknown): ProductCarousel {
  const v = object(value);
  if (typeof v.catalogId !== "string" || !/^\d{1,128}$/.test(v.catalogId) || !Array.isArray(v.retailerIds) || v.retailerIds.length < 2 || v.retailerIds.length > 10) throw new Error("WHATSAPP_PRODUCT_CAROUSEL_INVALID");
  const retailerIds = v.retailerIds.map(id => { if (typeof id !== "string" || !id.trim() || id !== id.trim() || id.length > 100 || /[\x00-\x1f\x7f]/.test(id)) throw new Error("WHATSAPP_PRODUCT_CAROUSEL_INVALID"); return id; });
  if (new Set(retailerIds).size !== retailerIds.length) throw new Error("WHATSAPP_PRODUCT_CAROUSEL_INVALID");
  return { catalogId: v.catalogId, retailerIds };
}
export function isProductCarouselComponent(value: unknown) {
  const c = object(value);
  if (String(c.type).toUpperCase() !== "CAROUSEL" || !Array.isArray(c.cards) || c.cards.length < 2 || c.cards.length > 10) return false;
  return c.cards.every(raw => {
    const parts = object(raw).components;
    if (!Array.isArray(parts) || parts.length !== 2) return false;
    const header = parts.map(object).find(p => String(p.type).toUpperCase() === "HEADER");
    const buttons = parts.map(object).find(p => String(p.type).toUpperCase() === "BUTTONS")?.buttons;
    return String(header?.format).toUpperCase() === "PRODUCT" && Array.isArray(buttons) && buttons.length === 1 && String(object(buttons[0]).type).toUpperCase() === "SPM";
  });
}
export function productCarouselParameters(raw: unknown) {
  const carousel = parseProductCarousel(raw);
  return { type: "carousel", cards: carousel.retailerIds.map((id, index) => ({ card_index: index, components: [{ type: "header", parameters: [{ type: "product", product: { catalog_id: carousel.catalogId, product_retailer_id: id } }] }] })) };
}
export function productCarouselTemplateComponent() {
  return { type: "CAROUSEL", cards: Array.from({ length: 2 }, () => ({ components: [{ type: "HEADER", format: "PRODUCT" }, { type: "BUTTONS", buttons: [{ type: "SPM", text: "View" }] }] })) };
}
