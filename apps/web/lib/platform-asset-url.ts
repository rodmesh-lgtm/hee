export function platformAssetUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url || /[\\\u0000-\u0020]/.test(url)) return null;
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try { const parsed = new URL(url); return parsed.protocol === "https:" && !parsed.username && !parsed.password ? parsed.href : null; }
  catch { return null; }
}
