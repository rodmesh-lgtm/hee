import "server-only";
import { validMediaFile } from "./policy";

// Platform-owned origin only. Tenants cannot submit URLs, hosts or credentials.
export function liveGatewayConfig() {
  if (process.env.LIVE_VIEW_ENABLED !== "true") return null;
  try {
    const url = new URL(process.env.LIVE_VIEW_GATEWAY_ORIGIN || "");
    const secret = process.env.LIVE_VIEW_GATEWAY_SECRET || "";
    if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash || secret.length < 32) return null;
    return { origin: url.origin, secret };
  } catch { return null; }
}
export async function fetchLiveMedia(streamKey: string, file: string) {
  const config = liveGatewayConfig();
  if (!config || !/^[a-f0-9]{32}$/.test(streamKey) || !validMediaFile(file)) throw new Error("GATEWAY_NOT_READY");
  return fetch(`${config.origin}/${streamKey}/${file}`, {
    headers: { Authorization: `Bearer ${config.secret}` },
    cache: "no-store", redirect: "error", signal: AbortSignal.timeout(8_000),
  });
}
export async function readBoundedMedia(response: Response, maxBytes: number) {
  if (!response.body || Number(response.headers.get("content-length") || 0) > maxBytes) throw new Error("MEDIA_TOO_LARGE");
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length; if (size > maxBytes) throw new Error("MEDIA_TOO_LARGE");
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(() => undefined); }
  return Buffer.concat(chunks);
}
