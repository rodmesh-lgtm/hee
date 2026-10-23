import { normalizeE164 } from "../whatsapp/contact-domain";
import { liveTokenHash, validLiveToken } from "./policy";

export const LIVE_VIEW_TEMPLATE_NAME = "infro_live_view_v1";
export const LIVE_VIEW_TEMPLATE_BODY = "مرحبًا {{1}}، يمكنك متابعة خدمتك لدى {{2}}.\nمرجع الخدمة: {{3}}\nرابط المشاهدة الخاص والمؤقت: {{4}}\nيتوقف الوصول عند انتهاء الجلسة. لا تشارك الرابط مع الآخرين.";

export function liveViewTemplateSupported(template: { name: string; components: unknown; parameterFormat?: string | null }) {
  if (template.name !== LIVE_VIEW_TEMPLATE_NAME || (template.parameterFormat && template.parameterFormat.toUpperCase() !== "POSITIONAL")) return false;
  if (!Array.isArray(template.components) || template.components.length !== 1) return false;
  const body = template.components[0];
  return body?.type?.toUpperCase() === "BODY" && typeof body.text === "string" && body.text.trim() === LIVE_VIEW_TEMPLATE_BODY;
}

export function liveViewWatchCapability(path: string) {
  const token = path.startsWith("/watch/") ? path.slice(7) : "";
  if (!validLiveToken(token)) throw new Error("LIVE_LINK_INVALID");
  // Never derive bearer links from an untrusted Host header or preview domain.
  return { hash: liveTokenHash(token), url: `https://hub.ir.sa/watch/${token}` };
}

export function liveViewTemplateParameters(customerName: string, businessName: string, reference: string, watchPath: string) {
  const compact = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 120);
  return [{ type: "body", parameters: [compact(customerName), compact(businessName), compact(reference), liveViewWatchCapability(watchPath).url].map(text => ({ type: "text", text })) }];
}

export function liveViewRecipientPhone(raw: string) {
  const latin = raw.replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 1632)).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 1776));
  const compact = latin.replace(/[\s().-]/g, "");
  return normalizeE164(/^966\d+$/.test(compact) ? `+${compact}` : latin, "966");
}
