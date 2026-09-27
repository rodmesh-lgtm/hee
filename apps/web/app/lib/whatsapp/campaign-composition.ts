/** Shared by the editor and the immutable recipient snapshot. No credentials or I/O. */
export type Binding = { source: "literal" | "displayName" | "phoneE164" | "email" | "attribute"; value: string; fallback?: string };
export type Composition = { bindings: Record<string, Binding>; mediaUrl?: string; trackingDestination?: string };
export type TemplateField = { key: string; component: "header" | "body" | "button"; variable: string; index?: number };
const object = (v: unknown): Record<string, unknown> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {};

export function campaignTemplateFields(components: unknown) {
  const fields: TemplateField[] = [];
  let media: string | null = null;
  let unsupported = false;
  for (const raw of Array.isArray(components) ? components : []) {
    const c = object(raw), type = String(c.type).toUpperCase();
    if (type === "HEADER" && ["IMAGE", "VIDEO", "DOCUMENT"].includes(String(c.format).toUpperCase())) media = String(c.format).toLowerCase();
    else if (type === "HEADER" && c.format && c.format !== "TEXT") unsupported = true;
    if (type === "HEADER" || type === "BODY") {
      const variables = [...new Set([...String(c.text ?? "").matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g)].map((m) => m[1]))];
      if (variables.every((v) => /^\d+$/.test(v))) variables.sort((a, b) => Number(a) - Number(b));
      for (const variable of variables) fields.push({ key: `${type.toLowerCase()}:${variable}`, component: type.toLowerCase() as "header" | "body", variable });
    } else if (type === "BUTTONS") {
      for (const [index, item] of (Array.isArray(c.buttons) ? c.buttons : []).entries()) {
        const button = object(item);
        if (button.type === "URL" && String(button.url).includes("{{")) fields.push({ key: `button:${index}`, component: "button", variable: "1", index });
        else if (!["URL", "PHONE_NUMBER", "QUICK_REPLY"].includes(String(button.type))) unsupported = true;
      }
    } else if (!["HEADER", "BODY", "FOOTER"].includes(type)) unsupported = true;
  }
  return { fields, media, unsupported };
}

export function publicMediaUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || url.username || url.password || url.port || value.length > 2048 || !host.includes(".") || /(^localhost$|\.local$|\.internal$|^\[|^\d+\.\d+\.\d+\.\d+$)/.test(host)) return null;
    return url.href;
  } catch { return null; }
}

export function parseCampaignComposition(raw: unknown): Composition {
  if (typeof raw === "string") {
    if (raw.length > 16000) throw new Error("WHATSAPP_CAMPAIGN_COMPOSITION_INVALID");
    try { raw = JSON.parse(raw); } catch { throw new Error("WHATSAPP_CAMPAIGN_COMPOSITION_INVALID"); }
  }
  const root = object(raw), bindings: Record<string, Binding> = {};
  const entries = Object.entries(object(root.bindings));
  if (entries.length > 40) throw new Error("WHATSAPP_CAMPAIGN_COMPOSITION_INVALID");
  for (const [key, rawBinding] of entries) {
    const b = object(rawBinding);
    if (!/^(header|body):[a-zA-Z0-9_]+$|^button:\d{1,2}$/.test(key) || !["literal", "displayName", "phoneE164", "email", "attribute"].includes(String(b.source)) || typeof b.value !== "string" || b.value.length > 1024 || (b.fallback !== undefined && (typeof b.fallback !== "string" || b.fallback.length > 1024))) throw new Error("WHATSAPP_CAMPAIGN_COMPOSITION_INVALID");
    bindings[key] = { source: b.source as Binding["source"], value: b.value.trim(), fallback: typeof b.fallback === "string" ? b.fallback.trim() : undefined };
  }
  const mediaUrl = root.mediaUrl ? publicMediaUrl(String(root.mediaUrl)) : undefined;
  const trackingDestination = root.trackingDestination ? publicMediaUrl(String(root.trackingDestination)) : undefined;
  if (root.trackingDestination && !trackingDestination) throw new Error("WHATSAPP_CAMPAIGN_TRACKING_INVALID");
  if (root.mediaUrl && !mediaUrl) throw new Error("WHATSAPP_CAMPAIGN_MEDIA_INVALID");
  return { bindings, ...(mediaUrl ? { mediaUrl } : {}), ...(trackingDestination ? { trackingDestination } : {}) };
}

export function resolveCampaignComposition(components: unknown, composition: Composition, contact: { displayName?: string | null; phoneE164?: string; email?: string | null; attributes?: unknown }) {
  const spec = campaignTemplateFields(components);
  if (spec.unsupported) throw new Error("WHATSAPP_CAMPAIGN_TEMPLATE_UNSUPPORTED");
  if (spec.media && !publicMediaUrl(composition.mediaUrl ?? "")) throw new Error("WHATSAPP_CAMPAIGN_MEDIA_INVALID");
  const result: Array<Record<string, unknown>> = [];
  const values: Record<string, string> = {};
  if (spec.media) result.push({ type: "header", parameters: [{ type: spec.media, [spec.media]: { link: composition.mediaUrl } }] });
  for (const field of spec.fields) {
    const binding = composition.bindings[field.key];
    if (!binding) throw new Error("WHATSAPP_CAMPAIGN_VARIABLE_MISSING");
    const attributeKey = binding.value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
    const raw = binding.source === "literal" ? binding.value : binding.source === "attribute" ? object(contact.attributes)[attributeKey] : contact[binding.source];
    const value = (typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : "") || binding.fallback || "";
    if (!value || value.length > 1024 || /[\r\n\t]/.test(value)) throw new Error("WHATSAPP_CAMPAIGN_VARIABLE_MISSING");
    values[field.key] = value;
    const parameter = { type: "text", text: value, ...(!/^\d+$/.test(field.variable) ? { parameter_name: field.variable } : {}) };
    if (field.component === "button") result.push({ type: "button", sub_type: "url", index: String(field.index), parameters: [parameter] });
    else {
      let component = result.find((item) => item.type === field.component);
      if (!component) { component = { type: field.component, parameters: [] }; result.push(component); }
      (component.parameters as unknown[]).push(parameter);
    }
  }
  return { components: result, values };
}
