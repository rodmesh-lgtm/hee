export const SALLA_ORDER_CONFIRMATION_TEMPLATE_EXAMPLE = "مرحبًا {{1}}، تم تأكيد طلبك المدفوع رقم {{3}} لدى {{2}}. شكرًا لاختيارك لنا.";

/** Only a text body with the three documented positional fields is supported. */
export function sallaOrderTemplateSupported(components: unknown, parameterFormat?: string | null) {
  if (!Array.isArray(components) || (parameterFormat && parameterFormat.toUpperCase() !== "POSITIONAL")) return false;
  const expected = ["{{1}}", "{{2}}", "{{3}}"];
  let bodyCount = 0;
  for (const component of components) {
    if (!component || typeof component !== "object" || Array.isArray(component)) return false;
    const item = component as Record<string, unknown>;
    const type = String(item.type ?? "").toUpperCase();
    if (type === "BODY") {
      bodyCount += 1;
      if (typeof item.text !== "string") return false;
      const fields = item.text.match(/\{\{[^{}]+\}\}/g) ?? [];
      if (fields.length !== 3 || expected.some(field => !fields.includes(field))) return false;
    } else if (type === "FOOTER" || (type === "HEADER" && String(item.format ?? "").toUpperCase() === "TEXT")) {
      if (typeof item.text !== "string" || /\{\{/.test(item.text)) return false;
    } else return false;
  }
  return bodyCount === 1;
}

export function sallaOrderTemplateParameters(customerName: string | null, businessName: string, orderId: string) {
  const clean = (text: string | null, fallback: string) => (text?.normalize("NFKC").replace(/\s+/g, " ").trim() || fallback).slice(0, 256);
  return [{ type: "body", parameters: [clean(customerName, "عميلنا العزيز"), clean(businessName, "المنشأة"), clean(orderId, "الطلب")].map(text => ({ type: "text", text })) }];
}
