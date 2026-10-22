import { createHash, randomBytes } from "node:crypto";

export const LIVE_VIEW_COOLDOWN_MS = 30_000;
export const LIVE_VIEW_MAX_HOURS = 24;
export const validLiveToken = (token: string) => /^[A-Za-z0-9_-]{43}$/.test(token);
export const liveTokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
export function newLiveToken() { const token = randomBytes(32).toString("base64url"); return { token, hash: liveTokenHash(token) }; }
export function canWatch(session: { endedAt: Date | null; expiresAt: Date; station: { enabled: boolean }; business: { deletedAt: Date | null } }, now = new Date()) {
  return !session.endedAt && session.expiresAt.getTime() > now.getTime() && session.station.enabled && !session.business.deletedAt;
}
export function validMediaFile(file: string) { return /^[A-Za-z0-9_-]{1,160}\.(m3u8|ts|mp4|m4s)$/.test(file); }
// Only single-directory, relative HLS assets are supported. Reject redirects,
// external keys, query strings, traversal, and unexpected URI-bearing tags.
export function rewriteLivePlaylist(playlist: string, prefix: string, grant: (file: string) => string = () => "") {
  if (playlist.length > 256_000 || !playlist.startsWith("#EXTM3U")) throw new Error("INVALID_PLAYLIST");
  const rewrite = (uri: string) => {
    if (!validMediaFile(uri)) throw new Error("INVALID_MEDIA_URI");
    return `${prefix}/${uri}${grant(uri)}`;
  };
  return playlist.split(/\r?\n/).map(line => {
    if (!line || line.startsWith("#")) {
      if (/URI\s*=/i.test(line.replace(/URI="[^"]*"/g, ""))) throw new Error("INVALID_MEDIA_URI");
      return line.replace(/URI="([^"]*)"/g, (_, uri: string) => `URI="${rewrite(uri)}"`);
    }
    return rewrite(line.trim());
  }).join("\n");
}
