import { createHmac, timingSafeEqual } from "node:crypto";

function signature(secret: string, tokenHash: string, file: string, until: string) {
  return createHmac("sha256", secret).update(JSON.stringify([tokenHash, file, until])).digest("hex");
}
// Asset grants bind each filename to the customer lease. A viewer cannot guess
// old segment names or access another station's media through the proxy.
export function mediaGrant(secret: string, tokenHash: string, file: string, expiresAt: Date, now = Date.now()) {
  const until = String(Math.min(expiresAt.getTime(), now + 30_000));
  return `?until=${until}&grant=${signature(secret, tokenHash, file, until)}`;
}
export function validMediaGrant(secret: string, tokenHash: string, file: string, query: URLSearchParams, now = Date.now()) {
  const until = query.get("until") || "", grant = query.get("grant") || "";
  if (!/^\d{13}$/.test(until) || !/^[a-f0-9]{64}$/.test(grant) || Number(until) <= now || Number(until) > now + 30_000) return false;
  return timingSafeEqual(Buffer.from(grant, "hex"), Buffer.from(signature(secret, tokenHash, file, until), "hex"));
}
