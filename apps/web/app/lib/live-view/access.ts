import "server-only";
import { db } from "../db";
import { canWatch, liveTokenHash, validLiveToken } from "./policy";
import { liveGatewayConfig } from "./gateway";
export const livePrivateHeaders = {
  "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff",
};
export async function getWatchSession(token: string) {
  if (!validLiveToken(token) || !liveGatewayConfig()) return null;
  const session = await db.liveViewSession.findUnique({ where: { tokenHash: liveTokenHash(token) }, include: { station: true, business: { select: { name: true, deletedAt: true } } } });
  return session && canWatch(session) ? session : null;
}
