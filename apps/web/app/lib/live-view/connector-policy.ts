import { createHmac, timingSafeEqual } from "node:crypto";
export function publisherPassword(secret: string, connectorId: string, streamKey: string, until: number) {
  const hash=createHmac("sha256",secret).update(JSON.stringify(["publish",connectorId,streamKey,until])).digest("hex");
  return `${until}.${hash}`;
}
export function verifyPublisherPassword(secret: string, connectorId: string, streamKey: string, password: string, now=Date.now()) {
  if (!/^\d{13}\.[a-f0-9]{64}$/.test(password)) return null;
  const until=Number(password.split(".")[0]); if(until<=now || until>now+300_000) return null;
  const expected=publisherPassword(secret,connectorId,streamKey,until);
  return timingSafeEqual(Buffer.from(expected),Buffer.from(password)) ? new Date(until) : null;
}
export function safeEqualSecret(a: string, b: string) { return a.length>=32 && a.length===b.length && timingSafeEqual(Buffer.from(a),Buffer.from(b)); }
