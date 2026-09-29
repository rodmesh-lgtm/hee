import { publicMediaUrl } from "./whatsapp/campaign-composition";

export const shortLinkUrl = (code: string) => `https://ir.sa/s/${code}`;
// Keep surrounding Arabic/Latin punctuation outside the destination.
export function longLinksInText(text: string) {
  return [...new Set((text.match(/https:\/\/[^\s<>"'`]+/giu) ?? [])
    .map(value => {
      value = value.replace(/[،؛.!?؟]+$/u, "");
      for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
        while (value.endsWith(close) && value.split(close).length > value.split(open).length) value = value.slice(0, -1);
      }
      return value;
    })
    .filter(value => value.length > 28 && shortLinkDestination(value)))];
}
export function shortLinkDestination(value: string) {
  const result = publicMediaUrl(value.trim());
  if (!result) return null;
  const url = new URL(result);
  if (["ir.sa", "www.ir.sa"].includes(url.hostname) && (/^\/s(?:\/|$)/.test(url.pathname) || url.pathname.startsWith("/api/whatsapp/campaign-link/"))) return null;
  return result.length <= 2048 ? result : null;
}
export function shouldCountShortLinkClick(method: string, userAgent: string) {
  return method === "GET" && Boolean(userAgent) && !/bot|crawler|spider|preview|facebookexternalhit|headless|monitor|curl|wget/i.test(userAgent);
}
export function shortLinkCsvCell(value: string) {
  const safe = /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}
export function shortLinkFilters(params: Record<string, string | string[] | undefined>) {
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Math.min(100000, Math.floor(Number(params.page) || 1)));
  const size = [10, 25, 50].includes(Number(params.size)) ? Number(params.size) : 10;
  return { q, page, size };
}
