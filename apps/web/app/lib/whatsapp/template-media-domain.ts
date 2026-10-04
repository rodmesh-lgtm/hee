export const TEMPLATE_MEDIA_LIMITS = { IMAGE: 5, VIDEO: 16, DOCUMENT: 100 } as const;
export const TEMPLATE_MEDIA_CHUNK_BYTES = 2 * 1024 * 1024;
export function templateMediaLimit(header: string) {
  return Object.hasOwn(TEMPLATE_MEDIA_LIMITS, header) ? TEMPLATE_MEDIA_LIMITS[header as keyof typeof TEMPLATE_MEDIA_LIMITS] : 0;
}
export function validateTemplateMedia(header: string, mime: string, size: number) {
  const allowed = header === "IMAGE" ? ["image/jpeg", "image/png"] : header === "VIDEO" ? ["video/mp4"] : header === "DOCUMENT" ? ["application/pdf"] : [];
  if (!allowed.includes(mime) || !Number.isSafeInteger(size) || size < 12 || size > templateMediaLimit(header) * 1024 * 1024) throw new Error("TEMPLATE_MEDIA_INVALID");
}
