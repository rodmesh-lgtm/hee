import "server-only";
import { commercialAccess } from "../commercial-access";
import { db } from "../db";
import { canWatch, liveTokenHash, validLiveToken } from "./policy";
import { connectorOnline } from "./camera-profiles";
import { liveGatewayConfig } from "./gateway";
export const livePrivateHeaders = {
  "Cache-Control": "private, no-store, max-age=0", "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive", "X-Content-Type-Options": "nosniff",
};
export async function getWatchSession(token: string) {
  if (!validLiveToken(token) || !liveGatewayConfig()) return null;
  const session = await db.liveViewSession.findUnique({ where: { tokenHash: liveTokenHash(token) }, include: { station: { include: { connector: true } }, business: { select: { name: true, deletedAt: true } } } });
  if(session&&!(await commercialAccess(session.businessId)).liveView)return null;
  return session && (!session.station.connectorId || (session.station.connector && connectorOnline(session.station.connector))) && canWatch(session) ? session : null;
}
