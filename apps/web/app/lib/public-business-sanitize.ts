function safeGoogleMapsUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    const isGoogleMap = host === "maps.app.goo.gl" || host.endsWith("google.com") || host.endsWith("google.sa") || host === "goo.gl";
    return isGoogleMap ? url.toString() : null;
  } catch {
    return null;
  }
}

export function sanitizePublicBusiness<T extends { googleMapsLink?: string | null; branches?: Array<{ googleMapsLink?: string | null }> }>(business: T): T {
  return {
    ...business,
    googleMapsLink: safeGoogleMapsUrl(business.googleMapsLink),
    branches: business.branches?.map((branch) => ({ ...branch, googleMapsLink: safeGoogleMapsUrl(branch.googleMapsLink) })),
  } as T;
}
