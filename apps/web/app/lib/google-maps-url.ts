export function normalizeGoogleMapsUrl(value?: string | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    const hostIs = (domain: string) => host === domain || host.endsWith(`.${domain}`);
    const allowed = host === "maps.app.goo.gl"
      || host === "goo.gl"
      || hostIs("google.com")
      || hostIs("google.sa");
    return allowed ? url.toString() : null;
  } catch {
    return null;
  }
}
